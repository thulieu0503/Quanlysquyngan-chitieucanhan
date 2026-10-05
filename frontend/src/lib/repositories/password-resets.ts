import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

// Vô hiệu hóa các mã cũ chưa dùng của user để mỗi lúc chỉ có 1 mã còn hiệu lực.
export async function invalidateActiveCodes(conn: PoolConnection, userId: number): Promise<void> {
  await conn.execute("UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [userId]);
}

export async function createResetCode(
  conn: PoolConnection,
  userId: number,
  codeHash: string,
  validMinutes: number,
): Promise<void> {
  await conn.execute(
    "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
    [userId, codeHash, validMinutes],
  );
}

type SecondsRow = RowDataPacket & { seconds: number };

// Số giây kể từ lần gửi mã gần nhất (null nếu chưa từng gửi) — dùng để chặn gửi mã dồn dập vào một hộp thư.
export async function secondsSinceLatestCode(userId: number): Promise<number | null> {
  const [rows] = await pool.execute<SecondsRow[]>(
    "SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds FROM password_resets WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    [userId],
  );
  return rows[0] ? Number(rows[0].seconds) : null;
}

type CodeRow = RowDataPacket & { id: number; token: string; attempts: number };

export type ActiveCode = { id: number; codeHash: string; attempts: number };

// Khóa dòng (FOR UPDATE) để các lần nhập đồng thời không vượt được giới hạn số lần thử.
export async function findActiveCode(conn: PoolConnection, userId: number): Promise<ActiveCode | null> {
  const [rows] = await conn.execute<CodeRow[]>(
    "SELECT id, token, attempts FROM password_resets WHERE user_id = ? AND used_at IS NULL AND expires_at > NOW() ORDER BY id DESC LIMIT 1 FOR UPDATE",
    [userId],
  );
  return rows[0] ? { id: rows[0].id, codeHash: rows[0].token, attempts: rows[0].attempts } : null;
}

export async function recordFailedAttempt(conn: PoolConnection, id: number): Promise<void> {
  await conn.execute("UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?", [id]);
}

export async function markCodeUsed(conn: PoolConnection, id: number): Promise<void> {
  await conn.execute("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [id]);
}
