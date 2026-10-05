import aiomysql

SELECT_COLS = """r.id, r.user_id AS userId, r.category_id AS categoryId, c.name AS categoryName,
       r.title, r.amount, r.recurrence, r.next_run_date AS nextRunDate, r.channel, r.is_active AS isActive,
       r.created_at AS createdAt, r.updated_at AS updatedAt"""

FROM_JOIN = "FROM reminders r LEFT JOIN categories c ON c.id = r.category_id"


async def list_reminders(conn: aiomysql.Connection, user_id: int) -> list[dict]:
    async with conn.cursor() as cur:
        await cur.execute(f"SELECT {SELECT_COLS} {FROM_JOIN} WHERE r.user_id = %s ORDER BY r.next_run_date ASC", (user_id,))
        return list(await cur.fetchall())


async def find_reminder_by_id(conn: aiomysql.Connection, reminder_id: int, user_id: int) -> dict | None:
    async with conn.cursor() as cur:
        await cur.execute(
            f"SELECT {SELECT_COLS} {FROM_JOIN} WHERE r.id = %s AND r.user_id = %s LIMIT 1", (reminder_id, user_id)
        )
        return await cur.fetchone()


async def create_reminder(
    conn: aiomysql.Connection,
    user_id: int,
    category_id: int | None,
    title: str,
    amount: float | None,
    recurrence: str,
    next_run_date: str,
    channel: str,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            """INSERT INTO reminders (user_id, category_id, title, amount, recurrence, next_run_date, channel)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (user_id, category_id, title, amount, recurrence, next_run_date, channel),
        )
        return cur.lastrowid


async def update_reminder(
    conn: aiomysql.Connection,
    reminder_id: int,
    user_id: int,
    category_id: int | None,
    title: str,
    amount: float | None,
    recurrence: str,
    next_run_date: str,
    channel: str,
    is_active: bool,
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            """UPDATE reminders SET category_id = %s, title = %s, amount = %s, recurrence = %s,
                      next_run_date = %s, channel = %s, is_active = %s
               WHERE id = %s AND user_id = %s""",
            (category_id, title, amount, recurrence, next_run_date, channel, 1 if is_active else 0, reminder_id, user_id),
        )
        return cur.rowcount > 0


async def delete_reminder(conn: aiomysql.Connection, reminder_id: int, user_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM reminders WHERE id = %s AND user_id = %s", (reminder_id, user_id))
        return cur.rowcount > 0


async def get_due_reminders(conn: aiomysql.Connection, today: str) -> list[dict]:
    """Used by a scheduled job to send notifications — no HTTP route triggers this today."""
    async with conn.cursor() as cur:
        await cur.execute(f"SELECT {SELECT_COLS} {FROM_JOIN} WHERE r.is_active = 1 AND r.next_run_date <= %s", (today,))
        return list(await cur.fetchall())


async def advance_reminder_date(conn: aiomysql.Connection, reminder_id: int, next_run_date: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute("UPDATE reminders SET next_run_date = %s WHERE id = %s", (next_run_date, reminder_id))
