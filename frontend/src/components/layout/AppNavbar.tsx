"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/api-client";
import {
  TrendingUpIcon,
  ReceiptIcon,
  FolderIcon,
  TargetIcon,
  ReportIcon,
  BellIcon,
  ShieldIcon,
  LogOutIcon,
  UserIcon,
} from "@/components/ui/icons";

type AppNavbarProps = {
  user: {
    id: string | number;
    email?: string | null;
    name?: string | null;
    role: "admin" | "user";
  };
};

export function AppNavbar({ user }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Tổng quan", icon: TrendingUpIcon },
    { href: "/transactions", label: "Giao dịch", icon: ReceiptIcon },
    { href: "/categories", label: "Danh mục", icon: FolderIcon },
    { href: "/budgets", label: "Ngân sách", icon: TargetIcon },
    { href: "/reports", label: "Báo cáo", icon: ReportIcon },
    { href: "/reminders", label: "Nhắc nhở", icon: BellIcon },
    ...(user.role === "admin"
      ? [{ href: "/admin", label: "Quản trị", icon: ShieldIcon }]
      : []),
  ];

  const handleSignOut = async () => {
    await postJson("/api/auth/logout", {});
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-amber-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white font-black text-lg shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                V
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  VíVàng
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Pro
                  </span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">
                {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col text-left text-xs leading-tight">
                <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                  {user.name || user.email}
                </span>
                <span className="text-[10px] text-slate-500 capitalize">
                  {user.role === "admin" ? "Quản trị viên" : "Thành viên"}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOutIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 flex flex-col gap-1">
            <div className="px-3 py-2 bg-slate-50 rounded-lg mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">
                  {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-800">{user.name || user.email}</span>
                  <span className="text-[10px] text-slate-500">{user.role === "admin" ? "Quản trị viên" : "Thành viên"}</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-xs text-rose-600 font-semibold px-2 py-1 rounded hover:bg-rose-50"
              >
                Đăng xuất
              </button>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-amber-500 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
