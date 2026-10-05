"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import { TextField } from "@/components/ui/TextField";
import { MailIcon } from "@/components/ui/icons";
import { postJson } from "@/lib/api-client";
import { normalizeEmail, validateEmail } from "@/lib/validators/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    setFormError(undefined);
    if (err) return;

    setLoading(true);
    const result = await postJson("/api/auth/forgot-password", { email });
    if (!result.ok) {
      setLoading(false);
      setFormError(result.error.fields?.email ?? result.error.message);
      return;
    }
    // Chuyển sang bước nhập mã. Trang sau luôn báo "nếu email đã đăng ký..." nên không lộ email có tồn tại hay không.
    router.push(`/reset-password?email=${encodeURIComponent(normalizeEmail(email))}`);
  }

  return (
    <AuthShell>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-gold">Khôi phục tài khoản</p>
      <h1 className="mb-2 font-serif text-[32px] font-semibold text-ink">Quên mật khẩu?</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-ink-soft">
        Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác nhận gồm 6 chữ số để bạn đặt mật khẩu mới.
      </p>

      {formError && <FormAlert tone="error">{formError}</FormAlert>}

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

        <Button loading={loading}>Gửi mã xác nhận</Button>

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
