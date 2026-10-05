import logging

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.errors")


class ApiError(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        fields: dict[str, str | None] | None = None,
    ):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.fields = fields


def _error_body(code: str, message: str, fields: dict[str, str | None] | None = None) -> dict:
    body: dict = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    return body


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content=_error_body(exc.code, exc.message, exc.fields))


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error")
    return JSONResponse(status_code=500, content=_error_body("INTERNAL_ERROR", "Đã xảy ra lỗi, vui lòng thử lại sau"))
