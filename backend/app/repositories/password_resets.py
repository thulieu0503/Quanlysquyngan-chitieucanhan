import aiomysql


async def invalidate_active_codes(conn: aiomysql.Connection, user_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE password_resets SET used_at = NOW() WHERE user_id = %s AND used_at IS NULL",
            (user_id,),
        )


async def create_reset_code(conn: aiomysql.Connection, user_id: int, code_hash: str, valid_minutes: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO password_resets (user_id, token, expires_at) "
            "VALUES (%s, %s, DATE_ADD(NOW(), INTERVAL %s MINUTE))",
            (user_id, code_hash, valid_minutes),
        )


async def seconds_since_latest_code(conn: aiomysql.Connection, user_id: int) -> int | None:
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds FROM password_resets "
            "WHERE user_id = %s ORDER BY id DESC LIMIT 1",
            (user_id,),
        )
        row = await cur.fetchone()
        return int(row["seconds"]) if row else None


async def find_active_code(conn: aiomysql.Connection, user_id: int) -> dict | None:
    """SELECT ... FOR UPDATE — locks the row so concurrent verify attempts can't race the attempt counter.
    Caller must hold conn inside a transaction (see db.with_transaction)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, token, attempts FROM password_resets "
            "WHERE user_id = %s AND used_at IS NULL AND expires_at > NOW() "
            "ORDER BY id DESC LIMIT 1 FOR UPDATE",
            (user_id,),
        )
        row = await cur.fetchone()
        if not row:
            return None
        return {"id": row["id"], "code_hash": row["token"], "attempts": row["attempts"]}


async def record_failed_attempt(conn: aiomysql.Connection, reset_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute("UPDATE password_resets SET attempts = attempts + 1 WHERE id = %s", (reset_id,))


async def mark_code_used(conn: aiomysql.Connection, reset_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute("UPDATE password_resets SET used_at = NOW() WHERE id = %s", (reset_id,))
