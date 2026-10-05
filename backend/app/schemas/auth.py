import re
from typing import Any

from app.schemas import as_record, compact

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
CODE_RE = re.compile(r"^\d{6}$")

LIMITS = {"name": 100, "email": 150, "password_min": 8, "password_max_bytes": 72}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> str | None:
    if not email.strip():
        return "Vui lòng nhập email"
    if len(email.strip()) > LIMITS["email"]:
        return f"Email tối đa {LIMITS['email']} ký tự"
    if not EMAIL_RE.match(email.strip()):
        return "Email không hợp lệ"
    return None


def validate_password(password: str) -> str | None:
    if not password:
        return "Vui lòng nhập mật khẩu"
    if len(password) < LIMITS["password_min"]:
        return f"Mật khẩu tối thiểu {LIMITS['password_min']} ký tự"
    if len(password.encode("utf-8")) > LIMITS["password_max_bytes"]:
        return "Mật khẩu quá dài (tối đa 72 ký tự)"
    return None


def validate_name(name: str) -> str | None:
    if not name.strip():
        return "Vui lòng nhập họ và tên"
    if len(name.strip()) > LIMITS["name"]:
        return f"Họ và tên tối đa {LIMITS['name']} ký tự"
    return None


def validate_code(code: str) -> str | None:
    if not code:
        return "Vui lòng nhập mã xác nhận"
    if not CODE_RE.match(code):
        return "Mã xác nhận gồm 6 chữ số"
    return None


def parse_register_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    name = b.get("name") if isinstance(b.get("name"), str) else ""
    email = b.get("email") if isinstance(b.get("email"), str) else ""
    password = b.get("password") if isinstance(b.get("password"), str) else ""
    errors = compact({"name": validate_name(name), "email": validate_email(email), "password": validate_password(password)})
    if errors:
        return None, errors
    return {"name": name.strip(), "email": normalize_email(email), "password": password}, None


def parse_forgot_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    email = b.get("email") if isinstance(b.get("email"), str) else ""
    errors = compact({"email": validate_email(email)})
    if errors:
        return None, errors
    return {"email": normalize_email(email)}, None


def parse_reset_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    email = b.get("email") if isinstance(b.get("email"), str) else ""
    code = b.get("code") if isinstance(b.get("code"), str) else ""
    password = b.get("password") if isinstance(b.get("password"), str) else ""
    errors = compact(
        {"email": validate_email(email), "code": validate_code(code), "password": validate_password(password)}
    )
    if errors:
        return None, errors
    return {"email": normalize_email(email), "code": code, "password": password}, None


def parse_login_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    email = b.get("email") if isinstance(b.get("email"), str) else ""
    password = b.get("password") if isinstance(b.get("password"), str) else ""
    errors = compact(
        {
            "email": "Vui lòng nhập email" if not email.strip() else None,
            "password": "Vui lòng nhập mật khẩu" if not password else None,
        }
    )
    if errors:
        return None, errors
    return {"email": normalize_email(email), "password": password}, None
