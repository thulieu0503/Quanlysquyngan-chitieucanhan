/**
 * ============================================================================
 * API: DANH SÁCH NGƯỜI DÙNG DÀNH CHO ADMIN
 * ============================================================================
 * Đường dẫn: GET /api/admin/users
 * Yêu cầu quyền: 'users.view_list' (Chỉ Admin mới có quyền truy cập)
 *
 * Query Parameters:
 * - search?: string - Tìm kiếm gần đúng theo họ tên hoặc email
 * - status?: 'active' | 'locked' - Lọc theo trạng thái tài khoản
 * - page?: number - Số trang (mặc định: 1)
 * - limit?: number - Số lượng bản ghi mỗi trang (mặc định: 20, tối đa: 100)
 *
 * Response 200:
 * {
 *   data: UserRecord[],
 *   total: number,
 *   page: number,
 *   limit: number,
 *   totalPages: number
 * }
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/http";
import { listUsers } from "@/lib/repositories/users";

export const GET = withAuth("users.view_list", async (req, _ctx, _user) => {
  // 1. Đọc và chuẩn hóa các tham số từ Query String trong URL
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") as "active" | "locked" | null;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));

  // 2. Gọi Repository để lấy dữ liệu từ database MySQL
  const result = await listUsers({
    search,
    status: status ?? undefined,
    page,
    limit,
  });

  // 3. Trả về kết quả JSON kèm thông tin phân trang
  return NextResponse.json(result);
});
