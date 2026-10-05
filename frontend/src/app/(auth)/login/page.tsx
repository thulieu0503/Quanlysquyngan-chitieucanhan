"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { LockIcon, MailIcon } from "@/components/ui/icons";
import { postJson } from "@/lib/api-client";
import { useRememberedEmail, writeRememberedEmail } from "@/lib/remembered-email";
import { normalizeEmail, validateEmail } from "@/lib/validators/auth";

type Errors = { email?: string; password?: string };

export default function LoginPage() {
  const router = useRouter();
  // Ô email hiện email đã lưu cho tới khi người dùng tự gõ.
  const savedEmail = useRememberedEmail();
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const email = typedEmail ?? savedEmail;
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Errors = {
      email: validateEmail(email),
      password: password ? undefined : "Vui lòng nhập mật khẩu",
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    const result = await postJson("/api/auth/login", { email, password });
    setLoading(false);

    if (!result.ok) {
      // Không phân biệt sai email / sai mật khẩu / tài khoản bị khóa để không lộ thông tin tài khoản.
      setFormError("Email hoặc mật khẩu không đúng.");
      return;
    }
    writeRememberedEmail(remember ? normalizeEmail(email) : null);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-gold">Chào mừng trở lại</p>
      <h1 className="mb-2 font-serif text-[32px] font-semibold text-ink">Đăng nhập</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-ink-soft">
        Đăng nhập để tiếp tục theo dõi thu chi của bạn.
      </p>

      {formError && <FormAlert tone="error">{formError}</FormAlert>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          placeholder="ban@email.com"
          value={email}
          onChange={setTypedEmail}
          error={errors.email}
          icon={<MailIcon className="h-[17px] w-[17px]" />}
          autoComplete="email"
        />
        <TextField
          label="Mật khẩu"
          type="password"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={setPassword}
          error={errors.password}
          icon={<LockIcon className="h-[17px] w-[17px]" />}
          autoComplete="current-password"
        />

        <div className="-mt-1 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-1.5 text-[13.5px] text-ink-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-green"
            />
            Ghi nhớ tài khoản
          </label>
          <Link href="/forgot-password" className="text-[13.5px] font-semibold text-green hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <Button loading={loading}>Đăng nhập</Button>

        <p className="mt-1 text-center text-[13.5px] text-ink-soft">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-green hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
