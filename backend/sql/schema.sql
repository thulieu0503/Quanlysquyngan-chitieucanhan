-- =====================================================================
-- SCHEMA: Ứng dụng Quản lý Thu Chi Cá Nhân
-- Database: MySQL 8.0+ / MariaDB 10.6+
-- Ghi chú: viết bằng SQL thuần (không dùng ORM), theo đúng yêu cầu đề bài
-- =====================================================================

CREATE DATABASE IF NOT EXISTS finance_app
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE finance_app;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS reminders;
DROP VIEW  IF EXISTS v_budget_usage;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Bảng users: tài khoản, vai trò (RBAC), trạng thái khóa/mở
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)        NOT NULL,
  email           VARCHAR(150)        NOT NULL,
  password_hash   VARCHAR(255)        NOT NULL COMMENT 'Hash bcrypt, không lưu plaintext',
  role            ENUM('user','admin') NOT NULL DEFAULT 'user',
  status          ENUM('active','locked') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tài khoản người dùng và quản trị viên';

-- ---------------------------------------------------------------------
-- Bảng password_resets: mã xác nhận (OTP 6 số) đặt lại mật khẩu (FR-02)
-- token   = HMAC-SHA256 của mã (không lưu mã thô)
-- attempts = số lần nhập sai; quá giới hạn thì mã bị vô hiệu hóa
-- ---------------------------------------------------------------------
CREATE TABLE password_resets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token       VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP NULL DEFAULT NULL COMMENT 'Đánh dấu token đã dùng, tránh dùng lại',
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số lần nhập sai mã',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_password_resets_token UNIQUE (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Token đặt lại mật khẩu, có hạn sử dụng';

CREATE INDEX idx_password_resets_user ON password_resets(user_id);

-- ---------------------------------------------------------------------
-- Bảng categories: danh mục thu/chi.
-- user_id NULL  => category mặc định của hệ thống (Admin tạo)
-- user_id NOT NULL => category riêng của user đó
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL COMMENT 'NULL = category mặc định do Admin tạo',
  name        VARCHAR(100) NOT NULL,
  type        ENUM('income','expense') NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL COMMENT 'Soft-delete',
  CONSTRAINT fk_categories_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_categories_user_name_type UNIQUE (user_id, name, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục thu/chi, cá nhân hoặc mặc định hệ thống';

CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_categories_deleted ON categories(deleted_at);

-- ---------------------------------------------------------------------
-- Bảng transactions: giao dịch thu/chi
-- ---------------------------------------------------------------------
CREATE TABLE transactions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           INT UNSIGNED NOT NULL,
  category_id       INT UNSIGNED NOT NULL,
  type              ENUM('income','expense') NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,
  transaction_date  DATE NOT NULL,
  note              VARCHAR(255) NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP NULL DEFAULT NULL COMMENT 'Soft-delete',
  CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_transactions_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_transactions_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Giao dịch thu nhập / chi tiêu của user';

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_transactions_category  ON transactions(category_id);
CREATE INDEX idx_transactions_deleted   ON transactions(deleted_at);

-- ---------------------------------------------------------------------
-- Bảng budgets: ngân sách theo category & khoảng thời gian
-- ---------------------------------------------------------------------
CREATE TABLE budgets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  category_id   INT UNSIGNED NOT NULL,
  amount_limit  DECIMAL(15,2) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_budgets_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_budgets_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_budgets_amount CHECK (amount_limit > 0),
  CONSTRAINT chk_budgets_period CHECK (period_end >= period_start),
  CONSTRAINT uq_budgets_scope UNIQUE (user_id, category_id, period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ngân sách theo category và khoảng thời gian';

CREATE INDEX idx_budgets_user_period ON budgets(user_id, period_start, period_end);

-- ---------------------------------------------------------------------
-- Bảng reminders: nhắc nhở chi tiêu định kỳ
-- ---------------------------------------------------------------------
CREATE TABLE reminders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  category_id     INT UNSIGNED NULL,
  title           VARCHAR(150) NOT NULL,
  amount          DECIMAL(15,2) NULL,
  recurrence      ENUM('daily','weekly','monthly','yearly') NOT NULL DEFAULT 'monthly',
  next_run_date   DATE NOT NULL,
  channel         ENUM('email','in_app','both') NOT NULL DEFAULT 'in_app',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminders_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reminders_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhắc nhở chi tiêu định kỳ';

CREATE INDEX idx_reminders_next_run ON reminders(next_run_date, is_active);

-- ---------------------------------------------------------------------
-- Bảng audit_logs: nhật ký hành động (ai, làm gì, lúc nào)
-- user_id SET NULL khi user bị xóa hẳn (không dùng trong app, nhưng an toàn)
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NULL,
  action        VARCHAR(100) NOT NULL COMMENT 'VD: transactions.create, users.lock_unlock',
  target_table  VARCHAR(50)  NULL,
  target_id     INT UNSIGNED NULL,
  detail        JSON NULL COMMENT 'Giá trị cũ/mới hoặc thông tin bổ sung',
  ip_address    VARCHAR(45)  NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhật ký hành động phục vụ audit';

CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_target    ON audit_logs(target_table, target_id);

-- =====================================================================
-- VIEW: v_budget_usage
-- Tính số tiền đã chi và % ngân sách đã dùng cho từng budget bằng SQL
-- thuần (JOIN + GROUP BY + aggregate) — phục vụ FR-10 (cảnh báo ngân sách)
-- =====================================================================
CREATE VIEW v_budget_usage AS
SELECT
  b.id             AS budget_id,
  b.user_id,
  b.category_id,
  b.amount_limit,
  b.period_start,
  b.period_end,
  COALESCE(SUM(t.amount), 0) AS amount_used,
  ROUND(COALESCE(SUM(t.amount), 0) / b.amount_limit * 100, 2) AS percent_used
FROM budgets b
LEFT JOIN transactions t
  ON t.category_id = b.category_id
 AND t.user_id      = b.user_id
 AND t.type         = 'expense'
 AND t.deleted_at   IS NULL
 AND t.transaction_date BETWEEN b.period_start AND b.period_end
GROUP BY b.id, b.user_id, b.category_id, b.amount_limit, b.period_start, b.period_end;
