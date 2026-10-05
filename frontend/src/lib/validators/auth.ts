const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LIMITS = {
  name: 100,
  email: 150,
  passwordMin: 8,
  // bcrypt chỉ dùng 72 byte đầu của mật khẩu
  passwordMaxBytes: 72,
} as const;

export type FieldErrors = Partial<Record<string, string>>;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Vui lòng nhập email";
  if (email.trim().length > LIMITS.email) return `Email tối đa ${LIMITS.email} ký tự`;
  if (!EMAIL_RE.test(email.trim())) return "Email không hợp lệ";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Vui lòng nhập mật khẩu";
  if (password.length < LIMITS.passwordMin) return `Mật khẩu tối thiểu ${LIMITS.passwordMin} ký tự`;
  if (new TextEncoder().encode(password).length > LIMITS.passwordMaxBytes) return "Mật khẩu quá dài (tối đa 72 ký tự)";
  return undefined;
}

export function validateName(name: string): string | undefined {
  if (!name.trim()) return "Vui lòng nhập họ và tên";
  if (name.trim().length > LIMITS.name) return `Họ và tên tối đa ${LIMITS.name} ký tự`;
  return undefined;
}

export function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return "Vui lòng xác nhận mật khẩu";
  if (confirm !== password) return "Mật khẩu xác nhận không khớp";
  return undefined;
}

export function validateCode(code: string): string | undefined {
  if (!code) return "Vui lòng nhập mã xác nhận";
  if (!/^\d{6}$/.test(code)) return "Mã xác nhận gồm 6 chữ số";
  return undefined;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---- Parse dữ liệu nhận từ request (server không tin validate của client) ----

type ParseResult<T> = { ok: true; value: T } | { ok: false; fields: FieldErrors };

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function compact(fields: FieldErrors): FieldErrors | null {
  const entries = Object.entries(fields).filter(([, msg]) => msg);
  return entries.length ? Object.fromEntries(entries) : null;
}

export function parseRegisterInput(body: unknown): ParseResult<{ name: string; email: string; password: string }> {
  const b = asRecord(body);
  const name = asString(b.name);
  const email = asString(b.email);
  const password = asString(b.password);
  const errors = compact({
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
  });
  if (errors) return { ok: false, fields: errors };
  return { ok: true, value: { name: name.trim(), email: normalizeEmail(email), password } };
}

export function parseForgotInput(body: unknown): ParseResult<{ email: string }> {
  const email = asString(asRecord(body).email);
  const errors = compact({ email: validateEmail(email) });
  if (errors) return { ok: false, fields: errors };
  return { ok: true, value: { email: normalizeEmail(email) } };
}

export function parseResetInput(body: unknown): ParseResult<{ email: string; code: string; password: string }> {
  const b = asRecord(body);
  const email = asString(b.email);
  const code = asString(b.code);
  const password = asString(b.password);
  const errors = compact({
    email: validateEmail(email),
    code: validateCode(code),
    password: validatePassword(password),
  });
  if (errors) return { ok: false, fields: errors };
  return { ok: true, value: { email: normalizeEmail(email), code, password } };
}
