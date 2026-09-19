import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
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
