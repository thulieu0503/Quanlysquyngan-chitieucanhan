import aiomysql
from fastapi import APIRouter, Depends, Request

from app.audit import insert_audit_log
from app.db import get_db, is_duplicate_entry, with_transaction
from app.deps import AuthUser, get_client_ip, require_action
from app.errors import ApiError
from app.repositories import categories as categories_repo
from app.schemas.category import parse_category_input

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
async def list_categories(
    user: AuthUser = Depends(require_action("categories.view_default")),
    conn: aiomysql.Connection = Depends(get_db),
):
    return await categories_repo.list_categories_for_user(conn, user.id)


@router.post("", status_code=201)
async def create_category(
    request: Request,
    user: AuthUser = Depends(require_action("categories.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    body = await request.json()
    value, fields = parse_category_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    try:
        category_id = await categories_repo.create_category(conn, user.id, value["name"], value["type"])
    except Exception as err:
        if is_duplicate_entry(err):
            raise ApiError(409, "DUPLICATE", "Danh mục với tên và loại này đã tồn tại", {"name": "Tên đã tồn tại"})
        raise

    await insert_audit_log(conn, user.id, "categories.create", "categories", category_id, None, get_client_ip(request))
    return {"id": category_id}


async def _get_own_category_or_404(conn: aiomysql.Connection, category_id: int, user_id: int) -> dict:
    category = await categories_repo.find_category_by_id(conn, category_id)
    if not category or category["userId"] != user_id:
        raise ApiError(404, "NOT_FOUND", "Danh mục không tồn tại hoặc không thuộc về bạn")
    return category


@router.put("/{category_id}")
async def update_category(
    category_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("categories.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    await _get_own_category_or_404(conn, category_id, user.id)

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

    await insert_audit_log(conn, user.id, "categories.update", "categories", category_id, None, get_client_ip(request))
    return {"message": "Cập nhật thành công"}


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("categories.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    await _get_own_category_or_404(conn, category_id, user.id)
    await categories_repo.soft_delete_category(conn, category_id)
    await insert_audit_log(conn, user.id, "categories.delete", "categories", category_id, None, get_client_ip(request))
    return {"message": "Xóa thành công"}
