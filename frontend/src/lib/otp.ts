import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_VALID_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;

export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
}

// Mã chỉ có 1 triệu khả năng nên băm SHA-256 thường có thể bị dò ngược ngay nếu lộ DB.
// Dùng HMAC với khóa bí mật của server, gắn thêm user id để cùng một mã của 2 người cho ra 2 giá trị khác nhau.
export function hashOtp(userId: number, code: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET chưa được cấu hình");
  return createHmac("sha256", secret).update(`${userId}:${code}`).digest("hex");
}

export function otpMatches(userId: number, code: string, storedHash: string): boolean {
  const actual = Buffer.from(hashOtp(userId, code), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
