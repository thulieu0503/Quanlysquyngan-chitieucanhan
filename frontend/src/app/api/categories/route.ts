import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { listCategoriesForUser, createCategory } from "@/lib/repositories/categories";
import { parseCategoryInput } from "@/lib/validators/category";
import { insertAuditLog } from "@/lib/repositories/audit-logs";
import { isDuplicateEntry } from "@/lib/db";

export const GET = withAuth("categories.view_default", async (_req, _ctx, user) => {
  const categories = await listCategoriesForUser(user.id);
  return NextResponse.json(categories);
});

export const POST = withAuth("categories.manage_own", async (req, _ctx, user) => {
  const body = await readJson(req);
  const parsed = parseCategoryInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  try {
    const id = await createCategory({ userId: user.id, ...parsed.value });
    await insertAuditLog({
      userId: user.id,
      action: "categories.create",
      targetTable: "categories",
      targetId: id,
      ipAddress: getClientIp(req),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntry(err)) {
      throw new ApiError(409, "DUPLICATE", "Danh mục với tên và loại này đã tồn tại", { name: "Tên đã tồn tại" });
    }
    throw err;
  }
});
