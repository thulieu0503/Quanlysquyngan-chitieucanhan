import aiomysql
from fastapi import APIRouter, Depends, Request

from app.audit import insert_audit_log
from app.db import get_db
from app.deps import AuthUser, get_client_ip, require_action
from app.errors import ApiError
from app.repositories import reminders as reminders_repo
from app.schemas.reminder import parse_reminder_input

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.get("")
async def list_reminders(
    user: AuthUser = Depends(require_action("reminders.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    return await reminders_repo.list_reminders(conn, user.id)


@router.post("", status_code=201)
async def create_reminder(
    request: Request,
    user: AuthUser = Depends(require_action("reminders.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    body = await request.json()
    value, fields = parse_reminder_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    reminder_id = await reminders_repo.create_reminder(
        conn,
        user.id,
        value["categoryId"],
        value["title"],
        value["amount"],
        value["recurrence"],
        value["nextRunDate"],
        value["channel"],
    )
    await insert_audit_log(conn, user.id, "reminders.create", "reminders", reminder_id, None, get_client_ip(request))
    return {"id": reminder_id}


@router.get("/{reminder_id}")
async def get_reminder(
    reminder_id: int,
    user: AuthUser = Depends(require_action("reminders.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    reminder = await reminders_repo.find_reminder_by_id(conn, reminder_id, user.id)
    if not reminder:
        raise ApiError(404, "NOT_FOUND", "Nhắc nhở không tồn tại")
    return {"data": reminder}


@router.put("/{reminder_id}")
async def update_reminder(
    reminder_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("reminders.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    existing = await reminders_repo.find_reminder_by_id(conn, reminder_id, user.id)
    if not existing:
        raise ApiError(404, "NOT_FOUND", "Nhắc nhở không tồn tại")

    body = await request.json()
    value, fields = parse_reminder_input(body)
    if fields:
        raise ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields)

    ok = await reminders_repo.update_reminder(
        conn,
        reminder_id,
        user.id,
        value["categoryId"],
        value["title"],
        value["amount"],
        value["recurrence"],
        value["nextRunDate"],
        value["channel"],
        value["isActive"],
    )
    if not ok:
        raise ApiError(404, "NOT_FOUND", "Nhắc nhở không tồn tại")

    await insert_audit_log(conn, user.id, "reminders.update", "reminders", reminder_id, None, get_client_ip(request))
    return {"message": "Cập nhật thành công"}


@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: int,
    request: Request,
    user: AuthUser = Depends(require_action("reminders.manage_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    ok = await reminders_repo.delete_reminder(conn, reminder_id, user.id)
    if not ok:
        raise ApiError(404, "NOT_FOUND", "Nhắc nhở không tồn tại")

    await insert_audit_log(conn, user.id, "reminders.delete", "reminders", reminder_id, None, get_client_ip(request))
    return {"message": "Xóa thành công"}
