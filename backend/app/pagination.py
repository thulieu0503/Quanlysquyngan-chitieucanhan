from dataclasses import dataclass
from typing import Any

import aiomysql


@dataclass
class PageResult:
    data: list[dict[str, Any]]
    total: int
    page: int
    limit: int

    @property
    def total_pages(self) -> int:
        return (self.total + self.limit - 1) // self.limit if self.limit else 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "data": self.data,
            "total": self.total,
            "page": self.page,
            "limit": self.limit,
            "totalPages": self.total_pages,
        }


async def paginate_query(
    conn: aiomysql.Connection,
    base_from: str,
    select_cols: str,
    order_by: str,
    params: list,
    page: int,
    limit: int,
) -> PageResult:
    """Shared {data,total,page,limit,totalPages} pagination, mirrors the shape every
    Next.js list endpoint returned (previously duplicated per route)."""
    async with conn.cursor() as cur:
        await cur.execute(f"SELECT COUNT(*) AS total {base_from}", params)
        total_row = await cur.fetchone()
        total = total_row["total"] if total_row else 0

        offset = (page - 1) * limit
        await cur.execute(
            f"SELECT {select_cols} {base_from} ORDER BY {order_by} LIMIT %s OFFSET %s",
            (*params, limit, offset),
        )
        rows = await cur.fetchall()

    return PageResult(data=list(rows), total=total, page=page, limit=limit)
