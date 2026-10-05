import aiomysql

COLUMNS = "id, user_id AS userId, name, type, created_at AS createdAt, updated_at AS updatedAt"


async def list_categories_for_user(conn: aiomysql.Connection, user_id: int) -> list[dict]:
    async with conn.cursor() as cur:
        await cur.execute(
            f"SELECT {COLUMNS} FROM categories WHERE deleted_at IS NULL AND (user_id IS NULL OR user_id = %s) "
            "ORDER BY user_id IS NULL DESC, type, name",
            (user_id,),
        )
        return list(await cur.fetchall())


async def list_default_categories(conn: aiomysql.Connection) -> list[dict]:
    async with conn.cursor() as cur:
        await cur.execute(f"SELECT {COLUMNS} FROM categories WHERE user_id IS NULL AND deleted_at IS NULL ORDER BY type, name")
        return list(await cur.fetchall())


async def find_category_by_id(conn: aiomysql.Connection, category_id: int) -> dict | None:
    async with conn.cursor() as cur:
        await cur.execute(f"SELECT {COLUMNS} FROM categories WHERE id = %s AND deleted_at IS NULL LIMIT 1", (category_id,))
        return await cur.fetchone()


def category_is_usable_by(category: dict, user_id: int) -> bool:
    """category.user_id IS NULL (system default) OR belongs to this user."""
    return category["userId"] is None or category["userId"] == user_id


async def create_category(conn: aiomysql.Connection, user_id: int, name: str, type_: str) -> int:
    async with conn.cursor() as cur:
        await cur.execute("INSERT INTO categories (user_id, name, type) VALUES (%s, %s, %s)", (user_id, name.strip(), type_))
        return cur.lastrowid


async def create_default_category(conn: aiomysql.Connection, name: str, type_: str) -> int:
    async with conn.cursor() as cur:
        await cur.execute("INSERT INTO categories (user_id, name, type) VALUES (NULL, %s, %s)", (name.strip(), type_))
        return cur.lastrowid


async def update_category(conn: aiomysql.Connection, category_id: int, name: str, type_: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute("UPDATE categories SET name = %s, type = %s WHERE id = %s", (name.strip(), type_, category_id))


async def soft_delete_category(conn: aiomysql.Connection, category_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute("UPDATE categories SET deleted_at = NOW() WHERE id = %s", (category_id,))
