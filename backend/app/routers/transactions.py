import csv
from datetime import datetime, timezone

import aiomysql
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, PlainTextResponse

from app.audit import insert_audit_log
from app.db import get_db
from app.deps import AuthUser, get_client_ip, require_action
from app.errors import ApiError
from app.repositories import categories as categories_repo
from app.repositories import transactions as tx_repo
from app.schemas.transaction import parse_transaction_input

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _int_or_none(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


@router.get("")
async def list_transactions(
    request: Request,
    user: AuthUser = Depends(require_action("transactions.view_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    q = request.query_params
    page = max(1, _int_or_none(q.get("page")) or 1)
    limit = min(100, max(1, _int_or_none(q.get("limit")) or 20))
    filter_ = {
        "type": q.get("type") or None,
        "categoryId": _int_or_none(q.get("categoryId")),
        "dateFrom": q.get("dateFrom") or None,
        "dateTo": q.get("dateTo") or None,
        "search": q.get("search") or None,
        "sortBy": q.get("sortBy") or "transaction_date",
        "sortOrder": q.get("sortOrder") or "desc",
        "page": page,
        "limit": limit,
    }
    result = await tx_repo.list_transactions(conn, user.id, filter_)
    return result.to_dict()


@router.post("", status_code=201)
async def create_transaction(
    request: Request,
    user: AuthUser = Depends(require_action("transactions.create")),
    conn: aiomysql.Connection = Depends(get_db),
):
    body = await request.json()
    value, fields = parse_transaction_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    category = await categories_repo.find_category_by_id(conn, value["categoryId"])
    if not category or not categories_repo.category_is_usable_by(category, user.id):
        raise ApiError(404, "NOT_FOUND", "Danh mục không tồn tại")
    if category["type"] != value["type"]:
        raise ApiError(
            422, "VALIDATION_ERROR", "Loại giao dịch không khớp với loại danh mục", {"type": "Loại giao dịch không khớp danh mục"}
        )

    tx_id = await tx_repo.create_transaction(
        conn, user.id, value["categoryId"], value["type"], value["amount"], value["transactionDate"], value["note"]
    )

    await insert_audit_log(
        conn,
        user.id,
        "transactions.create",
        "transactions",
        tx_id,
        {"amount": value["amount"], "type": value["type"], "categoryId": value["categoryId"]},
        get_client_ip(request),
    )
    return {"id": tx_id}


@router.post("/import", status_code=201)
async def import_transactions(
    request: Request,
    user: AuthUser = Depends(require_action("transactions.import_export")),
    conn: aiomysql.Connection = Depends(get_db),
):
    raw = (await request.body()).decode("utf-8")
    if not raw.strip():
        raise ApiError(400, "EMPTY_BODY", "File CSV trống")

    lines = [ln.strip() for ln in raw.split("\n") if ln.strip()]
    if len(lines) < 2:
        raise ApiError(400, "INVALID_CSV", "CSV phải có header và ít nhất 1 dòng dữ liệu")

    header = lines[0].lower()
    for h in ("date", "type", "category", "amount"):
        if h not in header:
            raise ApiError(400, "INVALID_CSV", f'CSV thiếu cột "{h}". Header cần: date,type,category,amount,note')

    cols = [c.strip().lower() for c in next(csv.reader([lines[0]]))]
    idx = {
        "date": cols.index("date") if "date" in cols else -1,
        "type": cols.index("type") if "type" in cols else -1,
        "category": cols.index("category") if "category" in cols else -1,
        "amount": cols.index("amount") if "amount" in cols else -1,
        "note": cols.index("note") if "note" in cols else -1,
    }

    categories = await categories_repo.list_categories_for_user(conn, user.id)
    cat_map = {f"{c['name'].lower()}:{c['type']}": c["id"] for c in categories}

    rows: list[dict] = []
    errors: list[str] = []

    for i in range(1, len(lines)):
        parts = [p.strip() for p in next(csv.reader([lines[i]]))]

        def col(key: str) -> str:
            j = idx[key]
            return parts[j] if 0 <= j < len(parts) else ""

        date_ = col("date")
        type_ = col("type").lower()
        category_name = col("category").lower()
        amount_str = col("amount")
        note = col("note") if idx["note"] >= 0 else ""

        if not date_ or not type_ or not category_name or not amount_str:
            errors.append(f"Dòng {i + 1}: thiếu dữ liệu bắt buộc")
            continue
        if type_ not in ("income", "expense"):
            errors.append(f"Dòng {i + 1}: type phải là income hoặc expense")
            continue
        try:
            amount = float(amount_str)
        except ValueError:
            amount = float("nan")
        if amount != amount or amount <= 0:  # NaN check
            errors.append(f"Dòng {i + 1}: amount phải là số dương")
            continue
        category_id = cat_map.get(f"{category_name}:{type_}")
        if not category_id:
            errors.append(f'Dòng {i + 1}: không tìm thấy danh mục "{col("category")}" ({type_})')
            continue
        rows.append(
            {"categoryId": category_id, "type": type_, "amount": amount, "transactionDate": date_, "note": note or None}
        )

    if errors and not rows:
        raise ApiError(422, "IMPORT_FAILED", f"Import thất bại: {'; '.join(errors[:5])}")

    inserted = await tx_repo.bulk_create_transactions(conn, user.id, rows) if rows else 0

    await insert_audit_log(
        conn, user.id, "transactions.import", "transactions", None, {"inserted": inserted, "errors": len(errors)}, get_client_ip(request)
    )

    return JSONResponse(
        content={"inserted": inserted, "skipped": len(errors), "errors": errors[:20]},
        status_code=201 if inserted > 0 else 422,
    )


@router.get("/export")
async def export_transactions(
    request: Request,
    user: AuthUser = Depends(require_action("transactions.import_export")),
    conn: aiomysql.Connection = Depends(get_db),
):
    q = request.query_params
    filter_ = {
        "type": q.get("type") or None,
        "categoryId": _int_or_none(q.get("categoryId")),
        "dateFrom": q.get("dateFrom") or None,
        "dateTo": q.get("dateTo") or None,
    }
    rows = await tx_repo.export_transactions(conn, user.id, filter_)

    lines = ["date,type,category,amount,note"]
    for r in rows:
        category = str(r["categoryName"]).replace('"', '""')
        note = f'"{str(r["note"]).replace(chr(34), chr(34) * 2)}"' if r["note"] else ""
        lines.append(f'{r["transactionDate"]},{r["type"]},"{category}",{r["amount"]},{note}')
    body = "\n".join(lines)

    filename = f"transactions_{datetime.now(timezone.utc).date().isoformat()}.csv"
    return PlainTextResponse(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{tx_id}")
async def get_transaction(
    tx_id: int,
    user: AuthUser = Depends(require_action("transactions.view_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    tx = await tx_repo.find_transaction_by_id(conn, tx_id, user.id)
    if not tx:
        raise ApiError(404, "NOT_FOUND", "Giao dịch không tồn tại")
    return {"data": tx}


@router.put("/{tx_id}")
async def update_transaction(
    tx_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("transactions.update_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    existing = await tx_repo.find_transaction_by_id(conn, tx_id, user.id)
    if not existing:
        raise ApiError(404, "NOT_FOUND", "Giao dịch không tồn tại")

    body = await request.json()
    value, fields = parse_transaction_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    category = await categories_repo.find_category_by_id(conn, value["categoryId"])
    if not category or not categories_repo.category_is_usable_by(category, user.id):
        raise ApiError(404, "NOT_FOUND", "Danh mục không tồn tại")
    if category["type"] != value["type"]:
        raise ApiError(
            422, "VALIDATION_ERROR", "Loại giao dịch không khớp với loại danh mục", {"type": "Loại giao dịch không khớp danh mục"}
        )

    ok = await tx_repo.update_transaction(
        conn, tx_id, user.id, value["categoryId"], value["type"], value["amount"], value["transactionDate"], value["note"]
    )
    if not ok:
        raise ApiError(404, "NOT_FOUND", "Giao dịch không tồn tại")

    await insert_audit_log(
        conn,
        user.id,
        "transactions.update",
        "transactions",
        tx_id,
        {
            "old": {"amount": existing["amount"], "type": existing["type"]},
            "new": {"amount": value["amount"], "type": value["type"]},
        },
        get_client_ip(request),
    )
    return {"message": "Cập nhật thành công"}


@router.delete("/{tx_id}")
async def delete_transaction(
    tx_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("transactions.delete_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    ok = await tx_repo.soft_delete_transaction(conn, tx_id, user.id)
    if not ok:
        raise ApiError(404, "NOT_FOUND", "Giao dịch không tồn tại")

    await insert_audit_log(conn, user.id, "transactions.delete", "transactions", tx_id, None, get_client_ip(request))
    return {"message": "Xóa thành công"}
