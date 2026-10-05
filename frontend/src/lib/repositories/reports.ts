import type { RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type MonthlyReport = {
  year: number;
  month: number;
  totalIncome: string;
  totalExpense: string;
  balance: string;
  byCategory: {
    categoryId: number;
    categoryName: string;
    type: "income" | "expense";
    total: string;
    transactionCount: number;
  }[];
  byDay: {
    date: string;
    income: string;
    expense: string;
  }[];
};

export type ExportTransaction = {
  id: number;
  date: string;
  type: string;
  categoryName: string;
  amount: string;
  note: string | null;
};

export async function getMonthlyReport(userId: number, year: number, month: number): Promise<MonthlyReport> {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const [summaryRows] = await pool.execute<(RowDataPacket & { type: string; total: string })[]>(
    `SELECT type, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY type`,
    [userId, monthStr],
  );
  let totalIncome = "0";
  let totalExpense = "0";
  for (const r of summaryRows) {
    if (r.type === "income") totalIncome = r.total;
    else totalExpense = r.total;
  }
  const balance = (parseFloat(totalIncome) - parseFloat(totalExpense)).toFixed(2);

  const [catRows] = await pool.execute<(RowDataPacket & {
    category_id: number; category_name: string; type: string; total: string; count: number;
  })[]>(
    `SELECT t.category_id, c.name AS category_name, t.type,
            SUM(t.amount) AS total, COUNT(*) AS count
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.deleted_at IS NULL
       AND DATE_FORMAT(t.transaction_date, '%Y-%m') = ?
     GROUP BY t.category_id, c.name, t.type
     ORDER BY t.type, total DESC`,
    [userId, monthStr],
  );

  const [dayRows] = await pool.execute<(RowDataPacket & { date: string; type: string; total: string })[]>(
    `SELECT transaction_date AS date, type, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL
       AND DATE_FORMAT(transaction_date, '%Y-%m') = ?
     GROUP BY transaction_date, type
     ORDER BY transaction_date`,
    [userId, monthStr],
  );

  const dayMap = new Map<string, { income: string; expense: string }>();
  for (const r of dayRows) {
    if (!dayMap.has(r.date)) dayMap.set(r.date, { income: "0", expense: "0" });
    const entry = dayMap.get(r.date)!;
    if (r.type === "income") entry.income = r.total;
    else entry.expense = r.total;
  }

  return {
    year,
    month,
    totalIncome,
    totalExpense,
    balance,
    byCategory: catRows.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      type: r.type as "income" | "expense",
      total: r.total,
      transactionCount: r.count,
    })),
    byDay: Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })),
  };
}

export async function getTransactionsForExport(
  userId: number,
  year: number,
  month: number,
): Promise<ExportTransaction[]> {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const [rows] = await pool.execute<(RowDataPacket & {
    id: number; transaction_date: string; type: string;
    category_name: string; amount: string; note: string | null;
  })[]>(
    `SELECT t.id, t.transaction_date, t.type, c.name AS category_name, t.amount, t.note
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.deleted_at IS NULL
       AND DATE_FORMAT(t.transaction_date, '%Y-%m') = ?
     ORDER BY t.transaction_date, t.type`,
    [userId, monthStr],
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.transaction_date,
    type: r.type,
    categoryName: r.category_name,
    amount: r.amount,
    note: r.note,
  }));
}

export async function getSystemStats(): Promise<{
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalTransactions: number;
  totalCategories: number;
}> {
  const [rows] = await pool.execute<(RowDataPacket & {
    total_users: number; active_users: number; locked_users: number;
    total_transactions: number; total_categories: number;
  })[]>(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
      (SELECT COUNT(*) FROM users WHERE status = 'locked') AS locked_users,
      (SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL) AS total_transactions,
      (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) AS total_categories
  `);
  const r = rows[0]!;
  return {
    totalUsers: r.total_users,
    activeUsers: r.active_users,
    lockedUsers: r.locked_users,
    totalTransactions: r.total_transactions,
    totalCategories: r.total_categories,
  };
}
