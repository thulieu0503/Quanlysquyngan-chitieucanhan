/**
 * ============================================================================
 * TẦNG TRUY XUẤT DỮ LIỆU NGÂN SÁCH (Budgets Repository)
 * ============================================================================
 * File này quản lý việc truy vấn và cập nhật ngân sách chi tiêu của người dùng:
 * - Tính toán số tiền đã chi thực tế qua database View `v_budget_usage`.
 * - Cảnh báo khi mức chi tiêu đạt >= 80% (warning) hoặc >= 100% (exceeded).
 */

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type BudgetRecord = {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  amountLimit: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
};

/** Dữ liệu ngân sách kèm mức độ sử dụng và trạng thái cảnh báo */
export type BudgetUsageRecord = BudgetRecord & {
  amountUsed: string;
  percentUsed: number;
  status: "ok" | "warning" | "exceeded";
};

type BudgetRow = RowDataPacket & {
  id: number;
  user_id: number;
  category_id: number;
  category_name: string;
  amount_limit: string;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
};

type BudgetUsageRow = BudgetRow & {
  amount_used: string;
  percent_used: number;
};

function toRecord(row: BudgetRow): BudgetRecord {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    amountLimit: row.amount_limit,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Tính toán trạng thái ngân sách dựa trên % đã tiêu:
 * - >= 100%: "exceeded" (Vượt hạn mức)
 * - >= 80%: "warning" (Cảnh báo sắp hết tiền)
 * - < 80%: "ok" (An toàn)
 */
function toUsageRecord(row: BudgetUsageRow): BudgetUsageRecord {
  const pct = Number(row.percent_used ?? 0);
  return {
    ...toRecord(row),
    amountUsed: row.amount_used ?? "0",
    percentUsed: pct,
    status: pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "ok",
  };
}

/**
 * Lấy danh sách ngân sách kèm mức độ sử dụng thực tế của người dùng
 */
export async function listBudgetsWithUsage(userId: number): Promise<BudgetUsageRecord[]> {
  const [rows] = await pool.execute<BudgetUsageRow[]>(
    `SELECT b.id, b.user_id, b.category_id, c.name AS category_name,
            b.amount_limit, b.period_start, b.period_end, b.created_at, b.updated_at,
            COALESCE(v.amount_used, 0) AS amount_used,
            COALESCE(v.percent_used, 0) AS percent_used
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN v_budget_usage v ON v.budget_id = b.id
     WHERE b.user_id = ?
     ORDER BY b.period_start DESC, c.name`,
    [userId],
  );
  return rows.map(toUsageRecord);
}

/**
 * Tìm ngân sách theo ID của người dùng
 */
export async function findBudgetById(id: number, userId: number): Promise<BudgetUsageRecord | null> {
  const [rows] = await pool.execute<BudgetUsageRow[]>(
    `SELECT b.id, b.user_id, b.category_id, c.name AS category_name,
            b.amount_limit, b.period_start, b.period_end, b.created_at, b.updated_at,
            COALESCE(v.amount_used, 0) AS amount_used,
            COALESCE(v.percent_used, 0) AS percent_used
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN v_budget_usage v ON v.budget_id = b.id
     WHERE b.id = ? AND b.user_id = ? LIMIT 1`,
    [id, userId],
  );
  return rows[0] ? toUsageRecord(rows[0]) : null;
}

/**
 * Tạo mới một thiết lập ngân sách
 */
export async function createBudget(input: {
  userId: number;
  categoryId: number;
  amountLimit: number;
  periodStart: string;
  periodEnd: string;
}): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO budgets (user_id, category_id, amount_limit, period_start, period_end)
     VALUES (?, ?, ?, ?, ?)`,
    [input.userId, input.categoryId, input.amountLimit, input.periodStart, input.periodEnd],
  );
  return result.insertId;
}

/**
 * Cập nhật hạn mức hoặc thời gian ngân sách
 */
export async function updateBudget(
  id: number,
  userId: number,
  input: { amountLimit: number; periodStart: string; periodEnd: string },
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE budgets SET amount_limit = ?, period_start = ?, period_end = ? WHERE id = ? AND user_id = ?",
    [input.amountLimit, input.periodStart, input.periodEnd, id, userId],
  );
  return result.affectedRows > 0;
}

/**
 * Xóa một ngân sách
 */
export async function deleteBudget(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM budgets WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return result.affectedRows > 0;
}

/**
 * Lấy các ngân sách đang trong kỳ và vượt ngưỡng cảnh báo (>= 80%) để hiển thị thông báo
 */
export async function getActiveBudgetAlerts(userId: number): Promise<BudgetUsageRecord[]> {
  const today = new Date().toISOString().split("T")[0];
  const [rows] = await pool.execute<BudgetUsageRow[]>(
    `SELECT b.id, b.user_id, b.category_id, c.name AS category_name,
            b.amount_limit, b.period_start, b.period_end, b.created_at, b.updated_at,
            COALESCE(v.amount_used, 0) AS amount_used,
            COALESCE(v.percent_used, 0) AS percent_used
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN v_budget_usage v ON v.budget_id = b.id
     WHERE b.user_id = ?
       AND b.period_start <= ?
       AND b.period_end >= ?
       AND COALESCE(v.percent_used, 0) >= 80
     ORDER BY v.percent_used DESC`,
    [userId, today, today],
  );
  return rows.map(toUsageRecord);
}
