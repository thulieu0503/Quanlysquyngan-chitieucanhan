import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { listReminders, createReminder } from "@/lib/repositories/reminders";
import { parseReminderInput } from "@/lib/validators/reminder";
import { insertAuditLog } from "@/lib/repositories/audit-logs";

export const GET = withAuth("reminders.manage_own", async (_req, _ctx, user) => {
  const reminders = await listReminders(user.id);
  return NextResponse.json(reminders);
});

export const POST = withAuth("reminders.manage_own", async (req, _ctx, user) => {
  const body = await readJson(req);
  const parsed = parseReminderInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const id = await createReminder({ userId: user.id, ...parsed.value });

  await insertAuditLog({
    userId: user.id,
    action: "reminders.create",
    targetTable: "reminders",
    targetId: id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ id }, { status: 201 });
});
