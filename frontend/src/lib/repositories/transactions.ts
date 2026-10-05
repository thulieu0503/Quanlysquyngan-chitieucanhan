import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type TransactionRecord = {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  type: "income" | "expense";
  amount: string; // DECIMAL trả về string từ mysql2 khi dateStrings=true
  transactionDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type TransactionRow = RowDataPacket & {
  id: number;
  user_id: number;
  category_id: number;
  category_name: string;
  type: "income" | "expense";
  amount: string;
  transaction_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function toRecord(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    type: row.type,
    amount: row.amount,
    transactionDate: row.transaction_date,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type TransactionFilter = {
  type?: "income" | "expense";
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: "transaction_date" | "amount" | "created_at";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type PaginatedTransactions = {
  data: TransactionRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function listTransactions(
  userId: number,
  filter: TransactionFilter = {},
): Promise<PaginatedTransactions> {
  const {
    type,
    categoryId,
    dateFrom,
    dateTo,
    search,
    sortBy = "transaction_date",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = filter;

  const conditions: string[] = ["t.user_id = ?", "t.deleted_at IS NULL"];
  const params: (string | number | null)[] = [userId];
  if (type) { conditions.push("t.type = ?"); params.push(type); }
  if (categoryId) { conditions.push("t.category_id = ?"); params.push(categoryId); }
  if (dateFrom) { conditions.push("t.transaction_date >= ?"); params.push(dateFrom); }
  if (dateTo) { conditions.push("t.transaction_date <= ?"); params.push(dateTo); }
  if (search) { conditions.push("t.note LIKE ?"); params.push(`%${search}%`); }

  const where = conditions.join(" AND ");

  // Whitelist để tránh SQL injection
  const allowedSort = ["transaction_date", "amount", "created_at"];
  const safeSort = allowedSort.includes(sortBy) ? sortBy : "transaction_date";
  const safeOrder = sortOrder === "asc" ? "ASC" : "DESC";

  const [countRows] = await pool.execute<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`,
    params,
  );
  const total = countRows[0]?.total ?? 0;

  const offset = (page - 1) * limit;
  const [rows] = await pool.execute<TransactionRow[]>(
    `SELECT t.id, t.user_id, t.category_id, c.name AS category_name,
            t.type, t.amount, t.transaction_date, t.note, t.created_at, t.updated_at
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE ${where}
     ORDER BY t.${safeSort} ${safeOrder}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    data: rows.map(toRecord),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function findTransactionById(id: number, userId: number): Promise<TransactionRecord | null> {
  const [rows] = await pool.execute<TransactionRow[]>(
    `SELECT t.id, t.user_id, t.category_id, c.name AS category_name,
            t.type, t.amount, t.transaction_date, t.note, t.created_at, t.updated_at
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.id = ? AND t.user_id = ? AND t.deleted_at IS NULL LIMIT 1`,
    [id, userId],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function createTransaction(input: {
  userId: number;
  categoryId: number;
  type: "income" | "expense";
  amount: number;
  transactionDate: string;
  note?: string;
}): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO transactions (user_id, category_id, type, amount, transaction_date, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.userId, input.categoryId, input.type, input.amount, input.transactionDate, input.note ?? null],
  );
  return result.insertId;
}

export async function updateTransaction(
  id: number,
  userId: number,
  input: {
    categoryId: number;
    type: "income" | "expense";
    amount: number;
    transactionDate: string;
    note?: string;
  },
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE transactions SET category_id = ?, type = ?, amount = ?, transaction_date = ?, note = ?
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [input.categoryId, input.type, input.amount, input.transactionDate, input.note ?? null, id, userId],
  );
  return result.affectedRows > 0;
}

export async function softDeleteTransaction(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE transactions SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
    [id, userId],
  );
  return result.affectedRows > 0;
}

/** Bulk insert từ CSV import */
export async function bulkCreateTransactions(
  rows: {
    userId: number;
    categoryId: number;
    type: "income" | "expense";
    amount: number;
    transactionDate: string;
    note?: string;
  }[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const placeholders = rows.map(() => "(?,?,?,?,?,?)").join(",");
  const values = rows.flatMap((r) => [
    r.userId, r.categoryId, r.type, r.amount, r.transactionDate, r.note ?? null,
  ]);
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO transactions (user_id, category_id, type, amount, transaction_date, note) VALUES ${placeholders}`,
    values,
  );
  return result.affectedRows;
}

/** Lấy tất cả giao dịch để xuất CSV/PDF (không phân trang) */
export async function exportTransactions(
  userId: number,
  filter: Omit<TransactionFilter, "page" | "limit"> = {},
): Promise<TransactionRecord[]> {
  const { type, categoryId, dateFrom, dateTo } = filter;
  const conditions: string[] = ["t.user_id = ?", "t.deleted_at IS NULL"];
  const params: (string | number | null)[] = [userId];

  if (type) { conditions.push("t.type = ?"); params.push(type); }
  if (categoryId) { conditions.push("t.category_id = ?"); params.push(categoryId); }
  if (dateFrom) { conditions.push("t.transaction_date >= ?"); params.push(dateFrom); }
  if (dateTo) { conditions.push("t.transaction_date <= ?"); params.push(dateTo); }

  const [rows] = await pool.execute<TransactionRow[]>(
    `SELECT t.id, t.user_id, t.category_id, c.name AS category_name,
            t.type, t.amount, t.transaction_date, t.note, t.created_at, t.updated_at
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY t.transaction_date DESC`,
    params,
  );
  return rows.map(toRecord);
}
