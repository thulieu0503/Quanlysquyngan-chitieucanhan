from typing import Any

from app.schemas import as_record, compact


def validate_category_name(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return "Tên danh mục không được để trống"
    if len(value.strip()) > 100:
        return "Tên danh mục tối đa 100 ký tự"
    return None


def validate_category_type(value: Any) -> str | None:
    if value not in ("income", "expense"):
        return 'Loại phải là "income" hoặc "expense"'
    return None


def parse_category_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    errors = compact({"name": validate_category_name(b.get("name")), "type": validate_category_type(b.get("type"))})
    if errors:
        return None, errors
    return {"name": b["name"].strip(), "type": b["type"]}, None
