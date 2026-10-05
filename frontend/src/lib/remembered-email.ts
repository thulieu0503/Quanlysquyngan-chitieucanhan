import { useSyncExternalStore } from "react";

// Chỉ dùng ở client. Chỉ lưu email (không bao giờ lưu mật khẩu); mật khẩu do trình quản lý mật khẩu của trình duyệt xử lý.
const KEY = "vivang:remembered-email";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Trả về "" ở server và lần render hydrate đầu tiên, rồi cập nhật thành email đã lưu — không lệch HTML.
export function useRememberedEmail(): string {
  return useSyncExternalStore(subscribe, read, () => "");
}

export function writeRememberedEmail(email: string | null): void {
  try {
    if (email) window.localStorage.setItem(KEY, email);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Trình duyệt chặn localStorage (chế độ riêng tư…): bỏ qua, chỉ mất tính năng ghi nhớ.
  }
}
