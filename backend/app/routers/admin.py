import aiomysql
from fastapi import APIRouter, Depends, Request

from app.audit import insert_audit_log
from app.db import get_db, is_duplicate_entry, with_transaction
from app.deps import AuthUser, get_client_ip, require_action
from app.errors import ApiError
from app.repositories import audit_logs as audit_logs_repo
from app.repositories import categories as categories_repo
from app.repositories import reports as reports_repo
from app.repositories import users as users_repo
from app.schemas.category import parse_category_input
from app.schemas.user import parse_user_status_input

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _int_or_none(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _safe_user(user: dict) -> dict:
    return {k: v for k, v in user.items() if k != "password_hash"}


@router.get("/users")
async def list_users(
    request: Request,
    _user: AuthUser = Depends(require_action("users.view_list")),
    conn: aiomysql.Connection = Depends(get_db),
):
    q = request.query_params
    page = max(1, _int_or_none(q.get("page")) or 1)
    limit = min(100, max(1, _int_or_none(q.get("limit")) or 20))
    result = await users_repo.list_users(conn, q.get("search") or None, q.get("status") or None, page, limit)
    return result.to_dict()


@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    _user: AuthUser = Depends(require_action("users.view_profile")),
    conn: aiomysql.Connection = Depends(get_db),
):
    target = await users_repo.find_user_by_id(conn, user_id)
    if not target:
        raise ApiError(404, "NOT_FOUND", "Người dùng không tồn tại")
    return {"data": _safe_user(target)}


@router.patch("/users/{user_id}")
async def lock_unlock_user(
    user_id: int,
    request: Request,
    admin_user: AuthUser = Depends(require_action("users.lock_unlock")),
    conn: aiomysql.Connection = Depends(get_db),
):
    target = await users_repo.find_user_by_id(conn, user_id)
    if not target:
        raise ApiError(404, "NOT_FOUND", "Người dùng không tồn tại")
    if target["role"] == "admin":
        raise ApiError(403, "FORBIDDEN", "Không thể khóa tài khoản Admin")

    body = await request.json()
    value, fields = parse_user_status_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", 'status phải là "active" hoặc "locked"', fields)

    status = value["status"]
    await users_repo.update_user_status(conn, user_id, status)

    await insert_audit_log(
        conn,
        admin_user.id,
        "users.lock_unlock",
        "users",
        user_id,
        {"oldStatus": target["status"], "newStatus": status},
        get_client_ip(request),
    )
    return {"message": f"Tài khoản đã được {'mở khóa' if status == 'active' else 'khóa'}"}


@router.get("/categories")
async def list_default_categories(
    _user: AuthUser = Depends(require_action("categories.manage_default")),
    conn: aiomysql.Connection = Depends(get_db),
):
    return await categories_repo.list_default_categories(conn)


@router.post("/categories", status_code=201)
async def create_default_category(
    request: Request,
    user: AuthUser = Depends(require_action("categories.manage_default")),
    conn: aiomysql.Connection = Depends(get_db),
):
    body = await request.json()
    value, fields = parse_category_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    try:
        category_id = await categories_repo.create_default_category(conn, value["name"], value["type"])
    except Exception as err:
        if is_duplicate_entry(err):
            raise ApiError(409, "DUPLICATE", "Danh mục mặc định với tên và loại này đã tồn tại", {"name": "Tên đã tồn tại"})
        raise

    await insert_audit_log(
        conn,
        user.id,
        "categories.create_default",
        "categories",
        category_id,
        {"name": value["name"], "type": value["type"]},
        get_client_ip(request),
    )
    return {"id": category_id}


async def _get_default_category_or_404(conn: aiomysql.Connection, category_id: int) -> dict:
    category = await categories_repo.find_category_by_id(conn, category_id)
    if not category or category["userId"] is not None:
        raise ApiError(404, "NOT_FOUND", "Danh mục mặc định không tồn tại")
    return category


@router.put("/categories/{category_id}")
async def update_default_category(
    category_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("categories.manage_default")),
    conn: aiomysql.Connection = Depends(get_db),
):
    await _get_default_category_or_404(conn, category_id)

    body = await request.json()
    value, fields = parse_category_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    try:
        async with with_transaction() as tconn:
            await categories_repo.update_category(tconn, category_id, value["name"], value["type"])
    except Exception as err:
        if is_duplicate_entry(err):
            raise ApiError(409, "DUPLICATE", "Danh mục với tên và loại này đã tồn tại", {"name": "Tên đã tồn tại"})
        raise

    await insert_audit_log(conn, user.id, "categories.update_default", "categories", category_id, None, get_client_ip(request))
    return {"message": "Cập nhật thành công"}


@router.delete("/categories/{category_id}")
async def delete_default_category(
    category_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("categories.manage_default")),
    conn: aiomysql.Connection = Depends(get_db),
):
    await _get_default_category_or_404(conn, category_id)
    await categories_repo.soft_delete_category(conn, category_id)
    await insert_audit_log(conn, user.id, "categories.delete_default", "categories", category_id, None, get_client_ip(request))
    return {"message": "Xóa thành công"}


@router.get("/stats")
async def get_stats(
    _user: AuthUser = Depends(require_action("stats.view_system")),
    conn: aiomysql.Connection = Depends(get_db),
):
    return await reports_repo.get_system_stats(conn)


@router.get("/audit-logs")
async def list_audit_logs(
    request: Request,
    _user: AuthUser = Depends(require_action("audit_logs.view")),
    conn: aiomysql.Connection = Depends(get_db),
):
    q = request.query_params
    page = max(1, _int_or_none(q.get("page")) or 1)
    limit = min(100, max(1, _int_or_none(q.get("limit")) or 50))
    result = await audit_logs_repo.list_audit_logs(
        conn,
        _int_or_none(q.get("userId")),
        q.get("action") or None,
        q.get("targetTable") or None,
        q.get("dateFrom") or None,
        q.get("dateTo") or None,
        page,
        limit,
    )
    return result.to_dict()
