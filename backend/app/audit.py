import json
from typing import Any

import aiomysql


async def insert_audit_log(
    conn: aiomysql.Connection,
    user_id: int | None,
    action: str,
    target_table: str | None = None,
    target_id: int | None = None,
    detail: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO audit_logs (user_id, action, target_table, target_id, detail, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                action,
                target_table,
                target_id,
                json.dumps(detail) if detail is not None else None,
                ip_address,
            ),
        )
