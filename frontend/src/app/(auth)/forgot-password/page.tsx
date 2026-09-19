"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { CheckCircleIcon, MailIcon } from "@/components/ui/icons";
import { validateEmail } from "@/lib/validators/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) {
      setSent(false);
      return;
    }
    setSent(true);
    // TODO: gọi API /api/auth/forgot-password khi backend sẵn sàng.
  }

  return (
    <AuthShell>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-gold">
        Khôi phục tài khoản
      </p>
      <h1 className="mb-2 font-serif text-[32px] font-semibold text-ink">Quên mật khẩu?</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-ink-soft">
        Nhập email đã đăng ký, chúng tôi sẽ gửi cho bạn liên kết để đặt lại mật khẩu.
      </p>

      {sent && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-green/30 bg-green/10 px-3.5 py-3">
          <CheckCircleIcon className="h-[18px] w-[18px] flex-shrink-0 text-green" />
          <span className="text-[13.5px] font-medium text-green-dark">
            Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi. (bản demo giao diện)
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
          error={error}
          icon={<MailIcon className="h-[17px] w-[17px]" />}
          autoComplete="email"
        />

        <button
          type="submit"
          className="mt-1.5 h-[50px] rounded-[10px] bg-gold text-[15px] font-bold text-ink shadow-[0_10px_24px_rgba(201,151,43,0.35)] transition-colors hover:bg-gold-dark active:translate-y-px"
        >
          Gửi liên kết đặt lại
        </button>

        <p className="mt-1 text-center text-[13.5px] text-ink-soft">
          Đã nhớ mật khẩu?{" "}
          <Link href="/login" className="font-semibold text-green hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
