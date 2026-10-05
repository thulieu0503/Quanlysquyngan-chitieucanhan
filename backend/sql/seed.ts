/**
 * Seed script: sinh >= 2000 bản ghi mẫu cho finance_app
 * Chạy: npx ts-node --project tsconfig.json -e "require('./backend/sql/seed.ts')"
 * Hoặc dùng tsx: npx tsx backend/sql/seed.ts
 *
 * Yêu cầu: DB đã có schema (chạy schema.sql trước), các biến môi trường DB_* đã được set.
 */

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../frontend/.env.local") });

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3307),
  user: process.env.DB_USER ?? "finance_user",
  password: process.env.DB_PASSWORD ?? "finance_password",
  database: process.env.DB_NAME ?? "finance_app",
  waitForConnections: true,
  connectionLimit: 5,
  dateStrings: true,
});

// ─────────────────── Helpers ──────────────────────────────────
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split("T")[0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────── Seed Data ────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: "Lương", type: "income" },
  { name: "Thưởng", type: "income" },
  { name: "Đầu tư", type: "income" },
  { name: "Freelance", type: "income" },
  { name: "Ăn uống", type: "expense" },
  { name: "Di chuyển", type: "expense" },
  { name: "Mua sắm", type: "expense" },
  { name: "Hóa đơn", type: "expense" },
  { name: "Giải trí", type: "expense" },
  { name: "Y tế", type: "expense" },
  { name: "Giáo dục", type: "expense" },
  { name: "Tiết kiệm", type: "expense" },
] as const;

const USER_CATEGORIES = [
  { name: "Thuê nhà", type: "expense" },
  { name: "Pet", type: "expense" },
  { name: "Game", type: "expense" },
  { name: "Bán hàng online", type: "income" },
] as const;

const TRANSACTION_NOTES = [
  "Mua tạp hóa", "Cà phê sáng", "Xăng xe", "Điện thoại", "Netflix",
  "Khám bệnh", "Học phí", "Ăn tối nhà hàng", "Grab Food", "Siêu thị",
  "Tiền điện", "Tiền nước", "Internet", "Gym", "Sách",
  null, null, null, // một số không có note
];

