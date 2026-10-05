import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { listBudgetsWithUsage, createBudget } from "@/lib/repositories/budgets";
import { findCategoryById } from "@/lib/repositories/categories";
import { parseBudgetInput } from "@/lib/validators/budget";
import { insertAuditLog } from "@/lib/repositories/audit-logs";
import { isDuplicateEntry } from "@/lib/db";

export const GET = withAuth("budgets.manage_own", async (_req, _ctx, user) => {
  const budgets = await listBudgetsWithUsage(user.id);
  return NextResponse.json(budgets);
});

export const POST = withAuth("budgets.manage_own", async (req, _ctx, user) => {
  const body = await readJson(req);
  const parsed = parseBudgetInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const { categoryId, amountLimit, periodStart, periodEnd } = parsed.value;

  const category = await findCategoryById(categoryId);
  if (!category || (category.userId !== null && category.userId !== user.id)) {
    throw new ApiError(404, "NOT_FOUND", "Danh mục không tồn tại");
  }

  try {
    const id = await createBudget({ userId: user.id, categoryId, amountLimit, periodStart, periodEnd });
    await insertAuditLog({
      userId: user.id,
      action: "budgets.create",
      targetTable: "budgets",
      targetId: id,
      detail: { categoryId, amountLimit, periodStart, periodEnd },
      ipAddress: getClientIp(req),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntry(err)) {
      throw new ApiError(409, "DUPLICATE", "Ngân sách cho danh mục và kỳ này đã tồn tại");
    }
    throw err;
  }
});
