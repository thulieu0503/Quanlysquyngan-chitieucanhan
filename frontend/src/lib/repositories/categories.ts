/**
 * ============================================================================
 * TẦNG TRUY XUẤT DỮ LIỆU DANH MỤC (Categories Repository)
 * ============================================================================
 * File này trực tiếp thực hiện các câu lệnh SQL thao tác với bảng `categories`:
 * - Danh mục mặc định của hệ thống: có `user_id IS NULL` (mọi người dùng đều thấy).
 * - Danh mục cá nhân: có `user_id = ?` (chỉ riêng người tạo mới thấy).
 */

import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type CategoryRecord = {
  id: number;
  userId: number | null; // null: Danh mục hệ thống, number: Danh mục cá nhân
  name: string;
  type: "income" | "expense";
  createdAt: string;
  updatedAt: string;
};

type CategoryRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  name: string;
  type: "income" | "expense";
  created_at: string;
  updated_at: string;
};

/** Chuyển đổi dữ liệu từ MySQL Row sang TypeScript Object */
function toRecord(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = "id, user_id, name, type, created_at, updated_at";

/**
 * Lấy tất cả danh mục khả dụng cho một người dùng:
 * Bao gồm cả danh mục mặc định của hệ thống (user_id IS NULL) và danh mục cá nhân của user đó.
 */
export async function listCategoriesForUser(userId: number): Promise<CategoryRecord[]> {
  const [rows] = await pool.execute<CategoryRow[]>(
    `SELECT ${COLUMNS} FROM categories WHERE deleted_at IS NULL AND (user_id IS NULL OR user_id = ?) ORDER BY user_id IS NULL DESC, type, name`,
    [userId],
  );
  return rows.map(toRecord);
}

/**
 * Lấy danh sách các danh mục mặc định của hệ thống (dành cho Admin quản lý)
 */
export async function listDefaultCategories(): Promise<CategoryRecord[]> {
  const [rows] = await pool.execute<CategoryRow[]>(
    `SELECT ${COLUMNS} FROM categories WHERE user_id IS NULL AND deleted_at IS NULL ORDER BY type, name`,
  );
  return rows.map(toRecord);
}

/**
 * Tìm danh mục theo ID
 */
export async function findCategoryById(id: number): Promise<CategoryRecord | null> {
  const [rows] = await pool.execute<CategoryRow[]>(
    `SELECT ${COLUMNS} FROM categories WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

/**
 * Người dùng tạo danh mục chi tiêu/thu nhập cá nhân mới
 */
export async function createCategory(input: {
  userId: number;
  name: string;
  type: "income" | "expense";
}): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)",
    [input.userId, input.name.trim(), input.type],
  );
  return result.insertId;
}

/**
 * Admin tạo danh mục mặc định cho toàn hệ thống
 */
export async function createDefaultCategory(input: {
  name: string;
  type: "income" | "expense";
}): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO categories (user_id, name, type) VALUES (NULL, ?, ?)",
    [input.name.trim(), input.type],
  );
  return result.insertId;
}

/**
 * Cập nhật tên hoặc loại danh mục
 */
export async function updateCategory(
  conn: PoolConnection,
  id: number,
  input: { name: string; type: "income" | "expense" },
): Promise<void> {
  await conn.execute("UPDATE categories SET name = ?, type = ? WHERE id = ?", [
    input.name.trim(),
    input.type,
    id,
  ]);
}

/**
 * Xóa mềm danh mục (cập nhật deleted_at = NOW())
 */
export async function softDeleteCategory(id: number): Promise<void> {
  await pool.execute("UPDATE categories SET deleted_at = NOW() WHERE id = ?", [id]);
}
