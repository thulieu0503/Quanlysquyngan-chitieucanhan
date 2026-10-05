from dataclasses import dataclass

import aiomysql
from fastapi import Depends, Request

from app.config import settings
from app.db import get_db
from app.errors import ApiError
from app.rbac import Action, Role, can
from app.repositories import users as users_repo
from app.security import decode_access_token


@dataclass
class AuthUser:
    id: int
    name: str
    email: str
    role: Role


# JWT vẫn hợp lệ sau khi Admin khóa tài khoản hoặc đổi vai trò, nên mỗi lần đều đọc lại
# trạng thái/vai trò từ DB thay vì tin vào nội dung token.
async def get_current_user(
    request: Request,
    conn: aiomysql.Connection = Depends(get_db),
) -> AuthUser | None:
    token = request.cookies.get(settings.JWT_COOKIE_NAME)
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user = await users_repo.find_user_by_id(conn, int(payload["sub"]))
    if not user or user["status"] != "active":
        return None

    return AuthUser(id=user["id"], name=user["name"], email=user["email"], role=user["role"])


def require_action(action: Action):
    async def _dependency(
        user: AuthUser | None = Depends(get_current_user),
    ) -> AuthUser:
        if user is None:
            raise ApiError(401, "UNAUTHENTICATED", "Bạn cần đăng nhập để thực hiện thao tác này")
        if not can(user.role, action):
            raise ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này")
        return user

    return _dependency


def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.headers.get("x-real-ip") or (request.client.host if request.client else None)
