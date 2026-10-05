"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

type TextFieldProps = {
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon?: React.ReactNode;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
  maxLength?: number;
};

export function TextField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  icon,
  autoComplete,
  inputMode,
  maxLength,
}: TextFieldProps) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-muted">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/70">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={resolvedType}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={`h-[46px] w-full rounded-[10px] border-[1.5px] bg-white pl-10 pr-4 text-[14.5px] text-ink outline-none transition-colors focus:border-green focus:ring-[3px] focus:ring-green/15 ${
            isPassword ? "pr-11" : ""
          } ${error ? "border-red-600" : "border-border"}`}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShow((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft/70 hover:text-ink-soft"
          >
            {show ? <EyeOffIcon className="h-[17px] w-[17px]" /> : <EyeIcon className="h-[17px] w-[17px]" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
