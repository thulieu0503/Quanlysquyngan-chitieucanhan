from typing import Any

from app.schemas import as_record, compact


def parse_profile_update_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    name = b.get("name").strip() if isinstance(b.get("name"), str) else ""
    errors = compact(
        {"name": "Họ và tên không được để trống" if not name else ("Họ và tên tối đa 100 ký tự" if len(name) > 100 else None)}
    )
    if errors:
        return None, errors
    return {"name": name}, None


def parse_password_change_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    old_password = b.get("oldPassword") if isinstance(b.get("oldPassword"), str) else ""
    new_password = b.get("newPassword") if isinstance(b.get("newPassword"), str) else ""

    new_password_error = None
    if not new_password:
        new_password_error = "Vui lòng nhập mật khẩu mới"
    elif len(new_password) < 8:
        new_password_error = "Mật khẩu mới tối thiểu 8 ký tự"
    elif len(new_password.encode("utf-8")) > 72:
        new_password_error = "Mật khẩu mới quá dài (tối đa 72 ký tự)"
    elif new_password == old_password:
        new_password_error = "Mật khẩu mới phải khác mật khẩu hiện tại"

    errors = compact(
        {
            "oldPassword": "Vui lòng nhập mật khẩu hiện tại" if not old_password else None,
            "newPassword": new_password_error,
        }
    )
    if errors:
        return None, errors
    return {"oldPassword": old_password, "newPassword": new_password}, None


def parse_user_status_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    status = b.get("status")
    if status not in ("active", "locked"):
        return None, {"status": 'Trạng thái phải là "active" hoặc "locked"'}
    return {"status": status}, None
