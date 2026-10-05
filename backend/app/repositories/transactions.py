import aiomysql

from app.pagination import PageResult

SELECT_COLS = (
    "t.id, t.user_id AS userId, t.category_id AS categoryId, c.name AS categoryName, "
    "t.type, t.amount, t.transaction_date AS transactionDate, t.note, "
    "t.created_at AS createdAt, t.updated_at AS updatedAt"
)

ALLOWED_SORT = {"transaction_date", "amount", "created_at"}


def _build_filters(user_id: int, filter_: dict) -> tuple[list[str], list]:
    conditions = ["t.user_id = %s", "t.deleted_at IS NULL"]
    params: list = [user_id]
    if filter_.get("type"):
        conditions.append("t.type = %s")
        params.append(filter_["type"])
    if filter_.get("categoryId"):
        conditions.append("t.category_id = %s")
        params.append(filter_["categoryId"])
    if filter_.get("dateFrom"):
        conditions.append("t.transaction_date >= %s")
        params.append(filter_["dateFrom"])
    if filter_.get("dateTo"):
        conditions.append("t.transaction_date <= %s")
        params.append(filter_["dateTo"])
    if filter_.get("search"):
        conditions.append("t.note LIKE %s")
        params.append(f"%{filter_['search']}%")
    return conditions, params


async def list_transactions(conn: aiomysql.Connection, user_id: int, filter_: dict) -> PageResult:
    page = filter_.get("page", 1)
    limit = filter_.get("limit", 20)
    sort_by = filter_.get("sortBy") or "transaction_date"
    sort_order = filter_.get("sortOrder") or "desc"

    conditions, params = _build_filters(user_id, filter_)
    where = " AND ".join(conditions)
    safe_sort = sort_by if sort_by in ALLOWED_SORT else "transaction_date"
    safe_order = "ASC" if sort_order == "asc" else "DESC"

    async with conn.cursor() as cur:
        await cur.execute(f"SELECT COUNT(*) AS total FROM transactions t WHERE {where}", params)
        total_row = await cur.fetchone()
        total = total_row["total"] if total_row else 0

        offset = (page - 1) * limit
        await cur.execute(
            f"""SELECT {SELECT_COLS} FROM transactions t JOIN categories c ON c.id = t.category_id
                WHERE {where} ORDER BY t.{safe_sort} {safe_order} LIMIT %s OFFSET %s""",
            (*params, limit, offset),
        )
        rows = await cur.fetchall()

    return PageResult(data=list(rows), total=total, page=page, limit=limit)


async def find_transaction_by_id(conn: aiomysql.Connection, tx_id: int, user_id: int) -> dict | None:
    async with conn.cursor() as cur:
        await cur.execute(
            f"""SELECT {SELECT_COLS} FROM transactions t JOIN categories c ON c.id = t.category_id
                WHERE t.id = %s AND t.user_id = %s AND t.deleted_at IS NULL LIMIT 1""",
            (tx_id, user_id),
        )
        return await cur.fetchone()


async def create_transaction(
    conn: aiomysql.Connection, user_id: int, category_id: int, type_: str, amount: float, transaction_date: str, note: str | None
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            """INSERT INTO transactions (user_id, category_id, type, amount, transaction_date, note)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (user_id, category_id, type_, amount, transaction_date, note),
        )
        return cur.lastrowid


async def update_transaction(
    conn: aiomysql.Connection,
    tx_id: int,
    user_id: int,
    category_id: int,
    type_: str,
    amount: float,
    transaction_date: str,
    note: str | None,
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            """UPDATE transactions SET category_id = %s, type = %s, amount = %s, transaction_date = %s, note = %s
               WHERE id = %s AND user_id = %s AND deleted_at IS NULL""",
            (category_id, type_, amount, transaction_date, note, tx_id, user_id),
        )
        return cur.rowcount > 0


async def soft_delete_transaction(conn: aiomysql.Connection, tx_id: int, user_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE transactions SET deleted_at = NOW() WHERE id = %s AND user_id = %s AND deleted_at IS NULL",
            (tx_id, user_id),
        )
        return cur.rowcount > 0


async def bulk_create_transactions(conn: aiomysql.Connection, user_id: int, rows: list[dict]) -> int:
    if not rows:
        return 0
    placeholders = ",".join(["(%s,%s,%s,%s,%s,%s)"] * len(rows))
    values: list = []
    for r in rows:
        values.extend([user_id, r["categoryId"], r["type"], r["amount"], r["transactionDate"], r.get("note")])
    async with conn.cursor() as cur:
        await cur.execute(
            f"INSERT INTO transactions (user_id, category_id, type, amount, transaction_date, note) VALUES {placeholders}",
            values,
        )
        return cur.rowcount


async def export_transactions(conn: aiomysql.Connection, user_id: int, filter_: dict) -> list[dict]:
    conditions, params = _build_filters(user_id, filter_)
    where = " AND ".join(conditions)
    async with conn.cursor() as cur:
        await cur.execute(
            f"""SELECT {SELECT_COLS} FROM transactions t JOIN categories c ON c.id = t.category_id
                WHERE {where} ORDER BY t.transaction_date DESC""",
            params,
        )
        return list(await cur.fetchall())
