import logging
import sys
from contextlib import asynccontextmanager

# Console mặc định trên Windows dùng codepage (vd. cp1258), không phải UTF-8, nên log tiếng Việt
# (có dấu) sẽ crash bằng UnicodeEncodeError nếu không ép lại encoding trước khi logging khởi tạo.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import close_pool, init_pool
from app.errors import ApiError, api_error_handler, unhandled_error_handler
from app.routers import admin, auth, budgets, categories, dashboard, health, me, reminders, reports, transactions


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="Quản lý Thu Chi Cá Nhân - API", lifespan=lifespan)

# NFR-05: chỉ cho phép origin của chính ứng dụng frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(ApiError, api_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(budgets.router)
app.include_router(reminders.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
