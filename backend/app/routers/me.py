import aiomysql
from fastapi import APIRouter, Depends, Request

from app.audit import insert_audit_log
from app.db import get_db, with_transaction
from app.deps import AuthUser, get_client_ip, require_action
from app.errors import ApiError
from app.repositories import users as users_repo
from app.schemas.user import parse_password_change_input, parse_profile_update_input
from app.security import verify_password, hash_password

router = APIRouter(prefix="/api/me", tags=["me"])


@router.get("")
async def get_me(user: AuthUser = Depends(require_action("transactions.view_own"))):
    return {"data": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}


@router.patch("")
async def update_me(
    request: Request,
    user: AuthUser = Depends(require_action("transactions.view_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    body = await request.json()
    value, fields = parse_profile_update_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    await users_repo.update_user_name(conn, user.id, value["name"])
    return {"message": "Cập nhật thành công"}


@router.put("/password")
async def change_password(
    request: Request,
    user: AuthUser = Depends(require_action("transactions.view_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    body = await request.json()
    value, fields = parse_password_change_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    db_user = await users_repo.find_user_by_id(conn, user.id)
    if not db_user:
        raise ApiError(401, "UNAUTHENTICATED", "Tài khoản không tồn tại")

    if not verify_password(value["oldPassword"], db_user["password_hash"]):
        raise ApiError(400, "INVALID_PASSWORD", "Mật khẩu hiện tại không đúng", {"oldPassword": "Mật khẩu không đúng"})

    new_hash = hash_password(value["newPassword"])
    async with with_transaction() as tconn:
        await users_repo.update_user_password(tconn, user.id, new_hash)

    await insert_audit_log(conn, user.id, "users.change_password", "users", user.id, None, get_client_ip(request))

    return {"message": "Đổi mật khẩu thành công"}
