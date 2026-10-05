import type { RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type DashboardSummary = {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  month: string;
};

export type CategoryStat = {
  categoryId: number;
  categoryName: string;
  type: "income" | "expense";
  total: string;
  transactionCount: number;
};

export type BudgetAlert = {
  budgetId: number;
  categoryName: string;
  amountLimit: string;
  amountUsed: string;
  percentUsed: number;
  status: "warning" | "exceeded";
};

export async function getMonthlySummary(userId: number, year: number, month: number): Promise<DashboardSummary> {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const [rows] = await pool.execute<(RowDataPacket & { type: string; total: string })[]>(
    `SELECT type, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY type`,
    [userId, monthStr],
  );

  let totalIncome = "0";
  let totalExpense = "0";
  for (const row of rows) {
    if (row.type === "income") totalIncome = row.total;
    else if (row.type === "expense") totalExpense = row.total;
  }
  const balance = (parseFloat(totalIncome) - parseFloat(totalExpense)).toFixed(2);
  return { totalIncome, totalExpense, balance, month: monthStr };
}

export async function getTopExpenseCategories(
  userId: number,
  year: number,
  month: number,
  limit = 5,
): Promise<CategoryStat[]> {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const [rows] = await pool.execute<(RowDataPacket & {
    category_id: number;
    category_name: string;
    type: "income" | "expense";
    total: string;
    transaction_count: number;
  })[]>(
    `SELECT t.category_id, c.name AS category_name, t.type,
            SUM(t.amount) AS total, COUNT(*) AS transaction_count
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.type = 'expense'
       AND DATE_FORMAT(t.transaction_date, '%Y-%m') = ?
     GROUP BY t.category_id, c.name, t.type
     ORDER BY total DESC
     LIMIT ?`,
    [userId, monthStr, limit],
  );
  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    type: r.type,
    total: r.total,
    transactionCount: r.transaction_count,
  }));
}

export async function getDailyTotals(
  userId: number,
  year: number,
  month: number,
): Promise<{ date: string; income: string; expense: string }[]> {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const [rows] = await pool.execute<(RowDataPacket & {
    date: string; type: string; total: string;
  })[]>(
    `SELECT transaction_date AS date, type, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY transaction_date, type
     ORDER BY transaction_date`,
    [userId, monthStr],
  );

  const map = new Map<string, { income: string; expense: string }>();
  for (const r of rows) {
    if (!map.has(r.date)) map.set(r.date, { income: "0", expense: "0" });
    const entry = map.get(r.date)!;
    if (r.type === "income") entry.income = r.total;
    else entry.expense = r.total;
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
}

export async function getDashboardBudgetAlerts(userId: number): Promise<BudgetAlert[]> {
  const today = new Date().toISOString().split("T")[0];
  const [rows] = await pool.execute<(RowDataPacket & {
    budget_id: number;
    category_name: string;
    amount_limit: string;
    amount_used: string;
    percent_used: number;
  })[]>(
    `SELECT v.budget_id, c.name AS category_name, v.amount_limit, v.amount_used, v.percent_used
     FROM v_budget_usage v
     JOIN categories c ON c.id = v.category_id
     WHERE v.user_id = ?
       AND v.period_start <= ?
       AND v.period_end >= ?
       AND v.percent_used >= 80
     ORDER BY v.percent_used DESC`,
    [userId, today, today],
  );
  return rows.map((r) => ({
    budgetId: r.budget_id,
    categoryName: r.category_name,
    amountLimit: r.amount_limit,
    amountUsed: r.amount_used,
    percentUsed: Number(r.percent_used),
    status: Number(r.percent_used) >= 100 ? "exceeded" : "warning",
  }));
}
