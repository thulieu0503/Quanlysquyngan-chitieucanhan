import re
from datetime import date
from typing import Any

from app.schemas import as_record, compact

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_AMOUNT = 99_999_999_999.99


def _is_real_date(value: str) -> bool:
    try:
        y, m, d = (int(p) for p in value.split("-"))
        date(y, m, d)
        return True
    except ValueError:
        return False


def validate_category_id(value: Any) -> str | None:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return "category_id không hợp lệ"
    if not n.is_integer() or n <= 0:
        return "category_id không hợp lệ"
    return None


def validate_transaction_type(value: Any) -> str | None:
    if value not in ("income", "expense"):
        return 'Loại phải là "income" hoặc "expense"'
    return None


def validate_amount(value: Any) -> str | None:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return "Số tiền phải lớn hơn 0"
    if n <= 0:
        return "Số tiền phải lớn hơn 0"
    if n > MAX_AMOUNT:
        return "Số tiền vượt quá giới hạn"
    return None


def validate_transaction_date(value: Any) -> str | None:
    if not isinstance(value, str) or not DATE_RE.match(value):
        return "Ngày giao dịch không hợp lệ (YYYY-MM-DD)"
    if not _is_real_date(value):
        return "Ngày giao dịch không tồn tại"
    return None


def validate_note(value: Any) -> str | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        return "Ghi chú không hợp lệ"
    if len(value) > 255:
        return "Ghi chú tối đa 255 ký tự"
    return None


def parse_transaction_input(body: Any) -> tuple[dict | None, dict | None]:
    b = as_record(body)
    errors = compact(
        {
            "categoryId": validate_category_id(b.get("categoryId")),
            "type": validate_transaction_type(b.get("type")),
            "amount": validate_amount(b.get("amount")),
            "transactionDate": validate_transaction_date(b.get("transactionDate")),
            "note": validate_note(b.get("note")),
        }
    )
    if errors:
        return None, errors
    note = b.get("note")
    return {
        "categoryId": int(float(b["categoryId"])),
        "type": b["type"],
        "amount": float(b["amount"]),
        "transactionDate": b["transactionDate"],
        "note": note if isinstance(note, str) and note else None,
    }, None
