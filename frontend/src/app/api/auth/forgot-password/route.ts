import { NextResponse, after } from "next/server";
import { isDuplicateEntry, withTransaction } from "@/lib/db";
import { ApiError, readJson, route } from "@/lib/http";
import { buildResetCodeMail, sendMail } from "@/lib/mail";
import { OTP_RESEND_SECONDS, OTP_VALID_MINUTES, generateOtp, hashOtp } from "@/lib/otp";
import { createResetCode, invalidateActiveCodes, secondsSinceLatestCode } from "@/lib/repositories/password-resets";
import { findUserByEmail } from "@/lib/repositories/users";
import { parseForgotInput } from "@/lib/validators/auth";

// Tạo mã mới và vô hiệu hóa mã cũ. Cột token là UNIQUE nên hiếm khi trùng mã cũ của cùng user thì sinh lại.
async function issueCode(userId: number): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateOtp();
    try {
      await withTransaction(async (conn) => {
        await invalidateActiveCodes(conn, userId);
        await createResetCode(conn, userId, hashOtp(userId, code), OTP_VALID_MINUTES);
      });
      return code;
    } catch (err) {
      if (!isDuplicateEntry(err)) throw err;
    }
  }
  throw new Error("Không tạo được mã xác nhận");
}

export const POST = route(async (req) => {
  const parsed = parseForgotInput(await readJson(req));
  if (!parsed.ok) throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const user = await findUserByEmail(parsed.value.email);

  if (user && user.status === "active") {
    // Chặn gửi mã dồn dập để không bị lợi dụng spam hộp thư của người khác.
    const since = await secondsSinceLatestCode(user.id);
    if (since === null || since >= OTP_RESEND_SECONDS) {
      const code = await issueCode(user.id);

      // Gửi mail sau khi đã trả response để thời gian phản hồi không lộ email có tồn tại hay không.
      after(async () => {
        try {
          await sendMail(buildResetCodeMail({ to: user.email, name: user.name, code, validMinutes: OTP_VALID_MINUTES }));
        } catch (err) {
          console.error("[auth] gửi email mã xác nhận thất bại", err);
        }
      });
    }
  }

  // Luôn trả cùng một kết quả dù email có tồn tại hay không (chống dò tài khoản).
  return NextResponse.json({
    data: { message: "Nếu email đã đăng ký, chúng tôi đã gửi mã xác nhận gồm 6 chữ số." },
  });
});
