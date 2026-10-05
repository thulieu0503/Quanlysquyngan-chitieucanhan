"use client";

import { useEffect, useState, useTransition } from "react";
import { getJson } from "@/lib/api-client";
import {
  ReportIcon,
  DownloadIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

type MonthlyReport = {
  year: number;
  month: number;
  totalIncome: string;
  totalExpense: string;
  balance: string;
  byCategory: {
    categoryId: number;
    categoryName: string;
    type: "income" | "expense";
    total: string;
    transactionCount: number;
  }[];
  byDay: {
    date: string;
    income: string;
    expense: string;
  }[];
};

function formatVND(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

export default function ReportsPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const [isPending, startTransition] = useTransition();

  const fetchReport = (year: number, month: number) => {
    setLoading(true);
    startTransition(async () => {
      const res = await getJson<MonthlyReport>(`/api/reports/monthly?year=${year}&month=${month}`);
      if (res.ok) {
        setReport(res.data);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchReport(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const totalIncNum = parseFloat(report?.totalIncome || "0");
  const totalExpNum = parseFloat(report?.totalExpense || "0");
  const savingsRate = totalIncNum > 0 ? (((totalIncNum - totalExpNum) / totalIncNum) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">Báo cáo tài chính</h1>
          <p className="text-sm text-ink-soft mt-1">Phân tích chi tiết thu nhập, chi tiêu và dòng tiền theo tháng</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month/Year selector */}
          <div className="flex items-center rounded-xl border border-border bg-white px-3 py-1.5 shadow-sm">
            <label htmlFor="report-page-month-select" className="text-xs font-medium text-ink-soft mr-2">Tháng:</label>
            <select
              id="report-page-month-select"
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

          <a
            href={`/api/reports/export?year=${selectedYear}&month=${selectedMonth}`}
            download
            className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark transition-all"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Tải báo cáo CSV</span>
          </a>
        </div>
      </div>

      {loading && !report ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-sm text-ink-soft">Đang tính toán báo cáo...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tổng thu nhập</span>
              <p className="mt-2 font-serif text-xl sm:text-2xl font-bold text-green">
                {formatVND(report?.totalIncome || "0")}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tổng chi tiêu</span>
              <p className="mt-2 font-serif text-xl sm:text-2xl font-bold text-red-600">
                {formatVND(report?.totalExpense || "0")}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Số dư ròng</span>
              <p
                className={`mt-2 font-serif text-xl sm:text-2xl font-bold ${
                  parseFloat(report?.balance || "0") >= 0 ? "text-ink" : "text-red-600"
                }`}
              >
                {formatVND(report?.balance || "0")}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tỷ lệ tiết kiệm</span>
              <p
                className={`mt-2 font-serif text-xl sm:text-2xl font-bold ${
                  parseFloat(savingsRate) >= 20
                    ? "text-green"
                    : parseFloat(savingsRate) >= 0
                    ? "text-gold-dark"
                    : "text-red-600"
                }`}
              >
                {savingsRate}%
              </p>
            </div>
          </div>

          {/* Breakdown by Category Table */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-lg font-bold text-ink">Phân tích chi tiết theo danh mục</h2>

            {report?.byCategory && report.byCategory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-cream/50 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="px-4 py-3">Danh mục</th>
                      <th className="px-4 py-3">Loại</th>
                      <th className="px-4 py-3 text-center">Số giao dịch</th>
                      <th className="px-4 py-3 text-right">Tổng tiền</th>
                      <th className="px-4 py-3 text-right">Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.byCategory.map((cat) => {
                      const isExpense = cat.type === "expense";
                      const amount = parseFloat(cat.total);
                      const baseTotal = isExpense ? totalExpNum : totalIncNum;
                      const share = baseTotal > 0 ? ((amount / baseTotal) * 100).toFixed(1) : "0";

                      return (
                        <tr key={cat.categoryId} className="hover:bg-cream/20">
                          <td className="px-4 py-3 font-semibold text-ink">{cat.categoryName}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                                isExpense ? "bg-red-50 text-red-700" : "bg-green-tint text-green-dark"
                              }`}
                            >
                              {isExpense ? "Chi tiêu" : "Thu nhập"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-ink-soft">
                            {cat.transactionCount}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold font-mono ${
                              isExpense ? "text-red-600" : "text-green"
                            }`}
                          >
                            {formatVND(cat.total)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-ink-soft font-mono">
                            {share}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-ink-soft">
                Không có dữ liệu danh mục trong tháng {selectedMonth}/{selectedYear}
              </div>
            )}
          </div>

          {/* Daily Totals Table */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-lg font-bold text-ink">Bảng biến động thu chi theo ngày</h2>

            {report?.byDay && report.byDay.length > 0 ? (
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-cream/50 text-xs font-semibold uppercase tracking-wider text-ink-soft sticky top-0 bg-cream">
                    <tr>
                      <th className="px-4 py-3">Ngày</th>
                      <th className="px-4 py-3 text-right text-green">Thu nhập (+)</th>
                      <th className="px-4 py-3 text-right text-red-600">Chi tiêu (-)</th>
                      <th className="px-4 py-3 text-right">Chênh lệch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.byDay.map((d) => {
                      const inc = parseFloat(d.income);
                      const exp = parseFloat(d.expense);
                      const diff = inc - exp;

                      return (
                        <tr key={d.date} className="hover:bg-cream/20">
                          <td className="px-4 py-2.5 font-mono text-xs text-ink font-medium">{d.date}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-green text-xs">
                            {inc > 0 ? `+${formatVND(inc)}` : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-red-600 text-xs">
                            {exp > 0 ? `-${formatVND(exp)}` : "-"}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono font-bold text-xs ${
                              diff >= 0 ? "text-ink" : "text-red-600"
                            }`}
                          >
                            {formatVND(diff)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-ink-soft">Chưa có giao dịch theo ngày</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
