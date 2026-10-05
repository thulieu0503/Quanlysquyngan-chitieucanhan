import aiomysql

SELECT_COLS = """b.id, b.user_id AS userId, b.category_id AS categoryId, c.name AS categoryName,
       b.amount_limit AS amountLimit, b.period_start AS periodStart, b.period_end AS periodEnd,
       b.created_at AS createdAt, b.updated_at AS updatedAt,
       COALESCE(v.amount_used, 0) AS amountUsed,
       COALESCE(v.percent_used, 0) AS percentUsed"""

FROM_JOIN = """FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN v_budget_usage v ON v.budget_id = b.id"""


def _with_status(row: dict) -> dict:
    pct = float(row["percentUsed"] or 0)
    status = "exceeded" if pct >= 100 else "warning" if pct >= 80 else "ok"
    return {**row, "percentUsed": pct, "status": status}


async def list_budgets_with_usage(conn: aiomysql.Connection, user_id: int) -> list[dict]:
    async with conn.cursor() as cur:
        await cur.execute(
            f"SELECT {SELECT_COLS} {FROM_JOIN} WHERE b.user_id = %s ORDER BY b.period_start DESC, c.name",
            (user_id,),
        )
        rows = await cur.fetchall()
    return [_with_status(r) for r in rows]


async def find_budget_by_id(conn: aiomysql.Connection, budget_id: int, user_id: int) -> dict | None:
    async with conn.cursor() as cur:
        await cur.execute(
            f"SELECT {SELECT_COLS} {FROM_JOIN} WHERE b.id = %s AND b.user_id = %s LIMIT 1",
            (budget_id, user_id),
        )
        row = await cur.fetchone()
    return _with_status(row) if row else None


async def create_budget(
    conn: aiomysql.Connection, user_id: int, category_id: int, amount_limit: float, period_start: str, period_end: str
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO budgets (user_id, category_id, amount_limit, period_start, period_end) VALUES (%s, %s, %s, %s, %s)",
            (user_id, category_id, amount_limit, period_start, period_end),
        )
        return cur.lastrowid


async def update_budget(
    conn: aiomysql.Connection, budget_id: int, user_id: int, amount_limit: float, period_start: str, period_end: str
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE budgets SET amount_limit = %s, period_start = %s, period_end = %s WHERE id = %s AND user_id = %s",
            (amount_limit, period_start, period_end, budget_id, user_id),
        )
        return cur.rowcount > 0


async def delete_budget(conn: aiomysql.Connection, budget_id: int, user_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM budgets WHERE id = %s AND user_id = %s", (budget_id, user_id))
        return cur.rowcount > 0


async def get_active_budget_alerts(conn: aiomysql.Connection, user_id: int, today: str) -> list[dict]:
    async with conn.cursor() as cur:
        await cur.execute(
            f"""SELECT {SELECT_COLS} {FROM_JOIN}
                WHERE b.user_id = %s AND b.period_start <= %s AND b.period_end >= %s
                  AND COALESCE(v.percent_used, 0) >= 80
                ORDER BY v.percent_used DESC""",
            (user_id, today, today),
        )
        rows = await cur.fetchall()
    return [_with_status(r) for r in rows]
