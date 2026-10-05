import aiomysql

from app.pagination import PageResult, paginate_query


async def find_user_by_email(conn: aiomysql.Connection, email: str) -> dict | None:
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, name, email, password_hash, role, status FROM users WHERE email = %s",
            (email,),
        )
        return await cur.fetchone()


async def find_user_by_id(conn: aiomysql.Connection, user_id: int) -> dict | None:
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, name, email, password_hash, role, status FROM users WHERE id = %s",
            (user_id,),
        )
        return await cur.fetchone()


async def create_user(conn: aiomysql.Connection, name: str, email: str, password_hash: str) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
            (name, email, password_hash),
        )
        return cur.lastrowid


async def update_user_name(conn: aiomysql.Connection, user_id: int, name: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute("UPDATE users SET name = %s WHERE id = %s", (name, user_id))


async def update_user_password(conn: aiomysql.Connection, user_id: int, password_hash: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (password_hash, user_id))


async def update_user_status(conn: aiomysql.Connection, user_id: int, status: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute("UPDATE users SET status = %s WHERE id = %s", (status, user_id))


async def list_users(
    conn: aiomysql.Connection,
    search: str | None,
    status: str | None,
    page: int,
    limit: int,
) -> PageResult:
    where = []
    params: list = []
    if search:
        where.append("(name LIKE %s OR email LIKE %s)")
        params.extend([f"%{search}%", f"%{search}%"])
    if status:
        where.append("status = %s")
        params.append(status)
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    return await paginate_query(
        conn,
        base_from=f"FROM users {where_sql}",
        select_cols="id, name, email, role, status",
        order_by="created_at DESC",
        params=params,
        page=page,
        limit=limit,
    )
