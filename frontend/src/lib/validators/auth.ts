const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Vui lòng nhập email";
  if (!EMAIL_RE.test(email)) return "Email không hợp lệ";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Vui lòng nhập mật khẩu";
  if (password.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
  return undefined;
}

export function validateName(name: string): string | undefined {
  if (!name.trim()) return "Vui lòng nhập họ và tên";
  return undefined;
}

export function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return "Vui lòng xác nhận mật khẩu";
  if (confirm !== password) return "Mật khẩu xác nhận không khớp";
  return undefined;
}
