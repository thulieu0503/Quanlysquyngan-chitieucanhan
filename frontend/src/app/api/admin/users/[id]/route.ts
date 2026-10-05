/**
 * ============================================================================
 * API: CHI TIẾT VÀ KHÓA / MỞ KHÓA TÀI KHOẢN NGƯỜI DÙNG (DÀNH CHO ADMIN)
 * ============================================================================
 * 
 * 1. GET /api/admin/users/:id
 *    - Quyền: 'users.view_profile' (Admin)
 *    - Chức năng: Xem thông tin chi tiết một tài khoản người dùng (loại bỏ mật khẩu hash).
 * 
 * 2. PATCH /api/admin/users/:id
 *    - Quyền: 'users.lock_unlock' (Admin)
 *    - Chức năng: Khóa hoặc Mở khóa tài khoản người dùng.
 *    - Body: { "status": "active" | "locked" }
 *    - Quy tắc nghiệp vụ:
 *      + Không được phép khóa tài khoản Admin.
 *      + Phải ghi nhận hành động vào bảng `audit_logs` để truy vết an toàn.
 */

import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { findUserById, updateUserStatus } from "@/lib/repositories/users";
import { insertAuditLog } from "@/lib/repositories/audit-logs";
import { parseUserStatusInput } from "@/lib/validators/user";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/:id - Xem thông tin chi tiết tài khoản
 */
export const GET = withAuth("users.view_profile", async (_req, ctx: Ctx, _user) => {
  const { id } = await ctx.params;
  const user = await findUserById(parseInt(id, 10));
  if (!user) throw new ApiError(404, "NOT_FOUND", "Người dùng không tồn tại");

  // Loại bỏ trường nhạy cảm `passwordHash` trước khi trả về cho client
  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json({ data: safeUser });
});

/**
 * PATCH /api/admin/users/:id - Khóa hoặc Mở khóa tài khoản
 */
export const PATCH = withAuth("users.lock_unlock", async (req, ctx: Ctx, adminUser) => {
  const { id } = await ctx.params;
  const targetId = parseInt(id, 10);

  // 1. Kiểm tra tài khoản đích có tồn tại không
  const target = await findUserById(targetId);
  if (!target) throw new ApiError(404, "NOT_FOUND", "Người dùng không tồn tại");

  // 2. Chặn không cho phép khóa tài khoản có quyền Admin
  if (target.role === "admin") throw new ApiError(403, "FORBIDDEN", "Không thể khóa tài khoản Admin");

  // 3. Đọc và validate body (chỉ chấp nhận "active" hoặc "locked")
  const body = await readJson(req);
  const parsed = parseUserStatusInput(body);
  if (!parsed.ok) {
    throw new ApiError(422, "VALIDATION_ERROR", 'status phải là "active" hoặc "locked"', parsed.fields);
  }

  const { status } = parsed.value;

  // 4. Cập nhật trạng thái người dùng trong MySQL
  await updateUserStatus(targetId, status);

  // 5. Ghi lại Audit Log để lưu dấu vết quản trị
  await insertAuditLog({
    userId: adminUser.id,
    action: "users.lock_unlock",
    targetTable: "users",
    targetId: targetId,
    detail: { oldStatus: target.status, newStatus: status },
    ipAddress: getClientIp(req),
  });

  // 6. Trả về thông báo thành công
  return NextResponse.json({ message: `Tài khoản đã được ${status === "active" ? "mở khóa" : "khóa"}` });
});
