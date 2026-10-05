import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { findCategoryById, updateCategory, softDeleteCategory } from "@/lib/repositories/categories";
import { parseCategoryInput } from "@/lib/validators/category";
import { insertAuditLog } from "@/lib/repositories/audit-logs";
import { withTransaction, isDuplicateEntry } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withAuth("categories.manage_own", async (req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const catId = parseInt(id, 10);

  const category = await findCategoryById(catId);
  if (!category || category.userId !== user.id) {
    throw new ApiError(404, "NOT_FOUND", "Danh mục không tồn tại hoặc không thuộc về bạn");
  }

  const body = await readJson(req);
  const parsed = parseCategoryInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  try {
    await withTransaction(async (conn) => {
      await updateCategory(conn, catId, parsed.value);
    });
  } catch (err) {
    if (isDuplicateEntry(err)) {
      throw new ApiError(409, "DUPLICATE", "Danh mục với tên và loại này đã tồn tại", { name: "Tên đã tồn tại" });
    }
    throw err;
  }

  await insertAuditLog({
    userId: user.id,
    action: "categories.update",
    targetTable: "categories",
    targetId: catId,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Cập nhật thành công" });
});

export const DELETE = withAuth("categories.manage_own", async (req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const catId = parseInt(id, 10);

  const category = await findCategoryById(catId);
  if (!category || category.userId !== user.id) {
    throw new ApiError(404, "NOT_FOUND", "Danh mục không tồn tại hoặc không thuộc về bạn");
  }

  await softDeleteCategory(catId);

  await insertAuditLog({
    userId: user.id,
    action: "categories.delete",
    targetTable: "categories",
    targetId: catId,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Xóa thành công" });
});
