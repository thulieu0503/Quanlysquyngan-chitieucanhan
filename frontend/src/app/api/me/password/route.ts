import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withAuth, readJson, ApiError, getClientIp } from "@/lib/http";
import { findUserById, updatePasswordHash } from "@/lib/repositories/users";
import { parsePasswordChangeInput } from "@/lib/validators/user";
import { withTransaction } from "@/lib/db";
import { insertAuditLog } from "@/lib/repositories/audit-logs";

export const PUT = withAuth("transactions.view_own", async (req, _ctx, user) => {
  const body = await readJson(req);
  const parsed = parsePasswordChangeInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const { oldPassword, newPassword } = parsed.value;

  const dbUser = await findUserById(user.id);
  if (!dbUser) throw new ApiError(401, "UNAUTHENTICATED", "Tài khoản không tồn tại");

  const valid = await bcrypt.compare(oldPassword, dbUser.passwordHash);
  if (!valid) throw new ApiError(400, "INVALID_PASSWORD", "Mật khẩu hiện tại không đúng", { oldPassword: "Mật khẩu không đúng" });

  const newHash = await bcrypt.hash(newPassword, 10);

  await withTransaction(async (conn) => {
    await updatePasswordHash(conn, user.id, newHash);
  });

  await insertAuditLog({
    userId: user.id,
    action: "users.change_password",
    targetTable: "users",
    targetId: user.id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ message: "Đổi mật khẩu thành công" });
});
