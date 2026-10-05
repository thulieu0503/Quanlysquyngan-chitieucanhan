import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { findBudgetById, updateBudget, deleteBudget } from "@/lib/repositories/budgets";
import { parseBudgetUpdateInput } from "@/lib/validators/budget";
import { insertAuditLog } from "@/lib/repositories/audit-logs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth("budgets.manage_own", async (_req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const budget = await findBudgetById(parseInt(id, 10), user.id);
  if (!budget) throw new ApiError(404, "NOT_FOUND", "Ngân sách không tồn tại");
  return NextResponse.json({ data: budget });
});

export const PUT = withAuth("budgets.manage_own", async (req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const budgetId = parseInt(id, 10);

  const existing = await findBudgetById(budgetId, user.id);
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Ngân sách không tồn tại");

  const body = await readJson(req);
  const parsed = parseBudgetUpdateInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const ok = await updateBudget(budgetId, user.id, parsed.value);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Ngân sách không tồn tại");

  await insertAuditLog({
    userId: user.id,
    action: "budgets.update",
    targetTable: "budgets",
    targetId: budgetId,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Cập nhật thành công" });
});

export const DELETE = withAuth("budgets.manage_own", async (req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const budgetId = parseInt(id, 10);

  const ok = await deleteBudget(budgetId, user.id);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Ngân sách không tồn tại");

  await insertAuditLog({
    userId: user.id,
    action: "budgets.delete",
    targetTable: "budgets",
    targetId: budgetId,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Xóa thành công" });
});
