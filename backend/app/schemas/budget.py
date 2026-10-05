import re
from datetime import date
from typing import Any

from app.schemas import as_record, compact

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _is_real_date(value: str) -> bool:
    try:
        y, m, d = (int(p) for p in value.split("-"))
        date(y, m, d)
        return True
    except ValueError:
        return False


def _validate_date(value: Any, label: str) -> str | None:
    if not isinstance(value, str) or not DATE_RE.match(value):
        return f"{label} không hợp lệ (YYYY-MM-DD)"
    if not _is_real_date(value):
        return f"{label} không tồn tại"
    return None


def _validate_amount_limit(value: Any) -> str | None:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return "Hạn mức phải lớn hơn 0"
    if n <= 0:
        return "Hạn mức phải lớn hơn 0"
    return None


def _validate_period(period_start: Any, period_end: Any) -> str | None:
    if (
        _validate_date(period_start, "Ngày bắt đầu") is None
        and _validate_date(period_end, "Ngày kết thúc") is None
        and period_end < period_start
    ):
        return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu"
    return None


def parse_budget_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    category_id = b.get("categoryId")
    period_start = b.get("periodStart")
    period_end = b.get("periodEnd")

    try:
        category_id_num = float(category_id)
        category_id_error = None if category_id_num.is_integer() and category_id_num > 0 else "category_id không hợp lệ"
    except (TypeError, ValueError):
        category_id_error = "category_id không hợp lệ"

    errors = compact(
        {
            "categoryId": category_id_error,
            "amountLimit": _validate_amount_limit(b.get("amountLimit")),
            "periodStart": _validate_date(period_start, "Ngày bắt đầu"),
            "periodEnd": _validate_date(period_end, "Ngày kết thúc"),
            "period": _validate_period(period_start, period_end),
        }
    )
    if errors:
        return None, errors
    return {
        "categoryId": int(category_id_num),
        "amountLimit": float(b["amountLimit"]),
        "periodStart": period_start,
        "periodEnd": period_end,
    }, None


def parse_budget_update_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    period_start = b.get("periodStart")
    period_end = b.get("periodEnd")

    errors = compact(
        {
            "amountLimit": _validate_amount_limit(b.get("amountLimit")),
            "periodStart": _validate_date(period_start, "Ngày bắt đầu"),
            "periodEnd": _validate_date(period_end, "Ngày kết thúc"),
            "period": _validate_period(period_start, period_end),
        }
    )
    if errors:
        return None, errors
    return {"amountLimit": float(b["amountLimit"]), "periodStart": period_start, "periodEnd": period_end}, None
