/**
 * ============================================================================
 * TẦNG TRUY XUẤT DỮ LIỆU NHẬT KÝ HỆ THỐNG (Audit Logs Repository)
 * ============================================================================
 * File này quản lý việc ghi nhận (insert) và tra cứu (list) lịch sử thao tác của người dùng/admin
 * phục vụ công tác an toàn thông tin, bảo mật và đối soát hành động nhạy cảm.
 */

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type AuditLogRecord = {
  id: number;
  userId: number | null;
  userName: string | null;
  action: string;
  targetTable: string | null;
  targetId: number | null;
  detail: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

type AuditLogRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  target_table: string | null;
  target_id: number | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
};

/**
 * Xử lý an toàn trường `detail` trong database:
 * Tránh lỗi syntax khi mysql2 tự động parse cột JSON thành object trong Node.js.
 */
function parseDetail(detail: unknown): Record<string, unknown> | null {
  if (!detail) return null;
  if (typeof detail === "object") return detail as Record<string, unknown>;
  if (typeof detail === "string") {
    try {
      return JSON.parse(detail) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

/** Chuyển đổi dữ liệu từ MySQL Row sang TypeScript Object */
function toRecord(row: AuditLogRow): AuditLogRecord {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    targetTable: row.target_table,
    targetId: row.target_id,
    detail: parseDetail(row.detail),
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

/**
 * Ghi một bản ghi nhật ký hoạt động vào bảng `audit_logs`
 * @param input - Thông tin chi tiết: người thực hiện, hành động, bảng tác động, ID bản ghi, dữ liệu phụ và địa chỉ IP
 */
export async function insertAuditLog(input: {
  userId: number | null;
  action: string;
  targetTable?: string;
  targetId?: number;
  detail?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  await pool.execute<ResultSetHeader>(
    `INSERT INTO audit_logs (user_id, action, target_table, target_id, detail, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.userId ?? null,
      input.action,
      input.targetTable ?? null,
      input.targetId ?? null,
      input.detail ? JSON.stringify(input.detail) : null,
      input.ipAddress ?? null,
    ],
  );
}

export type AuditLogFilter = {
  userId?: number;
  action?: string;
  targetTable?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

/**
 * Lấy danh sách nhật ký kiểm toán có phân trang và bộ lọc (Dành cho Admin)
 */
export async function listAuditLogs(filter: AuditLogFilter = {}): Promise<{
  data: AuditLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { userId, action, targetTable, dateFrom, dateTo, page = 1, limit = 50 } = filter;

  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (userId) { conditions.push("al.user_id = ?"); params.push(userId); }
  if (action) { conditions.push("al.action LIKE ?"); params.push(`%${action}%`); }
  if (targetTable) { conditions.push("al.target_table = ?"); params.push(targetTable); }
  if (dateFrom) { conditions.push("al.created_at >= ?"); params.push(dateFrom); }
  if (dateTo) { conditions.push("al.created_at <= ?"); params.push(dateTo + " 23:59:59"); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // 1. Đếm tổng số lượng bản ghi thỏa mãn điều kiện lọc
  const [countRows] = await pool.execute<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM audit_logs al ${where}`,
    params,
  );
  const total = countRows[0]?.total ?? 0;
  const offset = (page - 1) * limit;

  // 2. Lấy danh sách bản ghi mới nhất trước (ORDER BY created_at DESC)
  const [rows] = await pool.execute<AuditLogRow[]>(
    `SELECT al.id, al.user_id, u.name AS user_name, al.action,
            al.target_table, al.target_id, al.detail, al.ip_address, al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC
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
