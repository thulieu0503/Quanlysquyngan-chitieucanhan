"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { LockIcon, MailIcon, UserIcon } from "@/components/ui/icons";
import { postJson } from "@/lib/api-client";
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validators/auth";

type Errors = { name?: string; email?: string; password?: string; confirm?: string };

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    const result = await postJson("/api/auth/register", { name, email, password });
    if (!result.ok) {
      setLoading(false);
      const { fields } = result.error;
      if (fields && Object.keys(fields).length > 0) {
        setErrors({ name: fields.name, email: fields.email, password: fields.password });
      } else {
        setFormError(result.error.message);
      }
      return;
    }

    // Đăng ký xong đăng nhập luôn; nếu bước này lỗi thì chuyển về trang đăng nhập.
    const login = await postJson("/api/auth/login", { email, password });
    setLoading(false);
    router.push(login.ok ? "/dashboard" : "/login");
    router.refresh();
  }

  return (
    <AuthShell>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-gold">Bắt đầu ngay hôm nay</p>
      <h1 className="mb-2 font-serif text-[32px] font-semibold text-ink">Tạo tài khoản</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-ink-soft">
        Chỉ mất một phút để bắt đầu quản lý tài chính cá nhân.
      </p>

      {formError && <FormAlert tone="error">{formError}</FormAlert>}

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
          placeholder="Tối thiểu 8 ký tự"
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

        <Button loading={loading}>Đăng ký</Button>

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
