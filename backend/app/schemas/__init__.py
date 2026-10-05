from typing import Any


def compact(fields: dict[str, str | None]) -> dict[str, str] | None:
    result = {k: v for k, v in fields.items() if v}
    return result or None


def as_record(body: Any) -> dict[str, Any]:
    return body if isinstance(body, dict) else {}
