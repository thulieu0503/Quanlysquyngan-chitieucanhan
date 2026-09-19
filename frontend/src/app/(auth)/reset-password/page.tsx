"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { CheckCircleIcon, LockIcon } from "@/components/ui/icons";
import { validateConfirmPassword, validatePassword } from "@/lib/validators/auth";

type Errors = { password?: string; confirm?: string };

function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Errors = {
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setSuccess(false);
      return;
    }
    setSuccess(true);
    // TODO: gọi API /api/auth/reset-password kèm `token` khi backend sẵn sàng.
  }

  return (
    <AuthShell>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-gold">
        Khôi phục tài khoản
      </p>
      <h1 className="mb-2 font-serif text-[32px] font-semibold text-ink">Đặt lại mật khẩu</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-ink-soft">
        Tạo mật khẩu mới cho tài khoản của bạn.
      </p>

      {!token && (
        <div className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3">
          <span className="text-[13.5px] font-medium text-red-700">
            Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.
          </span>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-green/30 bg-green/10 px-3.5 py-3">
          <CheckCircleIcon className="h-[18px] w-[18px] flex-shrink-0 text-green" />
          <span className="text-[13.5px] font-medium text-green-dark">
            Đặt lại mật khẩu thành công! (bản demo giao diện)
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Mật khẩu mới"
          type="password"
          placeholder="Tối thiểu 6 ký tự"
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

        <button
          type="submit"
          disabled={!token}
          className="mt-1.5 h-[50px] rounded-[10px] bg-gold text-[15px] font-bold text-ink shadow-[0_10px_24px_rgba(201,151,43,0.35)] transition-colors hover:bg-gold-dark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          Đặt lại mật khẩu
        </button>

        <p className="mt-1 text-center text-[13.5px] text-ink-soft">
          <Link href="/login" className="font-semibold text-green hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
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
