import re
from typing import Any

from app.schemas import as_record, compact

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RECURRENCES = ("daily", "weekly", "monthly", "yearly")
CHANNELS = ("email", "in_app", "both")


def parse_reminder_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)

    title = b.get("title").strip() if isinstance(b.get("title"), str) else ""
    recurrence = b.get("recurrence")
    channel = b.get("channel")
    next_run_date = b.get("nextRunDate")
    raw_category_id = b.get("categoryId")
    raw_amount = b.get("amount")
    category_id = None if raw_category_id in (None,) else raw_category_id
    amount = None if raw_amount in (None,) else raw_amount
    is_active = b.get("isActive") is not False

    category_id_error = None
    if category_id is not None:
        try:
            n = float(category_id)
            if not n.is_integer() or n <= 0:
                category_id_error = "category_id không hợp lệ"
        except (TypeError, ValueError):
            category_id_error = "category_id không hợp lệ"

    amount_error = None
    if amount is not None:
        try:
            n = float(amount)
            if n <= 0:
                amount_error = "Số tiền phải lớn hơn 0"
        except (TypeError, ValueError):
            amount_error = "Số tiền phải lớn hơn 0"

    errors = compact(
        {
            "title": "Tiêu đề không được để trống"
            if not title
            else ("Tiêu đề tối đa 150 ký tự" if len(title) > 150 else None),
            "recurrence": None if recurrence in RECURRENCES else "Tần suất không hợp lệ (daily/weekly/monthly/yearly)",
            "channel": None if channel in CHANNELS else "Kênh thông báo không hợp lệ (email/in_app/both)",
            "nextRunDate": None
            if isinstance(next_run_date, str) and DATE_RE.match(next_run_date)
            else "Ngày nhắc nhở không hợp lệ (YYYY-MM-DD)",
            "categoryId": category_id_error,
            "amount": amount_error,
        }
    )
    if errors:
        return None, errors
    return {
        "categoryId": int(float(category_id)) if category_id is not None else None,
        "title": title,
        "amount": float(amount) if amount is not None else None,
        "recurrence": recurrence,
        "nextRunDate": next_run_date,
        "channel": channel,
        "isActive": is_active,
    }, None
