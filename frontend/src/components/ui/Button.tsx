type ButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({ children, type = "submit", loading = false, disabled = false, onClick }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="mt-1.5 h-[50px] rounded-[10px] bg-gold text-[15px] font-bold text-ink shadow-[0_10px_24px_rgba(201,151,43,0.35)] transition-colors hover:bg-gold-dark active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Đang xử lý…" : children}
    </button>
  );
}
