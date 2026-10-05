/**
 * ============================================================================
 * TẦNG TRUY XUẤT DỮ LIỆU NHẮC NHỞ ĐỊNH KỲ (Reminders Repository)
 * ============================================================================
 * File này quản lý việc lưu trữ và truy vấn các lịch nhắc nhở thanh toán hóa đơn,
 * chi tiêu định kỳ (hàng ngày, hàng tuần, hàng tháng, hàng năm) qua Email hoặc In-App.
 */

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type ReminderRecord = {
  id: number;
  userId: number;
  categoryId: number | null;
  categoryName: string | null;
  title: string;
  amount: string | null;
  recurrence: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
  channel: "email" | "in_app" | "both";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ReminderRow = RowDataPacket & {
  id: number;
  user_id: number;
  category_id: number | null;
  category_name: string | null;
  title: string;
  amount: string | null;
  recurrence: "daily" | "weekly" | "monthly" | "yearly";
  next_run_date: string;
  channel: "email" | "in_app" | "both";
  is_active: number;
  created_at: string;
  updated_at: string;
};

/** Chuyển đổi dữ liệu MySQL Row sang TypeScript Object */
function toRecord(row: ReminderRow): ReminderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    title: row.title,
    amount: row.amount,
    recurrence: row.recurrence,
    nextRunDate: row.next_run_date,
    channel: row.channel,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Lấy danh sách toàn bộ lịch nhắc nhở của người dùng (sắp xếp theo ngày kích hoạt gần nhất)
 */
export async function listReminders(userId: number): Promise<ReminderRecord[]> {
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT r.id, r.user_id, r.category_id, c.name AS category_name,
            r.title, r.amount, r.recurrence, r.next_run_date, r.channel, r.is_active,
            r.created_at, r.updated_at
     FROM reminders r
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.user_id = ?
     ORDER BY r.next_run_date ASC`,
    [userId],
  );
  return rows.map(toRecord);
}

/**
 * Tìm kiếm chi tiết một lịch nhắc nhở theo ID
 */
export async function findReminderById(id: number, userId: number): Promise<ReminderRecord | null> {
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT r.id, r.user_id, r.category_id, c.name AS category_name,
            r.title, r.amount, r.recurrence, r.next_run_date, r.channel, r.is_active,
            r.created_at, r.updated_at
     FROM reminders r
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.id = ? AND r.user_id = ? LIMIT 1`,
    [id, userId],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

/**
 * Tạo mới một lịch nhắc nhở định kỳ
 */
export async function createReminder(input: {
  userId: number;
  categoryId?: number;
  title: string;
  amount?: number;
  recurrence: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
  channel: "email" | "in_app" | "both";
}): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO reminders (user_id, category_id, title, amount, recurrence, next_run_date, channel)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.categoryId ?? null,
      input.title,
      input.amount ?? null,
      input.recurrence,
      input.nextRunDate,
      input.channel,
    ],
  );
  return result.insertId;
}

/**
 * Cập nhật thông tin lịch nhắc nhở (tiêu đề, chu kỳ, ngày chạy, kênh thông báo, trạng thái bật/tắt)
 */
export async function updateReminder(
  id: number,
  userId: number,
  input: {
    categoryId?: number;
    title: string;
    amount?: number;
    recurrence: "daily" | "weekly" | "monthly" | "yearly";
    nextRunDate: string;
    channel: "email" | "in_app" | "both";
    isActive: boolean;
  },
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE reminders SET category_id = ?, title = ?, amount = ?, recurrence = ?,
            next_run_date = ?, channel = ?, is_active = ?
     WHERE id = ? AND user_id = ?`,
    [
      input.categoryId ?? null,
      input.title,
      input.amount ?? null,
      input.recurrence,
      input.nextRunDate,
      input.channel,
      input.isActive ? 1 : 0,
      id,
      userId,
    ],
  );
  return result.affectedRows > 0;
}

/**
 * Xóa một lịch nhắc nhở
 */
export async function deleteReminder(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM reminders WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return result.affectedRows > 0;
}

/**
 * Lấy danh sách các nhắc nhở đến hạn kích hoạt (dùng cho Cron Job gửi email / push notification)
 */
export async function getDueReminders(): Promise<ReminderRecord[]> {
  const today = new Date().toISOString().split("T")[0];
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT r.id, r.user_id, r.category_id, c.name AS category_name,
            r.title, r.amount, r.recurrence, r.next_run_date, r.channel, r.is_active,
            r.created_at, r.updated_at
     FROM reminders r
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.is_active = 1 AND r.next_run_date <= ?`,
    [today],
  );
  return rows.map(toRecord);
}

/**
 * Cập nhật ngày kích hoạt tiếp theo sau khi hệ thống đã gửi thông báo thành công
 */
export async function advanceReminderDate(id: number, nextRunDate: string): Promise<void> {
  await pool.execute("UPDATE reminders SET next_run_date = ? WHERE id = ?", [nextRunDate, id]);
}
