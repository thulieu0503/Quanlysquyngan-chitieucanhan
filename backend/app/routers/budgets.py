import aiomysql
from fastapi import APIRouter, Depends, Request

from app.audit import insert_audit_log
from app.db import get_db, is_duplicate_entry
from app.deps import AuthUser, get_client_ip, require_action
from app.errors import ApiError
from app.repositories import budgets as budgets_repo
from app.repositories import categories as categories_repo
from app.schemas.budget import parse_budget_input, parse_budget_update_input

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("")
async def list_budgets(
    user: AuthUser = Depends(require_action("budgets.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    return await budgets_repo.list_budgets_with_usage(conn, user.id)


@router.post("", status_code=201)
async def create_budget(
    request: Request,
    user: AuthUser = Depends(require_action("budgets.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    body = await request.json()
    value, fields = parse_budget_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    category = await categories_repo.find_category_by_id(conn, value["categoryId"])
    if not category or not categories_repo.category_is_usable_by(category, user.id):
        raise ApiError(404, "NOT_FOUND", "Danh mục không tồn tại")

    try:
        budget_id = await budgets_repo.create_budget(
            conn, user.id, value["categoryId"], value["amountLimit"], value["periodStart"], value["periodEnd"]
        )
    except Exception as err:
        if is_duplicate_entry(err):
            raise ApiError(409, "DUPLICATE", "Ngân sách cho danh mục và kỳ này đã tồn tại")
        raise

    await insert_audit_log(
        conn,
        user.id,
        "budgets.create",
        "budgets",
        budget_id,
        {
            "categoryId": value["categoryId"],
            "amountLimit": value["amountLimit"],
            "periodStart": value["periodStart"],
            "periodEnd": value["periodEnd"],
        },
        get_client_ip(request),
    )
    return {"id": budget_id}


@router.get("/{budget_id}")
async def get_budget(
    budget_id: int,
    user: AuthUser = Depends(require_action("budgets.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    budget = await budgets_repo.find_budget_by_id(conn, budget_id, user.id)
    if not budget:
        raise ApiError(404, "NOT_FOUND", "Ngân sách không tồn tại")
    return {"data": budget}


@router.put("/{budget_id}")
async def update_budget(
    budget_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("budgets.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    existing = await budgets_repo.find_budget_by_id(conn, budget_id, user.id)
    if not existing:
        raise ApiError(404, "NOT_FOUND", "Ngân sách không tồn tại")

    body = await request.json()
    value, fields = parse_budget_update_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    ok = await budgets_repo.update_budget(conn, budget_id, user.id, value["amountLimit"], value["periodStart"], value["periodEnd"])
    if not ok:
        raise ApiError(404, "NOT_FOUND", "Ngân sách không tồn tại")

    await insert_audit_log(conn, user.id, "budgets.update", "budgets", budget_id, None, get_client_ip(request))
    return {"message": "Cập nhật thành công"}


@router.delete("/{budget_id}")
async def delete_budget(
    budget_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("budgets.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    ok = await budgets_repo.delete_budget(conn, budget_id, user.id)
    if not ok:
        raise ApiError(404, "NOT_FOUND", "Ngân sách không tồn tại")

    await insert_audit_log(conn, user.id, "budgets.delete", "budgets", budget_id, None, get_client_ip(request))
    return {"message": "Xóa thành công"}
