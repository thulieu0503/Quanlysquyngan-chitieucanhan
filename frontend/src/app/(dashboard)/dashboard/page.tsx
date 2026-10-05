"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getJson } from "@/lib/api-client";
import {
  TrendingUpIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  AlertTriangleIcon,
  ReceiptIcon,
  PlusIcon,
  FolderIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";

type DashboardData = {
  summary: {
    totalIncome: string;
    totalExpense: string;
    balance: string;
    month: string;
  };
  topCategories: {
    categoryId: number;
    categoryName: string;
    type: "income" | "expense";
    total: string;
    transactionCount: number;
  }[];
  dailyTotals: {
    date: string;
    income: string;
    expense: string;
  }[];
  budgetAlerts: {
    budgetId: number;
    categoryName: string;
    amountLimit: string;
    amountUsed: string;
    percentUsed: number;
    status: "warning" | "exceeded";
  }[];
};

function formatVND(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

export default function DashboardPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isPending, startTransition] = useTransition();
  // Lần tải đầu: hiện loading đến khi có dữ liệu; các lần sau dựa vào isPending của transition.
  const loading = isPending || !loaded;

  const fetchDashboard = (year: number, month: number) => {
    startTransition(async () => {
      const res = await getJson<DashboardData>(`/api/dashboard?year=${year}&month=${month}`);
      if (res.ok) {
        setData(res.data);
      }
      setLoaded(true);
    });
  };

  useEffect(() => {
    fetchDashboard(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const totalExpenseNum = parseFloat(data?.summary?.totalExpense || "0");

  return (
    <div className="space-y-8">
      {/* Top Header & Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">Tổng quan tài chính</h1>
          <p className="text-sm text-ink-soft mt-1">Theo dõi thu chi, số dư và hạn mức chi tiêu trong tháng</p>
        </div>

        {/* Date Filter & Quick Add */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-border bg-white px-3 py-1.5 shadow-sm">
            <label htmlFor="dashboard-month-select" className="text-xs font-medium text-ink-soft mr-2">Tháng:</label>
            <select
              id="dashboard-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-ink focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <span className="text-border mx-2">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-ink focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/transactions"
            className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Thêm giao dịch</span>
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-sm text-ink-soft">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Total Income */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tổng thu nhập</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-tint text-green">
                  <ArrowUpRightIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 font-serif text-2xl sm:text-3xl font-bold text-green">
                {formatVND(data?.summary?.totalIncome || "0")}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Tháng {selectedMonth}/{selectedYear}</p>
            </div>

            {/* Total Expense */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tổng chi tiêu</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ArrowDownLeftIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 font-serif text-2xl sm:text-3xl font-bold text-red-600">
                {formatVND(data?.summary?.totalExpense || "0")}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Tháng {selectedMonth}/{selectedYear}</p>
            </div>

            {/* Net Balance */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Số dư trong tháng</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-tint/60 text-gold-dark">
                  <TrendingUpIcon className="h-5 w-5" />
                </div>
              </div>
              <p
                className={`mt-4 font-serif text-2xl sm:text-3xl font-bold ${
                  parseFloat(data?.summary?.balance || "0") >= 0 ? "text-ink" : "text-red-600"
                }`}
              >
                {formatVND(data?.summary?.balance || "0")}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Thu nhập - Chi tiêu</p>
            </div>
          </div>

          {/* Budget Alerts Section */}
          {data?.budgetAlerts && data.budgetAlerts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-amber-900 text-sm">Cảnh báo ngân sách chi tiêu ({data.budgetAlerts.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.budgetAlerts.map((b) => (
                  <div key={b.budgetId} className="rounded-xl border border-amber-200/80 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-ink text-sm">{b.categoryName}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          b.status === "exceeded"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {b.status === "exceeded" ? "Đã vượt" : "Sắp hết"} ({b.percentUsed}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-1.5">
                      <div
                        className={`h-full transition-all ${
                          b.status === "exceeded" ? "bg-red-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-ink-soft">
                      <span>Đã chi: {formatVND(b.amountUsed)}</span>
                      <span>Hạn mức: {formatVND(b.amountLimit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Categories Card */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg font-bold text-ink">Top danh mục chi tiêu</h2>
                  <Link href="/categories" className="text-xs font-semibold text-gold-dark hover:underline flex items-center gap-1">
                    Xem tất cả <ChevronRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {data?.topCategories && data.topCategories.length > 0 ? (
                  <div className="space-y-4">
                    {data.topCategories.map((c) => {
                      const amountNum = parseFloat(c.total);
                      const percent = totalExpenseNum > 0 ? ((amountNum / totalExpenseNum) * 100).toFixed(1) : "0";
                      return (
                        <div key={c.categoryId} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-ink flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-gold" />
                              {c.categoryName}
                              <span className="text-xs text-ink-soft">({c.transactionCount} lần)</span>
                            </span>
                            <span className="font-semibold text-ink">
                              {formatVND(c.total)} <span className="text-xs text-ink-soft font-normal">({percent}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-cream overflow-hidden">
                            <div
                              className="h-full bg-gold rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FolderIcon className="h-10 w-10 text-border mb-2" />
                    <p className="text-sm text-ink-soft">Chưa có giao dịch chi tiêu nào trong tháng này</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-xs text-ink-soft">
                <span>Dữ liệu tính trên các giao dịch hợp lệ</span>
                <Link href="/budgets" className="text-gold-dark font-medium hover:underline">
                  Quản lý ngân sách →
                </Link>
              </div>
            </div>

            {/* Daily Totals Visualization */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg font-bold text-ink">Biểu đồ thu chi trong tháng</h2>
                  <Link href="/reports" className="text-xs font-semibold text-gold-dark hover:underline flex items-center gap-1">
                    Báo cáo chi tiết <ChevronRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {data?.dailyTotals && data.dailyTotals.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {data.dailyTotals.map((d) => {
                      const inc = parseFloat(d.income);
                      const exp = parseFloat(d.expense);
                      const dateObj = new Date(d.date);
                      const dayLabel = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

                      return (
                        <div key={d.date} className="flex items-center gap-3 text-xs">
                          <span className="w-12 text-ink-soft font-mono font-medium">{dayLabel}</span>
                          <div className="flex-1 flex flex-col gap-1">
                            {inc > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 rounded-full bg-green/80" style={{ width: `${Math.min((inc / 5000000) * 100, 100)}%`, minWidth: "8px" }} />
                                <span className="text-[11px] text-green font-medium">+{formatVND(inc)}</span>
                              </div>
                            )}
                            {exp > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 rounded-full bg-red-400" style={{ width: `${Math.min((exp / 5000000) * 100, 100)}%`, minWidth: "8px" }} />
                                <span className="text-[11px] text-red-600 font-medium">-{formatVND(exp)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ReceiptIcon className="h-10 w-10 text-border mb-2" />
                    <p className="text-sm text-ink-soft">Chưa có bản ghi thu chi nào trong tháng</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-green font-medium">
                    <span className="h-2 w-2 rounded-full bg-green" /> Thu nhập
                  </span>
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Chi tiêu
                  </span>
                </div>
                <Link href="/transactions" className="text-gold-dark font-medium hover:underline">
                  Xem lịch sử giao dịch →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
