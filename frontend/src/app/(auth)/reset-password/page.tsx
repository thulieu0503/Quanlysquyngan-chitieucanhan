"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { LockIcon, MailIcon, ShieldIcon } from "@/components/ui/icons";
import { postJson } from "@/lib/api-client";
import {
  validateCode,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from "@/lib/validators/auth";

const RESEND_SECONDS = 60;

type Errors = { email?: string; code?: string; password?: string; confirm?: string };

function ResetPasswordForm() {
  const cameFromForgot = useSearchParams().get("email");
  const [email, setEmail] = useState(cameFromForgot ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [info, setInfo] = useState<string | undefined>(
    cameFromForgot
      ? `Nếu ${cameFromForgot} đã đăng ký, mã xác nhận gồm 6 chữ số đã được gửi tới hộp thư. Mã có hiệu lực 15 phút.`
      : undefined,
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(cameFromForgot ? RESEND_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    setFormError(undefined);
    if (emailError) return;

    const result = await postJson("/api/auth/forgot-password", { email });
    if (!result.ok) {
      setFormError(result.error.fields?.email ?? result.error.message);
      return;
    }
    setInfo(`Nếu ${email.trim()} đã đăng ký, mã xác nhận mới đã được gửi. Mã cũ không còn dùng được.`);
    setCooldown(RESEND_SECONDS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Errors = {
      email: validateEmail(email),
      code: validateCode(code),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    const result = await postJson("/api/auth/reset-password", { email, code, password });
    setLoading(false);

    if (!result.ok) {
      setInfo(undefined);
      setFormError(result.error.fields?.password ?? result.error.fields?.email ?? result.error.message);
      return;
    }
    setDone(true);
  }

  return (
    <AuthShell>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-gold">Khôi phục tài khoản</p>
      <h1 className="mb-2 font-serif text-[32px] font-semibold text-ink">Đặt lại mật khẩu</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-ink-soft">
        Nhập mã xác nhận đã gửi qua email và tạo mật khẩu mới cho tài khoản của bạn.
      </p>

      {done ? (
        <>
          <FormAlert tone="success">Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.</FormAlert>
          <Link
            href="/login"
            className="flex h-[50px] items-center justify-center rounded-[10px] bg-gold text-[15px] font-bold text-ink shadow-[0_10px_24px_rgba(201,151,43,0.35)] transition-colors hover:bg-gold-dark"
          >
            Đăng nhập
          </Link>
        </>
      ) : (
        <>
          {info && <FormAlert tone="success">{info}</FormAlert>}
          {formError && <FormAlert tone="error">{formError}</FormAlert>}

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
            <div>
              <TextField
                label="Mã xác nhận"
                placeholder="6 chữ số"
                value={code}
                onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                error={errors.code}
                icon={<ShieldIcon className="h-[17px] w-[17px]" />}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
              />
              <div className="mt-1.5 text-right text-[13px] text-ink-soft">
                {cooldown > 0 ? (
                  <>Có thể gửi lại mã sau {cooldown}s</>
                ) : (
                  <button type="button" onClick={handleResend} className="font-semibold text-green hover:underline">
                    Gửi lại mã
                  </button>
                )}
              </div>
            </div>
            <TextField
              label="Mật khẩu mới"
              type="password"
              placeholder="Tối thiểu 8 ký tự"
              value={password}
              onChange={setPassword}
              error={errors.password}
              icon={<LockIcon className="h-[17px] w-[17px]" />}
              autoComplete="new-password"
            />
            <TextField
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirm}
              onChange={setConfirm}
              error={errors.confirm}
              icon={<LockIcon className="h-[17px] w-[17px]" />}
              autoComplete="new-password"
            />

            <Button loading={loading}>Đặt lại mật khẩu</Button>

            <p className="mt-1 text-center text-[13.5px] text-ink-soft">
              <Link href="/login" className="font-semibold text-green hover:underline">
                Quay lại đăng nhập
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
