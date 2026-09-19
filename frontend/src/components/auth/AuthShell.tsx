import { ReportIcon, ShieldIcon, TrendingUpIcon } from "@/components/ui/icons";

function Logo({ light = true }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 38 38" fill="none">
        <circle cx="19" cy="19" r="16.5" stroke="#C9972B" strokeWidth="2" />
        <path
          d="M13 21c1.5 3 4 4.5 6.5 4.2 3-0.35 5-2.8 4.7-5.6-0.25-2.3-2.1-3.7-4.1-3.5-1.6 0.17-2.7 1.4-2.55 2.75 0.12 1.1 1.05 1.85 2.05 1.75"
          stroke={light ? "#F7F1E3" : "#1F6E4A"}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="19" cy="12.5" r="1.4" fill="#C9972B" />
      </svg>
      <span className={`font-serif text-xl font-semibold ${light ? "text-[#F7F1E3]" : "text-ink"}`}>
        VíVàng
      </span>
    </div>
  );
}

const pills = [
  { icon: ShieldIcon, label: "Bảo mật dữ liệu" },
  { icon: TrendingUpIcon, label: "Ngân sách thông minh" },
  { icon: ReportIcon, label: "Báo cáo trực quan" },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-cream">
      {/* LEFT: brand panel */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#164F36] via-green to-[#0F4C33] p-14 text-[#F7F1E3] lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-28 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(201,151,43,0.55)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-40 -left-28 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(201,151,43,0.3)_0%,transparent_72%)]" />

        <div className="relative">
          <Logo />
        </div>

        <div className="relative max-w-[400px]">
          <h1 className="mb-[18px] font-serif text-[34px] font-semibold leading-[1.28] text-[#FBF6E9]">
            Quản lý thu chi rõ ràng,
            <br />
            vun đắp sự thịnh vượng.
          </h1>
          <p className="mb-10 text-[15px] leading-[1.7] text-[#D8CFB4]">
            Ghi chép thu nhập &amp; chi tiêu, đặt ngân sách theo từng danh mục và theo dõi báo cáo
            trực quan — tất cả trong một nơi an toàn, riêng tư.
          </p>

          <svg width="260" height="140" viewBox="0 0 260 140" fill="none">
            <rect x="18" y="86" width="26" height="40" rx="6" fill="rgba(201,151,43,0.55)" />
            <rect x="56" y="64" width="26" height="62" rx="6" fill="rgba(201,151,43,0.75)" />
            <rect x="94" y="40" width="26" height="86" rx="6" fill="#C9972B" />
            <circle cx="196" cy="60" r="34" stroke="#F7F1E3" strokeWidth="1.4" opacity="0.55" />
            <circle cx="196" cy="60" r="24" stroke="#C9972B" strokeWidth="1.4" />
            <path
              d="M150 118c14 10 32 12 46 4M138 108c6-14 20-24 36-26"
              stroke="#F7F1E3"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
        </div>

        <div className="relative flex flex-wrap gap-2.5">
          {pills.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/[0.08] px-3 py-2"
            >
              <Icon className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs text-[#F0E9D6]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo light={false} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
