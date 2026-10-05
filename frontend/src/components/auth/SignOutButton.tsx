"use client";

import { useRouter } from "next/navigation";
import { postJson } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await postJson("/api/auth/logout", {});
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-[10px] border-[1.5px] border-border bg-white px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-green hover:text-green"
    >
      Đăng xuất
    </button>
  );
}
