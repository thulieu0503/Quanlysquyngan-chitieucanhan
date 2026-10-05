import { redirect } from "next/navigation";

// Trang dashboard tự chuyển về /login nếu chưa đăng nhập.
export default function HomePage() {
  redirect("/dashboard");
}