const REMINDER_TITLES = [
  "Trả tiền thuê nhà", "Thanh toán hóa đơn điện", "Nhắc tiết kiệm tháng",
  "Trả góp mua xe", "Phí bảo hiểm", "Nộp học phí",
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log("🌱 Bắt đầu seed dữ liệu...\n");

    // ── 1. Default categories ──────────────────────────────
    console.log("📁 Tạo categories mặc định...");
    const defaultCatIds: Record<string, number> = {};
    for (const cat of DEFAULT_CATEGORIES) {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        "INSERT IGNORE INTO categories (user_id, name, type) VALUES (NULL, ?, ?)",
        [cat.name, cat.type],
      );
      if (result.insertId) {
        defaultCatIds[`${cat.name}:${cat.type}`] = result.insertId;
      } else {
        const [rows] = await conn.execute<mysql.RowDataPacket[]>(
          "SELECT id FROM categories WHERE user_id IS NULL AND name = ? AND type = ?",
          [cat.name, cat.type],
        );
        defaultCatIds[`${cat.name}:${cat.type}`] = rows[0].id;
      }
    }
    console.log(`   ✓ ${Object.keys(defaultCatIds).length} categories mặc định\n`);

    // ── 2. Users ─────────────────────────────────────────────
    console.log("👤 Tạo users...");
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const adminHash = await bcrypt.hash("Admin@123!", 10);

    // Admin user
    const [adminResult] = await conn.execute<mysql.ResultSetHeader>(
      "INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      ["Admin", "admin@vivang.app", adminHash],
    );
    let adminId: number;
    if (adminResult.insertId) {
      adminId = adminResult.insertId;
    } else {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        "SELECT id FROM users WHERE email = 'admin@vivang.app'",
      );
      adminId = rows[0].id;
    }

    // 10 regular users
    const userIds: number[] = [];
    for (let i = 1; i <= 10; i++) {
      const [r] = await conn.execute<mysql.ResultSetHeader>(
        "INSERT IGNORE INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        [`Người dùng ${i}`, `user${i}@vivang.app`, passwordHash],
      );
      if (r.insertId) {
        userIds.push(r.insertId);
      } else {
        const [rows] = await conn.execute<mysql.RowDataPacket[]>(
          `SELECT id FROM users WHERE email = 'user${i}@vivang.app'`,
        );
        userIds.push(rows[0].id);
      }
    }
    // Lock user10
    await conn.execute("UPDATE users SET status = 'locked' WHERE email = 'user10@vivang.app'");
    console.log(`   ✓ 1 admin + ${userIds.length} users (user10 bị khóa)\n`);

    // ── 3. User-specific categories ──────────────────────────
    console.log("📂 Tạo categories riêng cho users...");
    const userCatIdsMap: Record<number, number[]> = {};
    for (const userId of userIds) {
      userCatIdsMap[userId] = [];
      for (const cat of USER_CATEGORIES) {
        try {
          const [r] = await conn.execute<mysql.ResultSetHeader>(
            "INSERT IGNORE INTO categories (user_id, name, type) VALUES (?, ?, ?)",
            [userId, cat.name, cat.type],
          );
          let catId = r.insertId;
          if (!catId) {
            const [rows] = await conn.execute<mysql.RowDataPacket[]>(
              "SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?",
              [userId, cat.name, cat.type],
            );
            catId = rows[0]?.id;
          }
          if (catId) userCatIdsMap[userId].push(catId);
        } catch {
          // ignore duplicate
        }
      }
    }
    console.log(`   ✓ ${USER_CATEGORIES.length} categories/user x ${userIds.length} users\n`);

    // ── 4. Transactions ──────────────────────────────────────
    console.log("💰 Tạo transactions (>= 2000 bản ghi)...");
    const dateStart = new Date("2024-01-01");
    const dateEnd = new Date("2026-09-26");

    const incomeDefaultIds = Object.entries(defaultCatIds)
      .filter(([k]) => k.endsWith(":income"))
      .map(([, v]) => v);
    const expenseDefaultIds = Object.entries(defaultCatIds)
      .filter(([k]) => k.endsWith(":expense"))
      .map(([, v]) => v);

    let totalTx = 0;
    for (const userId of userIds) {
      const txPerUser = 220; // 10 users × 220 = 2200 giao dịch
      const rows: unknown[][] = [];

      for (let i = 0; i < txPerUser; i++) {
        const isIncome = Math.random() < 0.25; // 25% thu nhập, 75% chi tiêu
        const type = isIncome ? "income" : "expense";
        const amount = isIncome ? randFloat(1000000, 30000000) : randFloat(10000, 5000000);

        let categoryId: number;
        if (isIncome) {
          const userIncomeCats = userCatIdsMap[userId].filter((_, idx) =>
            USER_CATEGORIES[idx]?.type === "income",
          );
          const allIncome = [...incomeDefaultIds, ...userIncomeCats];
          categoryId = pick(allIncome);
        } else {
          const userExpenseCats = userCatIdsMap[userId];
          const allExpense = [...expenseDefaultIds, ...userExpenseCats];
          categoryId = pick(allExpense);
        }

        const txDate = randDate(dateStart, dateEnd);
        const note = pick(TRANSACTION_NOTES);

        rows.push([userId, categoryId, type, amount, txDate, note]);
      }

      // Bulk insert
      const placeholders = rows.map(() => "(?,?,?,?,?,?)").join(",");
      const values = rows.flat();
      await conn.execute(
        `INSERT INTO transactions (user_id, category_id, type, amount, transaction_date, note) VALUES ${placeholders}`,
        values,
      );
      totalTx += rows.length;
    }
    console.log(`   ✓ ${totalTx} transactions\n`);

    // ── 5. Budgets ───────────────────────────────────────────
    console.log("📊 Tạo budgets...");
    let totalBudgets = 0;
    const periods = [
      { start: "2026-09-01", end: "2026-09-30" },
      { start: "2026-08-01", end: "2026-08-31" },
      { start: "2026-07-01", end: "2026-07-31" },
    ];

    for (const userId of userIds) {
      for (const period of periods) {
        // Chọn ngẫu nhiên 3 expense categories để set budget
        const shuffled = [...expenseDefaultIds].sort(() => 0.5 - Math.random()).slice(0, 3);
        for (const catId of shuffled) {
          try {
            await conn.execute(
              `INSERT IGNORE INTO budgets (user_id, category_id, amount_limit, period_start, period_end)
               VALUES (?, ?, ?, ?, ?)`,
              [userId, catId, randFloat(500000, 10000000), period.start, period.end],
            );
            totalBudgets++;
          } catch {
            // ignore duplicate
          }
        }
      }
    }
    console.log(`   ✓ ${totalBudgets} budgets\n`);

    // ── 6. Reminders ─────────────────────────────────────────
    console.log("🔔 Tạo reminders...");
    let totalReminders = 0;
    const recurrences: ("monthly" | "weekly" | "daily" | "yearly")[] = ["monthly", "weekly", "monthly", "yearly"];
    const channels: ("email" | "in_app" | "both")[] = ["email", "in_app", "both"];

    for (const userId of userIds) {
      const count = randInt(2, 4);
      for (let i = 0; i < count; i++) {
        const title = pick(REMINDER_TITLES);
        const recurrence = pick(recurrences);
        const channel = pick(channels);
        const nextRunDate = randDate(new Date("2026-09-27"), new Date("2027-12-31"));
        await conn.execute(
          `INSERT INTO reminders (user_id, title, recurrence, next_run_date, channel, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [userId, title, recurrence, nextRunDate, channel],
        );
        totalReminders++;
      }
    }
    console.log(`   ✓ ${totalReminders} reminders\n`);

    // ── 7. Audit logs ─────────────────────────────────────────
    console.log("📋 Tạo audit logs...");
    let totalLogs = 0;
    const actions = [
      "transactions.create", "transactions.update", "transactions.delete",
      "categories.create", "budgets.create", "reminders.create",
      "users.change_password",
    ];

    for (const userId of userIds) {
      const count = randInt(15, 30);
      for (let i = 0; i < count; i++) {
        const action = pick(actions);
        await conn.execute(
          "INSERT INTO audit_logs (user_id, action, target_table, ip_address) VALUES (?, ?, ?, ?)",
          [userId, action, action.split(".")[0], "127.0.0.1"],
        );
        totalLogs++;
      }
    }
    // Admin logs
    for (let i = 0; i < 20; i++) {
      await conn.execute(
        "INSERT INTO audit_logs (user_id, action, target_table, ip_address) VALUES (?, ?, ?, ?)",
        [adminId, "users.lock_unlock", "users", "127.0.0.1"],
      );
      totalLogs++;
    }
    console.log(`   ✓ ${totalLogs} audit logs\n`);

    // ── Tổng kết ─────────────────────────────────────────────
    console.log("═══════════════════════════════════════════════");
    console.log("✅ Seed hoàn tất!");
    console.log(`   - Users: 1 admin + ${userIds.length} users`);
    console.log(`   - Transactions: ${totalTx}`);
    console.log(`   - Budgets: ${totalBudgets}`);
    console.log(`   - Reminders: ${totalReminders}`);
    console.log(`   - Audit logs: ${totalLogs}`);
    console.log("═══════════════════════════════════════════════");
    console.log("\n📧 Tài khoản test:");
    console.log("   Admin : admin@vivang.app / Admin@123!");
    console.log("   User  : user1@vivang.app → user9@vivang.app / Password123!");
    console.log("   Locked: user10@vivang.app (bị khóa)");

  } catch (err) {
    console.error("❌ Seed thất bại:", err);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
