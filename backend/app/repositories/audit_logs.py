import json

import aiomysql

from app.pagination import PageResult


def _parse_detail(detail) -> dict | None:
    if not detail:
        return None
    if isinstance(detail, dict):
        return detail
    if isinstance(detail, str):
        try:
            return json.loads(detail)
        except json.JSONDecodeError:
            return None
    return None


async def list_audit_logs(
    conn: aiomysql.Connection,
    user_id: int | None,
    action: str | None,
    target_table: str | None,
    date_from: str | None,
    date_to: str | None,
    page: int,
    limit: int,
) -> PageResult:
    conditions = []
    params: list = []
    if user_id:
        conditions.append("al.user_id = %s")
        params.append(user_id)
    if action:
        conditions.append("al.action LIKE %s")
        params.append(f"%{action}%")
    if target_table:
        conditions.append("al.target_table = %s")
        params.append(target_table)
    if date_from:
        conditions.append("al.created_at >= %s")
        params.append(date_from)
    if date_to:
        conditions.append("al.created_at <= %s")
        params.append(f"{date_to} 23:59:59")

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    async with conn.cursor() as cur:
        await cur.execute(f"SELECT COUNT(*) AS total FROM audit_logs al {where}", params)
        total_row = await cur.fetchone()
        total = total_row["total"] if total_row else 0

        offset = (page - 1) * limit
        await cur.execute(
            f"""SELECT al.id, al.user_id AS userId, u.name AS userName, al.action,
                       al.target_table AS targetTable, al.target_id AS targetId, al.detail,
                       al.ip_address AS ipAddress, al.created_at AS createdAt
                FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
                {where} ORDER BY al.created_at DESC LIMIT %s OFFSET %s""",
            (*params, limit, offset),
        )
        rows = await cur.fetchall()

    data = [{**r, "detail": _parse_detail(r["detail"])} for r in rows]
    return PageResult(data=data, total=total, page=page, limit=limit)
