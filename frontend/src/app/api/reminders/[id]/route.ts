import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { findReminderById, updateReminder, deleteReminder } from "@/lib/repositories/reminders";
import { parseReminderInput } from "@/lib/validators/reminder";
import { insertAuditLog } from "@/lib/repositories/audit-logs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth("reminders.manage_own", async (_req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const reminder = await findReminderById(parseInt(id, 10), user.id);
  if (!reminder) throw new ApiError(404, "NOT_FOUND", "Nhắc nhở không tồn tại");
  return NextResponse.json({ data: reminder });
});

export const PUT = withAuth("reminders.manage_own", async (req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const reminderId = parseInt(id, 10);

  const existing = await findReminderById(reminderId, user.id);
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Nhắc nhở không tồn tại");

  const body = await readJson(req);
  const parsed = parseReminderInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const ok = await updateReminder(reminderId, user.id, parsed.value);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Nhắc nhở không tồn tại");

  await insertAuditLog({
    userId: user.id,
    action: "reminders.update",
    targetTable: "reminders",
    targetId: reminderId,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Cập nhật thành công" });
});

export const DELETE = withAuth("reminders.manage_own", async (req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const reminderId = parseInt(id, 10);

  const ok = await deleteReminder(reminderId, user.id);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Nhắc nhở không tồn tại");

  await insertAuditLog({
    userId: user.id,
    action: "reminders.delete",
    targetTable: "reminders",
    targetId: reminderId,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Xóa thành công" });
});
