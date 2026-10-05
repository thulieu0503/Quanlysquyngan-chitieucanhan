from contextlib import asynccontextmanager
from typing import AsyncIterator

import aiomysql

from app.config import settings

_pool: aiomysql.Pool | None = None


async def init_pool() -> None:
    global _pool
    _pool = await aiomysql.create_pool(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        db=settings.DB_NAME,
        charset="utf8mb4",
        cursorclass=aiomysql.cursors.DictCursor,
        autocommit=True,
        minsize=1,
        maxsize=10,
    )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        await _pool.wait_closed()
        _pool = None


def get_pool() -> aiomysql.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialized")
    return _pool


@asynccontextmanager
async def get_conn() -> AsyncIterator[aiomysql.Connection]:
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn


async def get_db() -> AsyncIterator[aiomysql.Connection]:
    """FastAPI dependency: acquire one pooled connection per request."""
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn


@asynccontextmanager
async def with_transaction() -> AsyncIterator[aiomysql.Connection]:
    """Mirrors lib/db.ts withTransaction(): begin/commit/rollback around a connection."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.begin()
        try:
            yield conn
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise


def is_duplicate_entry(err: Exception) -> bool:
    return isinstance(err, aiomysql.IntegrityError) and len(err.args) > 0 and err.args[0] == 1062
