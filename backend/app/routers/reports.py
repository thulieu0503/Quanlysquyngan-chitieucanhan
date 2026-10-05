import aiomysql
from fastapi import APIRouter, Depends, Request
from fastapi.responses import PlainTextResponse

from app.db import get_db
from app.deps import AuthUser, require_action
from app.errors import ApiError
from app.repositories import reports as reports_repo

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _parse_year_month(request: Request) -> tuple[int, int]:
    q = request.query_params
    try:
        year = int(q.get("year", ""))
    except ValueError:
        year = -1
    try:
        month = int(q.get("month", ""))
    except ValueError:
        month = -1

    if year < 2000 or year > 2100:
        raise ApiError(400, "INVALID_PARAM", "Tham số year không hợp lệ")
    if month < 1 or month > 12:
        raise ApiError(400, "INVALID_PARAM", "Tham số month phải từ 1 đến 12")
    return year, month


@router.get("/monthly")
async def monthly_report(
    request: Request,
    user: AuthUser = Depends(require_action("transactions.view_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    year, month = _parse_year_month(request)
    return await reports_repo.get_monthly_report(conn, user.id, year, month)


@router.get("/export")
async def export_report(
    request: Request,
    user: AuthUser = Depends(require_action("transactions.import_export")),
    conn: aiomysql.Connection = Depends(get_db),
):
    fmt = request.query_params.get("format", "csv")
    year, month = _parse_year_month(request)
    if fmt != "csv":
        raise ApiError(400, "UNSUPPORTED_FORMAT", "Hiện chỉ hỗ trợ format=csv")

    rows = await reports_repo.get_transactions_for_export(conn, user.id, year, month)

    lines = ["date,type,category,amount,note"]
    for r in rows:
        category = str(r["categoryName"]).replace('"', '""')
        note = f'"{str(r["note"]).replace(chr(34), chr(34) * 2)}"' if r["note"] else ""
        lines.append(f'{r["date"]},{r["type"]},"{category}",{r["amount"]},{note}')
    body = "\n".join(lines)

    month_str = f"{year}-{month:02d}"
    return PlainTextResponse(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="report_{month_str}.csv"'},
    )
