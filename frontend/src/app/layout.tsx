import type { Metadata } from "next";
import { Cormorant_Garamond, Work_Sans } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
});

const sans = Work_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "VíVàng — Quản lý Thu Chi Cá Nhân",
  description: "Ghi chép thu nhập & chi tiêu, đặt ngân sách, theo dõi báo cáo tài chính cá nhân.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${serif.variable} ${sans.variable} font-sans bg-cream text-ink`}>
        {children}
      </body>
    </html>
  );
}
