from datetime import date

import aiomysql


def _month_str(year: int, month: int) -> str:
    return f"{year}-{month:02d}"


async def get_monthly_summary(conn: aiomysql.Connection, user_id: int, year: int, month: int) -> dict:
    month_str = _month_str(year, month)
    async with conn.cursor() as cur:
        await cur.execute(
            """SELECT type, COALESCE(SUM(amount), 0) AS total FROM transactions
               WHERE user_id = %s AND deleted_at IS NULL AND DATE_FORMAT(transaction_date, '%%Y-%%m') = %s
               GROUP BY type""",
            (user_id, month_str),
        )
        rows = await cur.fetchall()

    total_income = "0"
    total_expense = "0"
    for r in rows:
        if r["type"] == "income":
            total_income = str(r["total"])
        elif r["type"] == "expense":
            total_expense = str(r["total"])
    balance = f"{float(total_income) - float(total_expense):.2f}"
    return {"totalIncome": total_income, "totalExpense": total_expense, "balance": balance, "month": month_str}


async def get_top_expense_categories(conn: aiomysql.Connection, user_id: int, year: int, month: int, limit: int = 5) -> list[dict]:
    month_str = _month_str(year, month)
    async with conn.cursor() as cur:
        await cur.execute(
            """SELECT t.category_id AS categoryId, c.name AS categoryName, t.type,
                      SUM(t.amount) AS total, COUNT(*) AS transactionCount
               FROM transactions t JOIN categories c ON c.id = t.category_id
               WHERE t.user_id = %s AND t.deleted_at IS NULL AND t.type = 'expense'
                 AND DATE_FORMAT(t.transaction_date, '%%Y-%%m') = %s
               GROUP BY t.category_id, c.name, t.type
               ORDER BY total DESC LIMIT %s""",
            (user_id, month_str, limit),
        )
        return list(await cur.fetchall())


async def get_daily_totals(conn: aiomysql.Connection, user_id: int, year: int, month: int) -> list[dict]:
    month_str = _month_str(year, month)
    async with conn.cursor() as cur:
        await cur.execute(
            """SELECT transaction_date AS date, type, SUM(amount) AS total FROM transactions
               WHERE user_id = %s AND deleted_at IS NULL AND DATE_FORMAT(transaction_date, '%%Y-%%m') = %s
               GROUP BY transaction_date, type ORDER BY transaction_date""",
            (user_id, month_str),
        )
        rows = await cur.fetchall()

    by_date: dict[str, dict] = {}
    for r in rows:
        d = str(r["date"])
        entry = by_date.setdefault(d, {"date": d, "income": "0", "expense": "0"})
        if r["type"] == "income":
            entry["income"] = str(r["total"])
        else:
            entry["expense"] = str(r["total"])
    return list(by_date.values())


async def get_dashboard_budget_alerts(conn: aiomysql.Connection, user_id: int) -> list[dict]:
    today = date.today().isoformat()
    async with conn.cursor() as cur:
        await cur.execute(
            """SELECT v.budget_id AS budgetId, c.name AS categoryName, v.amount_limit AS amountLimit,
                      v.amount_used AS amountUsed, v.percent_used AS percentUsed
               FROM v_budget_usage v JOIN categories c ON c.id = v.category_id
               WHERE v.user_id = %s AND v.period_start <= %s AND v.period_end >= %s AND v.percent_used >= 80
               ORDER BY v.percent_used DESC""",
            (user_id, today, today),
        )
        rows = await cur.fetchall()

    result = []
    for r in rows:
        pct = float(r["percentUsed"])
        result.append({**r, "percentUsed": pct, "status": "exceeded" if pct >= 100 else "warning"})
    return result


async def get_monthly_report(conn: aiomysql.Connection, user_id: int, year: int, month: int) -> dict:
    month_str = _month_str(year, month)
    summary = await get_monthly_summary(conn, user_id, year, month)

    async with conn.cursor() as cur:
        await cur.execute(
            """SELECT t.category_id AS categoryId, c.name AS categoryName, t.type,
                      SUM(t.amount) AS total, COUNT(*) AS transactionCount
               FROM transactions t JOIN categories c ON c.id = t.category_id
               WHERE t.user_id = %s AND t.deleted_at IS NULL AND DATE_FORMAT(t.transaction_date, '%%Y-%%m') = %s
               GROUP BY t.category_id, c.name, t.type ORDER BY t.type, total DESC""",
            (user_id, month_str),
        )
        by_category = list(await cur.fetchall())

    by_day = await get_daily_totals(conn, user_id, year, month)

    return {
        "year": year,
        "month": month,
        "totalIncome": summary["totalIncome"],
        "totalExpense": summary["totalExpense"],
        "balance": summary["balance"],
        "byCategory": by_category,
        "byDay": by_day,
    }


async def get_transactions_for_export(conn: aiomysql.Connection, user_id: int, year: int, month: int) -> list[dict]:
    month_str = _month_str(year, month)
    async with conn.cursor() as cur:
        await cur.execute(
            """SELECT t.id, t.transaction_date AS date, t.type, c.name AS categoryName, t.amount, t.note
               FROM transactions t JOIN categories c ON c.id = t.category_id
               WHERE t.user_id = %s AND t.deleted_at IS NULL AND DATE_FORMAT(t.transaction_date, '%%Y-%%m') = %s
               ORDER BY t.transaction_date, t.type""",
            (user_id, month_str),
        )
        return list(await cur.fetchall())


async def get_system_stats(conn: aiomysql.Connection) -> dict:
    async with conn.cursor() as cur:
        await cur.execute(
            """SELECT
                 (SELECT COUNT(*) FROM users) AS totalUsers,
                 (SELECT COUNT(*) FROM users WHERE status = 'active') AS activeUsers,
                 (SELECT COUNT(*) FROM users WHERE status = 'locked') AS lockedUsers,
                 (SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL) AS totalTransactions,
                 (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) AS totalCategories"""
        )
        return await cur.fetchone()
