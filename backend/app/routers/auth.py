import logging

import aiomysql
from fastapi import APIRouter, Depends, Request, Response

from app.config import settings
from app.db import get_db, is_duplicate_entry, with_transaction
from app.errors import ApiError
from app.mail import build_reset_code_mail, send_mail
from app.otp import generate_otp, hash_otp, otp_matches
from app.repositories import password_resets as resets_repo
from app.repositories import users as users_repo
from app.schemas.auth import parse_forgot_input, parse_login_input, parse_register_input, parse_reset_input
from app.security import DUMMY_HASH, create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger("app.auth")


def _set_session_cookie(response: Response, user_id: int, role: str) -> None:
    token = create_access_token(user_id, role)
    response.set_cookie(
        key=settings.JWT_COOKIE_NAME,
        value=token,
        max_age=settings.JWT_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=settings.ENV == "production",
        path="/",
    )


@router.post("/register", status_code=201)
async def register(request: Request, response: Response, conn: aiomysql.Connection = Depends(get_db)):
    body = await request.json()
    value, fields = parse_register_input(body)
    if fields:
        raise ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    password_hash = hash_password(value["password"])
    try:
        user_id = await users_repo.create_user(conn, value["name"], value["email"], password_hash)
    except Exception as err:
        if is_duplicate_entry(err):
            raise ApiError(409, "EMAIL_TAKEN", "Email đã được đăng ký", {"email": "Email đã được đăng ký"})
        raise
    return {"data": {"id": user_id}}


@router.post("/login")
async def login(request: Request, response: Response, conn: aiomysql.Connection = Depends(get_db)):
    body = await request.json()
    value, fields = parse_login_input(body)
    if fields:
        raise ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    user = await users_repo.find_user_by_email(conn, value["email"])
    password_ok = verify_password(value["password"], user["password_hash"] if user else DUMMY_HASH)
    if not user or not password_ok or user["status"] != "active":
        raise ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng")

    _set_session_cookie(response, user["id"], user["role"])
    return {"data": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.JWT_COOKIE_NAME, path="/")
    return {"data": {"message": "Đã đăng xuất" }}


async def _issue_code(user_id: int) -> str:
    for _ in range(3):
        code = generate_otp()
        try:
            async with with_transaction() as conn:
                await resets_repo.invalidate_active_codes(conn, user_id)
                await resets_repo.create_reset_code(conn, user_id, hash_otp(user_id, code), settings.OTP_VALID_MINUTES)
            return code
        except Exception as err:
            if not is_duplicate_entry(err):
                raise
    raise RuntimeError("Không tạo được mã xác nhận")


@router.post("/forgot-password")
async def forgot_password(request: Request, conn: aiomysql.Connection = Depends(get_db)):
    body = await request.json()
    value, fields = parse_forgot_input(body)
    if fields:
        raise ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    user = await users_repo.find_user_by_email(conn, value["email"])

    if user and user["status"] == "active":
        since = await resets_repo.seconds_since_latest_code(conn, user["id"])
        if since is None or since >= settings.OTP_RESEND_SECONDS:
            code = await _issue_code(user["id"])
            subject, text, html = build_reset_code_mail(user["name"], code)
            try:
                await send_mail(user["email"], subject, text, html)
            except Exception:
                logger.exception("gửi email mã xác nhận thất bại")

    # Luôn trả cùng một kết quả dù email có tồn tại hay không (chống dò tài khoản).
    return {"data": {"message": "Nếu email đã đăng ký, chúng tôi đã gửi mã xác nhận gồm 6 chữ số."}}


def _invalid_code_error() -> ApiError:
    return ApiError(
        400,
        "INVALID_CODE",
        "Mã xác nhận không đúng hoặc đã hết hạn. Nếu đã nhập sai nhiều lần, hãy yêu cầu gửi mã mới.",
        {"code": "Mã xác nhận không đúng hoặc đã hết hạn"},
    )


@router.post("/reset-password")
async def reset_password(request: Request, conn: aiomysql.Connection = Depends(get_db)):
    body = await request.json()
    value, fields = parse_reset_input(body)
    if fields:
        raise ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    email, code, password = value["email"], value["code"], value["password"]
    user = await users_repo.find_user_by_email(conn, email)
    if not user or user["status"] != "active":
        raise _invalid_code_error()

    # Transaction chỉ ném lỗi khi có sự cố thật; nhập sai mã vẫn phải COMMIT để ghi nhận số lần thử.
    async with with_transaction() as tconn:
        active = await resets_repo.find_active_code(tconn, user["id"])
        if not active:
            outcome = "invalid"
        elif not otp_matches(user["id"], code, active["code_hash"]):
            await resets_repo.record_failed_attempt(tconn, active["id"])
            if active["attempts"] + 1 >= settings.OTP_MAX_ATTEMPTS:
                await resets_repo.mark_code_used(tconn, active["id"])
            outcome = "invalid"
        else:
            await users_repo.update_user_password(tconn, user["id"], hash_password(password))
            await resets_repo.mark_code_used(tconn, active["id"])
            outcome = "ok"

    if outcome != "ok":
        raise _invalid_code_error()
    return {"data": {"message": "Đặt lại mật khẩu thành công"}}
