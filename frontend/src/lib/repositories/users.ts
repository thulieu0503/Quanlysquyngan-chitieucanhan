/**
 * ============================================================================
 * TẦNG TRUY XUẤT DỮ LIỆU NGƯỜI DÙNG (Users Repository)
 * ============================================================================
 * File này trực tiếp thực hiện các câu lệnh SQL thao tác với bảng `users` trong MySQL:
 * - Tìm kiếm người dùng theo email / ID
 * - Tạo mới tài khoản (Đăng ký)
 * - Đổi mật khẩu
 * - Phân trang danh sách người dùng cho Admin
 * - Khóa / Mở khóa tài khoản người dùng
 * - Cập nhật thông tin cá nhân
 */

import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";
import type { Role } from "@/lib/rbac";

/** Cấu trúc dữ liệu User hoàn chỉnh trong ứng dụng */
export type UserRecord = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: "active" | "locked";
};

/** Cấu trúc một dòng dữ liệu trả về từ bảng `users` trong MySQL */
type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: "active" | "locked";
};

/** Chuyển đổi dữ liệu từ cột dạng `snake_case` của MySQL sang `camelCase` của TypeScript */
function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
  };
}

/** Danh sách các cột cần SELECT từ bảng users */
const COLUMNS = "id, name, email, password_hash, role, status";

/**
 * Tìm người dùng theo địa chỉ Email (Dùng trong quá trình Đăng nhập, Đăng ký, Quên mật khẩu)
 * @param email - Địa chỉ email cần tìm
 * @returns UserRecord nếu tìm thấy, hoặc null nếu không tồn tại
 */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const [rows] = await pool.execute<UserRow[]>(`SELECT ${COLUMNS} FROM users WHERE email = ? LIMIT 1`, [email]);
  return rows[0] ? toRecord(rows[0]) : null;
}

/**
 * Tìm người dùng theo ID
 * @param id - Khóa chính ID người dùng
 * @returns UserRecord nếu tìm thấy, hoặc null
 */
export async function findUserById(id: number): Promise<UserRecord | null> {
  const [rows] = await pool.execute<UserRow[]>(`SELECT ${COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

/**
 * Tạo người dùng mới trong DB khi người dùng đăng ký tài khoản.
 * Lưu ý: Role mặc định luôn là 'user'. Admin chỉ được tạo trực tiếp từ migration / database seed.
 * @returns ID của người dùng vừa được tạo (insertId)
 */
export async function createUser(input: { name: string; email: string; passwordHash: string }): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [input.name, input.email, input.passwordHash],
  );
  return result.insertId;
}

/**
 * Cập nhật chuỗi băm mật khẩu mới (dùng khi Đổi mật khẩu hoặc Đặt lại mật khẩu)
 * @param conn - Connection đang mở trong Database Transaction
 * @param userId - ID người dùng cần cập nhật
 * @param passwordHash - Chuỗi mật khẩu đã băm bằng bcrypt
 */
export async function updatePasswordHash(conn: PoolConnection, userId: number, passwordHash: string): Promise<void> {
  await conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
}

/**
 * Lấy danh sách người dùng có hỗ trợ phân trang và tìm kiếm (Dành riêng cho Admin)
 * @param filter - Bao gồm search (tìm tên/email), status (lọc theo trạng thái), page và limit
 * @returns Danh sách người dùng, tổng số bản ghi và tổng số trang
 */
export async function listUsers(filter: {
  search?: string;
  status?: "active" | "locked";
  page?: number;
  limit?: number;
}): Promise<{ data: UserRecord[]; total: number; page: number; limit: number; totalPages: number }> {
  const { search, status, page = 1, limit = 20 } = filter;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (search) {
    conditions.push("(name LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) { conditions.push("status = ?"); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // 1. Đếm tổng số bản ghi thỏa mãn điều kiện lọc
  const [countRows] = await pool.execute<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM users ${where}`, params,
  );
  const total = countRows[0]?.total ?? 0;
  const offset = (page - 1) * limit;

  // 2. Lấy danh sách bản ghi theo trang hiện tại (ORDER BY created_at DESC)
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT ${COLUMNS} FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { data: rows.map(toRecord), total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Cập nhật trạng thái tài khoản (Admin khóa hoặc mở khóa tài khoản)
 * @param userId - ID tài khoản cần khóa/mở khóa
 * @param status - Trạng thái mới ("active" | "locked")
 * @returns true nếu cập nhật thành công, false nếu không tìm thấy ID
 */
export async function updateUserStatus(userId: number, status: "active" | "locked"): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE users SET status = ? WHERE id = ?",
    [status, userId],
  );
  return result.affectedRows > 0;
}

/**
 * Người dùng tự cập nhật thông tin cá nhân (Họ và tên)
 * @param userId - ID của người dùng hiện tại
 * @param name - Họ tên mới
 * @returns true nếu cập nhật thành công
 */
export async function updateProfile(userId: number, name: string): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE users SET name = ? WHERE id = ?",
    [name.trim(), userId],
  );
  return result.affectedRows > 0;
}
