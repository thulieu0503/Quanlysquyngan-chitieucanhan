/**
 * ============================================================================
 * API: QUẢN LÝ GIAO DỊCH THU/CHI (Transactions API)
 * ============================================================================
 * 
 * 1. GET /api/transactions
 *    - Quyền: 'transactions.view_own' (Chỉ xem giao dịch của chính tài khoản đang đăng nhập)
 *    - Bộ lọc hỗ trợ: type, categoryId, dateFrom, dateTo, search (theo ghi chú), sortBy, sortOrder, page, limit
 * 
 * 2. POST /api/transactions
 *    - Quyền: 'transactions.create'
 *    - Body: { categoryId, type, amount, transactionDate, note? }
 *    - Quy tắc nghiệp vụ:
 *      + Validate dữ liệu đầu vào (amount > 0, ngày hợp lệ, note <= 255 ký tự).
 *      + Kiểm tra danh mục (Category) có thuộc về người dùng hoặc là danh mục mặc định của hệ thống không.
 *      + Kiểm tra loại giao dịch (income / expense) có khớp với loại danh mục không.
 *      + Ghi nhận vào bảng `audit_logs`.
 */

import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { listTransactions, createTransaction } from "@/lib/repositories/transactions";
import { findCategoryById } from "@/lib/repositories/categories";
import { parseTransactionInput } from "@/lib/validators/transaction";
import { insertAuditLog } from "@/lib/repositories/audit-logs";

/**
 * GET /api/transactions - Lấy danh sách giao dịch của người dùng
 */
export const GET = withAuth("transactions.view_own", async (req, _ctx, user) => {
  // 1. Đọc và lọc các tham số từ Query String
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as "income" | "expense" | null;
  const categoryId = url.searchParams.get("categoryId");
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const sortBy = (url.searchParams.get("sortBy") ?? "transaction_date") as "transaction_date" | "amount" | "created_at";
  const sortOrder = (url.searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));

  // 2. Query dữ liệu riêng tư của người dùng từ MySQL (ràng buộc user.id)
  const result = await listTransactions(user.id, {
    type: type ?? undefined,
    categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
    dateFrom,
    dateTo,
    search,
    sortBy,
    sortOrder,
    page,
    limit,
  });

  return NextResponse.json(result);
});

/**
 * POST /api/transactions - Tạo giao dịch thu/chi mới
 */
export const POST = withAuth("transactions.create", async (req, _ctx, user) => {
  // 1. Đọc và validate định dạng dữ liệu đầu vào
  const body = await readJson(req);
  const parsed = parseTransactionInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const { categoryId, type, amount, transactionDate, note } = parsed.value;

  // 2. Kiểm tra danh mục có tồn tại và thuộc quyền sở hữu của user (hoặc là danh mục hệ thống)
  const category = await findCategoryById(categoryId);
  if (!category || (category.userId !== null && category.userId !== user.id)) {
    throw new ApiError(404, "NOT_FOUND", "Danh mục không tồn tại");
  }

  // 3. Kiểm tra tính đồng bộ: Loại giao dịch phải khớp với loại danh mục
  if (category.type !== type) {
    throw new ApiError(422, "VALIDATION_ERROR", "Loại giao dịch không khớp với loại danh mục", {
      type: "Loại giao dịch không khớp danh mục",
    });
  }

  // 4. Lưu giao dịch vào cơ sở dữ liệu MySQL
  const id = await createTransaction({ userId: user.id, categoryId, type, amount, transactionDate, note });

  // 5. Ghi Audit Log hành động tạo giao dịch
  await insertAuditLog({
    userId: user.id,
    action: "transactions.create",
    targetTable: "transactions",
    targetId: id,
    detail: { amount, type, categoryId },
    ipAddress: getClientIp(req),
  });

  // 6. Trả về mã HTTP 201 Created cùng ID của giao dịch vừa tạo
  return NextResponse.json({ id }, { status: 201 });
});
