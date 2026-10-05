import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { ApiError, readJson, route } from "@/lib/http";
import { OTP_MAX_ATTEMPTS, otpMatches } from "@/lib/otp";
import {
  findActiveCode,
  markCodeUsed,
  recordFailedAttempt,
} from "@/lib/repositories/password-resets";
import { findUserByEmail, updatePasswordHash } from "@/lib/repositories/users";
import { parseResetInput } from "@/lib/validators/auth";

// Mọi kiểu thất bại (email lạ, hết hạn, sai mã, quá số lần thử) dùng chung một thông báo để không lộ email có tồn tại hay không.
const invalidCode = () =>
  new ApiError(
    400,
    "INVALID_CODE",
    "Mã xác nhận không đúng hoặc đã hết hạn. Nếu đã nhập sai nhiều lần, hãy yêu cầu gửi mã mới.",
    { code: "Mã xác nhận không đúng hoặc đã hết hạn" },
  );

export const POST = route(async (req) => {
  const parsed = parseResetInput(await readJson(req));
  if (!parsed.ok) throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const { email, code, password } = parsed.value;
  const user = await findUserByEmail(email);
  if (!user || user.status !== "active") throw invalidCode();

  // Transaction chỉ ném lỗi khi có sự cố thật; nhập sai mã vẫn phải COMMIT để ghi nhận số lần thử.
  const outcome = await withTransaction(async (conn) => {
    const active = await findActiveCode(conn, user.id);
    if (!active) return "invalid" as const;

    if (!otpMatches(user.id, code, active.codeHash)) {
      await recordFailedAttempt(conn, active.id);
      if (active.attempts + 1 >= OTP_MAX_ATTEMPTS) await markCodeUsed(conn, active.id);
      return "invalid" as const;
    }

    await updatePasswordHash(conn, user.id, await bcrypt.hash(password, 10));
    await markCodeUsed(conn, active.id);
    return "ok" as const;
  });

  if (outcome !== "ok") throw invalidCode();
  return NextResponse.json({ data: { message: "Đặt lại mật khẩu thành công" } });
});
