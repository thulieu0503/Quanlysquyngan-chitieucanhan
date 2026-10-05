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
-- Bảng password_resets: token đặt lại mật khẩu (FR-02)
-- ---------------------------------------------------------------------
CREATE TABLE password_resets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token       VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP NULL DEFAULT NULL COMMENT 'Đánh dấu token đã dùng, tránh dùng lại',
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

-- =====================================================================
-- SEED DATA: Ứng dụng Quản lý Thu Chi Cá Nhân
-- Chạy SAU file schema. Có thể chạy lại nhiều lần (tự xóa dữ liệu cũ).
-- Dữ liệu mô phỏng giai đoạn 07/2026 – 09/2026.
--
-- Tài khoản đăng nhập (mật khẩu chung cho tất cả: password)
--   admin@example.com       -> admin
--   an.nguyen@example.com   -> user (nhân viên IT, có freelance)
--   binh.tran@example.com   -> user (kế toán, có con nhỏ, bán hàng online)
--   cuong.le@example.com    -> user (sinh viên)
--   dung.pham@example.com   -> user (ĐÃ BỊ KHÓA)
-- =====================================================================


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE reminders;
TRUNCATE TABLE budgets;
TRUNCATE TABLE transactions;
TRUNCATE TABLE categories;
TRUNCATE TABLE password_resets;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- USERS
-- password_hash = bcrypt("password")
-- ---------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, status, created_at) VALUES
(1, 'Quản trị viên',  'admin@example.com',     '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active', '2026-06-01 08:00:00'),
(2, 'Nguyễn Văn An',  'an.nguyen@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user',  'active', '2026-06-10 09:15:00'),
(3, 'Trần Thị Bình',  'binh.tran@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user',  'active', '2026-06-12 20:30:00'),
(4, 'Lê Minh Cường',  'cuong.le@example.com',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user',  'active', '2026-06-20 14:05:00'),
(5, 'Phạm Thu Dung',  'dung.pham@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user',  'locked', '2026-06-25 19:40:00');

-- ---------------------------------------------------------------------
-- PASSWORD_RESETS
-- token lưu dạng SHA-256 (không lưu token gốc gửi qua email)
-- ---------------------------------------------------------------------
INSERT INTO password_resets (id, user_id, token, expires_at, used_at, created_at) VALUES
-- Đã dùng thành công
(1, 3, '9f2c4e1a7b3d5f60a8c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5', '2026-08-10 10:30:00', '2026-08-10 10:12:00', '2026-08-10 10:00:00'),
-- Hết hạn, chưa dùng
(2, 4, '4b8d2f6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2c6e0b4d8f2a6c0e4b8d', '2026-09-01 20:30:00', NULL,                  '2026-09-01 20:00:00'),
-- Còn hiệu lực
(3, 2, 'c1e3a5b7d9f2c4e6a8b0d2f4c6e8a1b3d5f7c9e2a4b6d8f0c3e5a7b9d1f4c6e8', '2026-09-27 21:00:00', NULL,                  '2026-09-26 21:00:00');

-- ---------------------------------------------------------------------
-- CATEGORIES
-- 1–12 : mặc định hệ thống (user_id NULL, do Admin tạo)
-- 13–18: danh mục riêng của từng user (18 đã bị soft-delete)
-- ---------------------------------------------------------------------
INSERT INTO categories (id, user_id, name, type, deleted_at) VALUES
(1,  NULL, 'Lương',               'income',  NULL),
(2,  NULL, 'Thưởng',              'income',  NULL),
(3,  NULL, 'Đầu tư',              'income',  NULL),
(4,  NULL, 'Thu nhập khác',       'income',  NULL),
(5,  NULL, 'Ăn uống',             'expense', NULL),
(6,  NULL, 'Đi lại',              'expense', NULL),
(7,  NULL, 'Nhà ở',               'expense', NULL),
(8,  NULL, 'Mua sắm',             'expense', NULL),
(9,  NULL, 'Giải trí',            'expense', NULL),
(10, NULL, 'Sức khỏe',            'expense', NULL),
(11, NULL, 'Giáo dục',            'expense', NULL),
(12, NULL, 'Hóa đơn & Tiện ích',  'expense', NULL),
(13, 2,    'Freelance',           'income',  NULL),
(14, 2,    'Cà phê',              'expense', NULL),
(15, 3,    'Bán hàng online',     'income',  NULL),
(16, 3,    'Con cái',             'expense', NULL),
(17, 4,    'Thú cưng',            'expense', NULL),
(18, 4,    'Quà tặng',            'expense', '2026-09-05 16:20:00');

-- ---------------------------------------------------------------------
-- TRANSACTIONS
-- type luôn khớp với type của category tương ứng
-- ---------------------------------------------------------------------
INSERT INTO transactions (id, user_id, category_id, type, amount, transaction_date, note, deleted_at) VALUES
-- ===== User 2: Nguyễn Văn An =====
-- Tháng 7
(1,  2, 7,  'expense',  5000000.00, '2026-07-01', 'Tiền thuê căn hộ tháng 7',          NULL),
(2,  2, 5,  'expense',   150000.00, '2026-07-03', 'Ăn trưa với đồng nghiệp',            NULL),
(3,  2, 1,  'income',  25000000.00, '2026-07-05', 'Lương tháng 6',                      NULL),
(4,  2, 5,  'expense',   320000.00, '2026-07-08', 'Đi chợ cuối tuần',                   NULL),
(5,  2, 6,  'expense',   200000.00, '2026-07-10', 'Đổ xăng',                            NULL),
(6,  2, 14, 'expense',    55000.00, '2026-07-12', 'Cà phê sáng',                        NULL),
(7,  2, 12, 'expense',   850000.00, '2026-07-15', 'Điện, nước, internet tháng 7',       NULL),
(8,  2, 8,  'expense',  1200000.00, '2026-07-18', 'Mua giày chạy bộ',                   NULL),
(9,  2, 13, 'income',   4000000.00, '2026-07-20', 'Dự án landing page',                 NULL),
(10, 2, 9,  'expense',   350000.00, '2026-07-22', 'Xem phim cuối tuần',                 NULL),
(11, 2, 5,  'expense',   480000.00, '2026-07-26', 'Ăn lẩu cùng bạn bè',                 NULL),
-- Tháng 8
(12, 2, 7,  'expense',  5000000.00, '2026-08-01', 'Tiền thuê căn hộ tháng 8',           NULL),
(13, 2, 1,  'income',  25000000.00, '2026-08-05', 'Lương tháng 7',                      NULL),
(14, 2, 5,  'expense',   210000.00, '2026-08-06', 'Ăn trưa',                            NULL),
(15, 2, 14, 'expense',    60000.00, '2026-08-09', 'Cà phê làm việc',                    NULL),
(16, 2, 6,  'expense',   250000.00, '2026-08-11', 'Đổ xăng + gửi xe',                   NULL),
(17, 2, 10, 'expense',   650000.00, '2026-08-14', 'Khám và lấy cao răng',               NULL),
(18, 2, 12, 'expense',   920000.00, '2026-08-15', 'Điện, nước, internet tháng 8',       NULL),
(19, 2, 5,  'expense',  1150000.00, '2026-08-19', 'Liên hoan phòng',                    NULL),
(20, 2, 8,  'expense',  2500000.00, '2026-08-25', 'Tai nghe bluetooth',                 NULL),
(21, 2, 2,  'income',   3000000.00, '2026-08-28', 'Thưởng hoàn thành dự án',            NULL),
-- Tháng 9
(22, 2, 7,  'expense',  5000000.00, '2026-09-01', 'Tiền thuê căn hộ tháng 9',           NULL),
(23, 2, 1,  'income',  25000000.00, '2026-09-05', 'Lương tháng 8',                      NULL),
(24, 2, 5,  'expense',   180000.00, '2026-09-06', 'Ăn sáng + trưa',                     NULL),
(25, 2, 14, 'expense',    45000.00, '2026-09-08', 'Cà phê sáng',                        NULL),
(26, 2, 6,  'expense',   220000.00, '2026-09-10', 'Đổ xăng',                            NULL),
(27, 2, 5,  'expense',  2100000.00, '2026-09-12', 'Tổ chức sinh nhật',                  NULL),
(28, 2, 12, 'expense',   880000.00, '2026-09-15', 'Điện, nước, internet tháng 9',       NULL),
(29, 2, 9,  'expense',   400000.00, '2026-09-18', 'Vé ca nhạc',                         NULL),
(30, 2, 5,  'expense',  1300000.00, '2026-09-20', 'Đi ăn cùng gia đình',                NULL),
(31, 2, 8,  'expense',   750000.00, '2026-09-22', 'Nhập nhầm, đã xóa',                  '2026-09-22 21:15:00'),
(32, 2, 13, 'income',   5500000.00, '2026-09-24', 'Dự án app đặt lịch',                 NULL),

-- ===== User 3: Trần Thị Bình =====
-- Tháng 7
(33, 3, 7,  'expense',  3500000.00, '2026-07-02', 'Tiền nhà tháng 7',                   NULL),
(34, 3, 5,  'expense',   250000.00, '2026-07-04', 'Đi chợ',                             NULL),
(35, 3, 1,  'income',  18000000.00, '2026-07-05', 'Lương tháng 6',                      NULL),
(36, 3, 16, 'expense',  1500000.00, '2026-07-07', 'Sữa, bỉm cho bé',                    NULL),
(37, 3, 15, 'income',   2800000.00, '2026-07-11', 'Doanh thu bán hàng online',          NULL),
(38, 3, 12, 'expense',   700000.00, '2026-07-14', 'Điện, nước tháng 7',                 NULL),
(39, 3, 5,  'expense',   540000.00, '2026-07-16', 'Đi siêu thị',                        NULL),
(40, 3, 10, 'expense',   300000.00, '2026-07-21', 'Mua thuốc cảm cho bé',               NULL),
(41, 3, 8,  'expense',   900000.00, '2026-07-28', 'Quần áo',                            NULL),
-- Tháng 8
(42, 3, 7,  'expense',  3500000.00, '2026-08-02', 'Tiền nhà tháng 8',                   NULL),
(43, 3, 1,  'income',  18000000.00, '2026-08-05', 'Lương tháng 7',                      NULL),
(44, 3, 16, 'expense',  1600000.00, '2026-08-07', 'Sữa, bỉm cho bé',                    NULL),
(45, 3, 5,  'expense',   620000.00, '2026-08-10', 'Đi siêu thị',                        NULL),
(46, 3, 15, 'income',   3200000.00, '2026-08-13', 'Doanh thu bán hàng online',          NULL),
(47, 3, 12, 'expense',   750000.00, '2026-08-15', 'Điện, nước tháng 8',                 NULL),
(48, 3, 11, 'expense',  2000000.00, '2026-08-20', 'Học phí tiếng Anh',                  NULL),
(49, 3, 5,  'expense',   430000.00, '2026-08-27', 'Đi chợ',                             NULL),
-- Tháng 9
(50, 3, 7,  'expense',  3500000.00, '2026-09-02', 'Tiền nhà tháng 9',                   NULL),
(51, 3, 1,  'income',  18000000.00, '2026-09-05', 'Lương tháng 8',                      NULL),
(52, 3, 16, 'expense',  1800000.00, '2026-09-06', 'Sữa, bỉm cho bé',                    NULL),
(53, 3, 11, 'expense',  4500000.00, '2026-09-09', 'Học phí mầm non năm học mới',        NULL),
(54, 3, 15, 'income',   2600000.00, '2026-09-12', 'Doanh thu bán hàng online',          NULL),
(55, 3, 12, 'expense',   780000.00, '2026-09-15', 'Điện, nước tháng 9',                 NULL),
(56, 3, 5,  'expense',   390000.00, '2026-09-17', 'Đi chợ',                             NULL),
(57, 3, 16, 'expense',   650000.00, '2026-09-21', 'Đồ chơi, sách cho bé',               NULL),

-- ===== User 4: Lê Minh Cường =====
-- Tháng 7
(58, 4, 4,  'income',   5000000.00, '2026-07-01', 'Bố mẹ gửi tiền tháng 7',             NULL),
(59, 4, 7,  'expense',  1800000.00, '2026-07-03', 'Tiền phòng trọ',                     NULL),
(60, 4, 5,  'expense',    95000.00, '2026-07-06', 'Cơm bình dân',                       NULL),
(61, 4, 17, 'expense',   250000.00, '2026-07-09', 'Thức ăn cho mèo',                    NULL),
(62, 4, 1,  'income',   3000000.00, '2026-07-15', 'Lương làm thêm',                     NULL),
(63, 4, 11, 'expense',   450000.00, '2026-07-17', 'Mua giáo trình',                     NULL),
(64, 4, 9,  'expense',   150000.00, '2026-07-23', 'Trà sữa với bạn',                    NULL),
-- Tháng 8
(65, 4, 4,  'income',   5000000.00, '2026-08-01', 'Bố mẹ gửi tiền tháng 8',             NULL),
(66, 4, 7,  'expense',  1800000.00, '2026-08-03', 'Tiền phòng trọ',                     NULL),
(67, 4, 5,  'expense',  1200000.00, '2026-08-08', 'Tiền ăn nửa đầu tháng',              NULL),
(68, 4, 6,  'expense',   120000.00, '2026-08-12', 'Vé xe buýt tháng',                   NULL),
(69, 4, 1,  'income',   3200000.00, '2026-08-15', 'Lương làm thêm',                     NULL),
(70, 4, 17, 'expense',   380000.00, '2026-08-18', 'Tiêm phòng cho mèo',                 NULL),
(71, 4, 18, 'expense',   300000.00, '2026-08-24', 'Quà sinh nhật bạn',                  NULL),
-- Tháng 9
(72, 4, 4,  'income',   5000000.00, '2026-09-01', 'Bố mẹ gửi tiền tháng 9',             NULL),
(73, 4, 7,  'expense',  1800000.00, '2026-09-03', 'Tiền phòng trọ',                     NULL),
(74, 4, 5,  'expense',  1350000.00, '2026-09-07', 'Tiền ăn nửa đầu tháng',              NULL),
(75, 4, 4,  'income',   6500000.00, '2026-09-09', 'Bố mẹ gửi tiền học phí',             NULL),
(76, 4, 11, 'expense',  6500000.00, '2026-09-10', 'Học phí học kỳ 1',                   NULL),
(77, 4, 1,  'income',   3000000.00, '2026-09-15', 'Lương làm thêm',                     NULL),
(78, 4, 17, 'expense',   200000.00, '2026-09-19', 'Cát vệ sinh cho mèo',                NULL),
(79, 4, 5,  'expense',   870000.00, '2026-09-23', 'Tiền ăn',                            NULL),

-- ===== User 5: Phạm Thu Dung (đã bị khóa) =====
(80, 5, 1,  'income',  12000000.00, '2026-07-05', 'Lương tháng 6',                      NULL),
(81, 5, 5,  'expense',   300000.00, '2026-07-08', 'Ăn uống',                            NULL);

-- ---------------------------------------------------------------------
-- BUDGETS
-- Kết quả kỳ vọng khi xem v_budget_usage:
--   #1  An    Ăn uống  T8     1.360.000 / 3.000.000  ->  45.33%
--   #2  An    Ăn uống  T9     3.580.000 / 3.000.000  -> 119.33%  (VƯỢT)
--   #3  An    Mua sắm  T9             0 / 2.000.000  ->   0.00%  (giao dịch #31 đã xóa mềm)
--   #4  An    Giải trí T9       400.000 / 1.000.000  ->  40.00%
--   #5  Bình  Con cái  T9     2.450.000 / 2.500.000  ->  98.00%  (SẮP VƯỢT)
--   #6  Bình  Giáo dục T9     4.500.000 / 5.000.000  ->  90.00%  (SẮP VƯỢT)
--   #7  Bình  Ăn uống  Quý 3  2.230.000 / 3.000.000  ->  74.33%
--   #8  Cường Ăn uống  T9     2.220.000 / 2.000.000  -> 111.00%  (VƯỢT)
--   #9  Cường Thú cưng T9       200.000 /   500.000  ->  40.00%
-- ---------------------------------------------------------------------
INSERT INTO budgets (id, user_id, category_id, amount_limit, period_start, period_end, created_at) VALUES
(1, 2, 5,  3000000.00, '2026-08-01', '2026-08-31', '2026-08-01 08:00:00'),
(2, 2, 5,  3000000.00, '2026-09-01', '2026-09-30', '2026-09-01 08:00:00'),
(3, 2, 8,  2000000.00, '2026-09-01', '2026-09-30', '2026-09-01 08:02:00'),
(4, 2, 9,  1000000.00, '2026-09-01', '2026-09-30', '2026-09-01 08:03:00'),
(5, 3, 16, 2500000.00, '2026-09-01', '2026-09-30', '2026-09-01 21:10:00'),
(6, 3, 11, 5000000.00, '2026-09-01', '2026-09-30', '2026-09-01 21:12:00'),
(7, 3, 5,  3000000.00, '2026-07-01', '2026-09-30', '2026-07-01 20:00:00'),
(8, 4, 5,  2000000.00, '2026-09-01', '2026-09-30', '2026-09-01 10:30:00'),
(9, 4, 17,  500000.00, '2026-09-01', '2026-09-30', '2026-09-01 10:32:00');

-- ---------------------------------------------------------------------
-- REMINDERS
-- ---------------------------------------------------------------------
INSERT INTO reminders (id, user_id, category_id, title, amount, recurrence, next_run_date, channel, is_active) VALUES
(1, 2, 7,    'Đóng tiền thuê căn hộ',             5000000.00, 'monthly', '2026-10-01', 'both',   1),
(2, 2, 12,   'Thanh toán điện, nước, internet',   NULL,       'monthly', '2026-10-15', 'in_app', 1),
(3, 2, 14,   'Ghi lại chi tiêu cà phê trong ngày', NULL,      'daily',   '2026-09-27', 'in_app', 1),
(4, 3, 16,   'Mua sữa, bỉm cho bé',               1500000.00, 'monthly', '2026-10-06', 'email',  1),
(5, 3, 11,   'Đóng học phí tiếng Anh',            2000000.00, 'monthly', '2026-10-20', 'both',   1),
(6, 3, NULL, 'Gia hạn bảo hiểm xe máy',             66000.00, 'yearly',  '2027-03-10', 'email',  1),
(7, 4, 7,    'Đóng tiền phòng trọ',               1800000.00, 'monthly', '2026-10-03', 'in_app', 1),
(8, 4, 17,   'Mua thức ăn cho mèo',                200000.00, 'weekly',  '2026-09-28', 'in_app', 0),
(9, 5, 7,    'Đóng tiền nhà',                     4000000.00, 'monthly', '2026-08-01', 'email',  0);

-- ---------------------------------------------------------------------
-- AUDIT_LOGS
-- ---------------------------------------------------------------------
INSERT INTO audit_logs (user_id, action, target_table, target_id, detail, ip_address, created_at) VALUES
(1, 'categories.seed_defaults', 'categories', NULL, '{"count": 12, "ids": [1,2,3,4,5,6,7,8,9,10,11,12]}', '192.168.1.10', '2026-06-01 08:10:00'),
(2, 'auth.register',            'users',        2,  '{"email": "an.nguyen@example.com"}',                  '203.0.113.21', '2026-06-10 09:15:00'),
(3, 'auth.register',            'users',        3,  '{"email": "binh.tran@example.com"}',                  '203.0.113.45', '2026-06-12 20:30:00'),
(4, 'auth.register',            'users',        4,  '{"email": "cuong.le@example.com"}',                   '203.0.113.78', '2026-06-20 14:05:00'),
(5, 'auth.register',            'users',        5,  '{"email": "dung.pham@example.com"}',                  '203.0.113.90', '2026-06-25 19:40:00'),
(4, 'categories.create',        'categories',  17,  '{"name": "Thú cưng", "type": "expense"}',             '203.0.113.78', '2026-07-01 09:00:00'),
(4, 'categories.create',        'categories',  18,  '{"name": "Quà tặng", "type": "expense"}',             '203.0.113.78', '2026-07-01 09:01:00'),
(3, 'budgets.create',           'budgets',      7,  '{"category_id": 5, "amount_limit": 3000000, "period": "2026-07-01..2026-09-30"}', '203.0.113.45', '2026-07-01 20:00:00'),
(3, 'auth.password_reset',      'users',        3,  '{"reset_id": 1}',                                     '203.0.113.46', '2026-08-10 10:12:00'),
(1, 'users.lock_unlock',        'users',        5,  '{"old_status": "active", "new_status": "locked", "reason": "Nghi ngờ tài khoản bị chiếm quyền"}', '192.168.1.10', '2026-08-15 09:30:00'),
(5, 'auth.login_failed',        'users',        5,  '{"reason": "account_locked"}',                        '198.51.100.7', '2026-08-16 07:45:00'),
(2, 'budgets.create',           'budgets',      2,  '{"category_id": 5, "amount_limit": 3000000, "period": "2026-09"}', '203.0.113.21', '2026-09-01 08:00:00'),
(3, 'budgets.create',           'budgets',      5,  '{"category_id": 16, "amount_limit": 2500000, "period": "2026-09"}', '203.0.113.45', '2026-09-01 21:10:00'),
(4, 'categories.delete',        'categories',  18,  '{"soft_delete": true}',                               '203.0.113.78', '2026-09-05 16:20:00'),
(2, 'transactions.create',      'transactions',27,  '{"type": "expense", "amount": 1800000, "category_id": 5}', '203.0.113.21', '2026-09-12 19:30:00'),
(2, 'transactions.update',      'transactions',27,  '{"old": {"amount": 1800000}, "new": {"amount": 2100000}}', '203.0.113.21', '2026-09-12 22:00:00'),
(2, 'budgets.warning',          'budgets',      2,  '{"percent_used": 119.33, "threshold": 100}',          NULL,           '2026-09-20 20:05:00'),
(2, 'transactions.create',      'transactions',31,  '{"type": "expense", "amount": 750000, "category_id": 8}', '203.0.113.21', '2026-09-22 21:10:00'),
(2, 'transactions.delete',      'transactions',31,  '{"soft_delete": true, "amount": 750000}',             '203.0.113.21', '2026-09-22 21:15:00'),
(4, 'budgets.warning',          'budgets',      8,  '{"percent_used": 111.00, "threshold": 100}',          NULL,           '2026-09-23 12:40:00'),
(2, 'transactions.create',      'transactions',32,  '{"type": "income", "amount": 5500000, "category_id": 13}', '203.0.113.21', '2026-09-24 18:30:00'),
(1, 'auth.login',               'users',        1,  NULL,                                                  '192.168.1.10', '2026-09-26 08:00:00'),
(2, 'auth.login',               'users',        2,  NULL,                                                  '203.0.113.21', '2026-09-26 20:05:00');

-- =====================================================================
-- KIỂM TRA NHANH SAU KHI NẠP
-- =====================================================================

-- 1) Mức sử dụng ngân sách (FR-10)
SELECT u.name, c.name AS category, v.period_start, v.period_end,
       v.amount_limit, v.amount_used, v.percent_used,
       CASE WHEN v.percent_used >= 100 THEN 'VƯỢT'
            WHEN v.percent_used >= 80  THEN 'SẮP VƯỢT'
            ELSE 'OK' END AS trang_thai
FROM v_budget_usage v
JOIN users u      ON u.id = v.user_id
JOIN categories c ON c.id = v.category_id
ORDER BY v.budget_id;

-- 2) Tổng thu / chi / số dư theo tháng của từng user
SELECT u.name,
       DATE_FORMAT(t.transaction_date, '%Y-%m') AS thang,
       SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS tong_thu,
       SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS tong_chi,
       SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE -t.amount END) AS so_du
FROM transactions t
JOIN users u ON u.id = t.user_id
WHERE t.deleted_at IS NULL
GROUP BY u.id, u.name, thang
ORDER BY u.id, thang;
