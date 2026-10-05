/**
 * ============================================================================
 * MODULE KIỂM TRA DỮ LIỆU ĐẦU VÀO NGƯỜI DÙNG (User Validators)
 * ============================================================================
 * File này chứa các hàm validate dữ liệu người dùng gửi lên trước khi xử lý,
 * nhằm đảm bảo an toàn thông tin và chặn đứng dữ liệu sai định dạng (HTTP 422).
 */

/** Dữ liệu cập nhật họ tên người dùng */
export type ProfileUpdateInput = { name: string };

/** Dữ liệu đổi mật khẩu */
export type PasswordChangeInput = { oldPassword: string; newPassword: string };

/** Dữ liệu thay đổi trạng thái tài khoản (chỉ dành cho Admin) */
export type UserStatusInput = { status: "active" | "locked" };

export type FieldErrors = Partial<Record<string, string>>;
type ParseResult<T> = { ok: true; value: T } | { ok: false; fields: FieldErrors };

/** Ép kiểu an toàn body về Record object */
function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

/** Lọc bỏ các trường không có lỗi (undefined) */
function compact(fields: FieldErrors): FieldErrors | null {
  const entries = Object.entries(fields).filter(([, msg]) => msg);
  return entries.length ? Object.fromEntries(entries) : null;
}

/**
 * Validate dữ liệu cập nhật thông tin cá nhân (Profile):
 * - Họ tên: bắt buộc, không được để trống, tối đa 100 ký tự.
 */
export function parseProfileUpdateInput(body: unknown): ParseResult<ProfileUpdateInput> {
  const b = asRecord(body);
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const errors = compact({
    name: !name ? "Họ và tên không được để trống" : name.length > 100 ? "Họ và tên tối đa 100 ký tự" : undefined,
  });
  if (errors) return { ok: false, fields: errors };
  return { ok: true, value: { name } };
}

/**
 * Validate dữ liệu đổi mật khẩu:
 * - Mật khẩu cũ: bắt buộc.
 * - Mật khẩu mới: tối thiểu 8 ký tự, tối đa 72 ký tự (giới hạn bcrypt), phải khác mật khẩu cũ.
 */
export function parsePasswordChangeInput(body: unknown): ParseResult<PasswordChangeInput> {
  const b = asRecord(body);
  const oldPassword = typeof b.oldPassword === "string" ? b.oldPassword : "";
  const newPassword = typeof b.newPassword === "string" ? b.newPassword : "";

  const errors = compact({
    oldPassword: !oldPassword ? "Vui lòng nhập mật khẩu hiện tại" : undefined,
    newPassword: !newPassword
      ? "Vui lòng nhập mật khẩu mới"
      : newPassword.length < 8
      ? "Mật khẩu mới tối thiểu 8 ký tự"
      : new TextEncoder().encode(newPassword).length > 72
      ? "Mật khẩu mới quá dài (tối đa 72 ký tự)"
      : newPassword === oldPassword
      ? "Mật khẩu mới phải khác mật khẩu hiện tại"
      : undefined,
  });
  if (errors) return { ok: false, fields: errors };
  return { ok: true, value: { oldPassword, newPassword } };
}

/**
 * Validate trạng thái tài khoản khi Admin Khóa / Mở khóa tài khoản:
 * - Giá trị hợp lệ: CHỈ chấp nhận chính xác "active" hoặc "locked".
 * - Bất kỳ giá trị nào khác đều trả về lỗi 422 VALIDATION_ERROR.
 */
export function parseUserStatusInput(body: unknown): ParseResult<UserStatusInput> {
  const b = asRecord(body);
  const status = b.status;
  if (status !== "active" && status !== "locked") {
    return {
      ok: false,
      fields: { status: 'Trạng thái phải là "active" hoặc "locked"' },
    };
  }
  return { ok: true, value: { status } };
}
