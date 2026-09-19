"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { CheckCircleIcon, LockIcon, MailIcon, UserIcon } from "@/components/ui/icons";
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validators/auth";

type Errors = { name?: string; email?: string; password?: string; confirm?: string };

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setSuccess(false);
      return;
    }
    setSuccess(true);
    // TODO: gọi API /api/auth/register khi backend sẵn sàng.
  }

  return (
    <AuthShell>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-gold">
        Bắt đầu ngay hôm nay
      </p>
      <h1 className="mb-2 font-serif text-[32px] font-semibold text-ink">Tạo tài khoản</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-ink-soft">
        Chỉ mất một phút để bắt đầu quản lý tài chính cá nhân.
      </p>

      {success && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-green/30 bg-green/10 px-3.5 py-3">
          <CheckCircleIcon className="h-[18px] w-[18px] text-green" />
          <span className="text-[13.5px] font-medium text-green-dark">
            Tạo tài khoản thành công! (bản demo giao diện)
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          value={name}
          onChange={setName}
          error={errors.name}
          icon={<UserIcon className="h-[17px] w-[17px]" />}
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />
        <TextField
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="Nhập lại mật khẩu"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
          icon={<LockIcon className="h-[17px] w-[17px]" />}
          autoComplete="new-password"
        />

        <button
          type="submit"
          className="mt-1.5 h-[50px] rounded-[10px] bg-gold text-[15px] font-bold text-ink shadow-[0_10px_24px_rgba(201,151,43,0.35)] transition-colors hover:bg-gold-dark active:translate-y-px"
        >
          Đăng ký
        </button>

        <p className="mt-1 text-center text-[13.5px] text-ink-soft">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-semibold text-green hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
