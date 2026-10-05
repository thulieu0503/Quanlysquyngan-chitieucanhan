/**
 * ============================================================================
 * API: CHI TIẾT, CẬP NHẬT VÀ XÓA GIAO DỊCH (Transaction By ID API)
 * ============================================================================
 * 
 * 1. GET /api/transactions/:id
 *    - Quyền: 'transactions.view_own'
 *    - Chức năng: Xem chi tiết một giao dịch của chính mình.
 * 
 * 2. PUT /api/transactions/:id
 *    - Quyền: 'transactions.update_own'
 *    - Chức năng: Cập nhật toàn bộ thông tin giao dịch (loại, danh mục, số tiền, ngày, ghi chú).
 *    - Ghi lại Audit Log chứa thông tin cũ và mới để đối soát.
 * 
 * 3. DELETE /api/transactions/:id
 *    - Quyền: 'transactions.delete_own'
 *    - Chức năng: Xóa mềm giao dịch (cập nhật `deleted_at = NOW()`, không xóa vĩnh viễn khỏi DB).
 */

import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import {
  findTransactionById,
  updateTransaction,
  softDeleteTransaction,
} from "@/lib/repositories/transactions";
import { findCategoryById } from "@/lib/repositories/categories";
import { parseTransactionInput } from "@/lib/validators/transaction";
import { insertAuditLog } from "@/lib/repositories/audit-logs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/transactions/:id - Lấy thông tin chi tiết một giao dịch
 */
export const GET = withAuth("transactions.view_own", async (_req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const tx = await findTransactionById(parseInt(id, 10), user.id);
  if (!tx) throw new ApiError(404, "NOT_FOUND", "Giao dịch không tồn tại");
  return NextResponse.json({ data: tx });
});

/**
 * PUT /api/transactions/:id - Cập nhật thông tin giao dịch
 */
export const PUT = withAuth("transactions.update_own", async (req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const txId = parseInt(id, 10);

  // 1. Kiểm tra giao dịch có tồn tại và thuộc về user đang đăng nhập không
  const existing = await findTransactionById(txId, user.id);
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Giao dịch không tồn tại");

  // 2. Validate dữ liệu gửi lên
  const body = await readJson(req);
  const parsed = parseTransactionInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const { categoryId, type, amount, transactionDate, note } = parsed.value;

  // 3. Kiểm tra danh mục mới
  const category = await findCategoryById(categoryId);
  if (!category || (category.userId !== null && category.userId !== user.id)) {
    throw new ApiError(404, "NOT_FOUND", "Danh mục không tồn tại");
  }
  if (category.type !== type) {
    throw new ApiError(422, "VALIDATION_ERROR", "Loại giao dịch không khớp với loại danh mục", {
      type: "Loại giao dịch không khớp danh mục",
    });
  }

  // 4. Cập nhật trong cơ sở dữ liệu MySQL
  const ok = await updateTransaction(txId, user.id, { categoryId, type, amount, transactionDate, note });
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Giao dịch không tồn tại");

  // 5. Ghi nhận Audit Log (lưu lại thông tin cũ và mới)
  await insertAuditLog({
    userId: user.id,
    action: "transactions.update",
    targetTable: "transactions",
    targetId: txId,
    detail: { old: { amount: existing.amount, type: existing.type }, new: { amount, type } },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Cập nhật thành công" });
});

/**
 * DELETE /api/transactions/:id - Xóa mềm giao dịch
 */
export const DELETE = withAuth("transactions.delete_own", async (req, ctx: Ctx, user) => {
  const { id } = await ctx.params;
  const txId = parseInt(id, 10);

  // 1. Thực hiện xóa mềm (UPDATE deleted_at = NOW())
  const ok = await softDeleteTransaction(txId, user.id);
  if (!ok) throw new ApiError(404, "NOT_FOUND", "Giao dịch không tồn tại");

  // 2. Ghi nhận Audit Log hành động xóa
  await insertAuditLog({
    userId: user.id,
    action: "transactions.delete",
    targetTable: "transactions",
    targetId: txId,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Xóa thành công" });
});
