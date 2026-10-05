import mysql from "mysql2/promise";
import type { PoolConnection } from "mysql2/promise";

declare global {
  var __dbPool: mysql.Pool | undefined;
}

// Next.js dev server reloads modules on every request — cache the pool on
// `global` so hot-reload doesn't leak a new connection pool each time.
export const pool =
  global.__dbPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
  });

if (process.env.NODE_ENV !== "production") {
  global.__dbPool = pool;
}

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export function isDuplicateEntry(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ER_DUP_ENTRY";
}
