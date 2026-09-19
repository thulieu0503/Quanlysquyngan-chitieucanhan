"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { CheckCircleIcon, LockIcon, MailIcon } from "@/components/ui/icons";
import { validateEmail, validatePassword } from "@/lib/validators/auth";

type Errors = { email?: string; password?: string };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Errors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setSuccess(false);
      return;
    }
    setSuccess(true);
    // TODO: gọi API /api/auth/login (NextAuth Credentials) khi backend sẵn sàng.
  }

  return (
    <AuthShell>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-gold">
        Chào mừng trở lại
      </p>
      <h1 className="mb-2 font-serif text-[32px] font-semibold text-ink">Đăng nhập</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-ink-soft">
        Đăng nhập để tiếp tục theo dõi thu chi của bạn.
      </p>

      {success && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-green/30 bg-green/10 px-3.5 py-3">
          <CheckCircleIcon className="h-[18px] w-[18px] text-green" />
          <span className="text-[13.5px] font-medium text-green-dark">
            Đăng nhập thành công! (bản demo giao diện)
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          placeholder="ban@email.com"
          value={email}
          onChange={setEmail}
          error={errors.email}
          icon={<MailIcon className="h-[17px] w-[17px]" />}
          autoComplete="email"
        />
        <TextField
          label="Mật khẩu"
          type="password"
          placeholder="Tối thiểu 6 ký tự"
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
            Ghi nhớ đăng nhập
          </label>
          <Link href="/forgot-password" className="text-[13.5px] font-semibold text-green hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          className="mt-1.5 h-[50px] rounded-[10px] bg-gold text-[15px] font-bold text-ink shadow-[0_10px_24px_rgba(201,151,43,0.35)] transition-colors hover:bg-gold-dark active:translate-y-px"
        >
          Đăng nhập
        </button>

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
