import { NextResponse } from "next/server";
import { can, type Action } from "@/lib/rbac";
import { getCurrentUser, type AuthUser } from "@/lib/session";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string | undefined>,
  ) {
    super(message);
  }
}

export function jsonError(status: number, code: string, message: string, fields?: Record<string, string | undefined>) {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ");
  }
}

function handleError(err: unknown): Response {
  if (err instanceof ApiError) return jsonError(err.status, err.code, err.message, err.fields);
  console.error("[api] unhandled error", err);
  return jsonError(500, "INTERNAL_ERROR", "Đã xảy ra lỗi, vui lòng thử lại sau");
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

// Endpoint công khai (đăng ký, quên mật khẩu…): chỉ bọc xử lý lỗi thống nhất.
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return handleError(err);
    }
  };
}

// Endpoint cần đăng nhập: 401 nếu chưa đăng nhập/tài khoản bị khóa, 403 nếu vai trò không có quyền `action`.
export function withAuth<C = unknown>(
  action: Action,
  handler: (req: Request, ctx: C, user: AuthUser) => Promise<Response>,
): Handler<C> {
  return route<C>(async (req, ctx) => {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Bạn cần đăng nhập để thực hiện thao tác này");
    if (!can(user.role, action)) throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này");
    return handler(req, ctx, user);
  });
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
}
