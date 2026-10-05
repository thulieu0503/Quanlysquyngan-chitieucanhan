"use client";

import { useEffect, useState, useTransition } from "react";
import { getJson, postJson, putJson, deleteJson } from "@/lib/api-client";
import {
  PlusIcon,
  TargetIcon,
  TrashIcon,
  EditIcon,
  XIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";

type CategoryItem = {
  id: number;
  name: string;
  type: "income" | "expense";
};

type BudgetUsageItem = {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  amountLimit: string;
  periodStart: string;
  periodEnd: string;
  amountUsed: string;
  percentUsed: number;
  status: "ok" | "warning" | "exceeded";
};

function formatVND(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetUsageItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetUsageItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [categoryId, setCategoryId] = useState("");
  const [amountLimit, setAmountLimit] = useState("");
  const [periodStart, setPeriodStart] = useState(firstDay);
  const [periodEnd, setPeriodEnd] = useState(lastDay);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPending, startTransition] = useTransition();

  const fetchBudgetsAndCategories = () => {
    setLoading(true);
    startTransition(async () => {
      const [bRes, cRes] = await Promise.all([
        getJson<BudgetUsageItem[]>("/api/budgets"),
        getJson<CategoryItem[]>("/api/categories"),
      ]);
      if (bRes.ok && Array.isArray(bRes.data)) setBudgets(bRes.data);
      else setBudgets([]);
      if (cRes.ok && Array.isArray(cRes.data)) setCategories(cRes.data.filter((c) => c.type === "expense"));
      else setCategories([]);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchBudgetsAndCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditItem(null);
    setCategoryId(categories[0]?.id ? String(categories[0].id) : "");
    setAmountLimit("");
    setPeriodStart(firstDay);
    setPeriodEnd(lastDay);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (b: BudgetUsageItem) => {
    setEditItem(b);
    setCategoryId(String(b.categoryId));
    setAmountLimit(b.amountLimit);
    setPeriodStart(b.periodStart.split("T")[0]);
    setPeriodEnd(b.periodEnd.split("T")[0]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const limitNum = Number(amountLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setFormError("Hạn mức phải lớn hơn 0");
      setIsSubmitting(false);
      return;
    }

    if (editItem) {
      const res = await putJson(`/api/budgets/${editItem.id}`, {
        amountLimit: limitNum,
        periodStart,
        periodEnd,
      });
      if (res.ok) {
        setModalOpen(false);
        fetchBudgetsAndCategories();
      } else {
        setFormError(res.error.message);
      }
    } else {
      const res = await postJson("/api/budgets", {
        categoryId: Number(categoryId),
        amountLimit: limitNum,
        periodStart,
        periodEnd,
      });
      if (res.ok) {
        setModalOpen(false);
        fetchBudgetsAndCategories();
      } else {
        setFormError(res.error.message);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    const res = await deleteJson(`/api/budgets/${id}`);
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchBudgetsAndCategories();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">Quản lý Ngân sách</h1>
          <p className="text-sm text-ink-soft mt-1">Thiết lập hạn mức chi tiêu và kiểm soát dòng tiền thông minh</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark transition-all self-start sm:self-auto"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Thiết lập ngân sách</span>
        </button>
      </div>

      {/* Budgets Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-xs text-ink-soft">Đang tải danh sách ngân sách...</p>
          </div>
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border bg-white">
          <TargetIcon className="h-12 w-12 text-border mb-3" />
          <h3 className="font-serif font-bold text-ink text-base">Chưa có ngân sách nào được thiết lập</h3>
          <p className="text-xs text-ink-soft mt-1 max-w-sm">
            Tạo ngân sách cho từng danh mục chi tiêu giúp bạn luôn chi tiêu trong tầm kiểm soát.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-white hover:bg-gold-dark"
          >
            Tạo ngân sách đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b) => {
            const limit = parseFloat(b.amountLimit);
            const used = parseFloat(b.amountUsed);
            const remaining = limit - used;
            const percent = b.percentUsed;

            return (
              <div
                key={b.id}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-ink text-base flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                      {b.categoryName}
                    </h3>

                    {b.status === "exceeded" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        <AlertTriangleIcon className="h-3 w-3" /> Vượt mức ({percent}%)
                      </span>
                    ) : b.status === "warning" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        <AlertTriangleIcon className="h-3 w-3" /> Cảnh báo ({percent}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-tint px-2 py-0.5 text-[11px] font-bold text-green-dark">
                        <CheckCircleIcon className="h-3 w-3" /> An toàn ({percent}%)
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 my-3">
                    <div className="h-3 w-full rounded-full bg-cream overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.status === "exceeded"
                            ? "bg-red-500"
                            : b.status === "warning"
                            ? "bg-amber-500"
                            : "bg-green"
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border text-xs">
                    <div>
                      <span className="text-ink-soft block text-[11px]">Đã chi:</span>
                      <span className="font-semibold text-ink text-sm">{formatVND(used)}</span>
                    </div>
                    <div>
                      <span className="text-ink-soft block text-[11px]">Hạn mức:</span>
                      <span className="font-semibold text-ink text-sm">{formatVND(limit)}</span>
                    </div>
                    <div className="col-span-2 mt-1">
                      <span className="text-ink-soft block text-[11px]">
                        {remaining >= 0 ? "Còn lại:" : "Chi vượt:"}
                      </span>
                      <span
                        className={`font-bold text-sm ${
                          remaining >= 0 ? "text-green" : "text-red-600 font-mono"
                        }`}
                      >
                        {formatVND(Math.abs(remaining))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-ink-soft">
                  <span className="font-mono text-[11px]">
                    {b.periodStart.split("T")[0]} → {b.periodEnd.split("T")[0]}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1 text-ink-soft hover:text-gold-dark hover:bg-gold-tint/40 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(b.id)}
                      className="p-1 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-lg font-bold text-ink">
                {editItem ? "Sửa ngân sách" : "Thiết lập ngân sách mới"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-lg hover:bg-cream"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {!editItem && (
                <div>
                  <label htmlFor="modal-budget-category-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Danh mục chi tiêu
                  </label>
                  <select
                    id="modal-budget-category-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                  >
                    <option value="" disabled>-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Hạn mức ngân sách (VNĐ)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ví dụ: 3000000"
                  value={amountLimit}
                  onChange={(e) => setAmountLimit(e.target.value)}
                  required
                  min="1"
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink font-mono font-semibold focus:border-gold focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-cream/40 px-3 py-2 text-xs sm:text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-cream/40 px-3 py-2 text-xs sm:text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-cream"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark disabled:opacity-50"
                >
                  {isSubmitting ? "Đang lưu..." : editItem ? "Lưu thay đổi" : "Lưu ngân sách"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
              <TrashIcon className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-ink">Xác nhận xóa ngân sách</h3>
            <p className="text-xs text-ink-soft mt-1.5">
              Hạn mức ngân sách này sẽ bị hủy bỏ.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-border bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-ink hover:bg-cream"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-red-600/20 hover:bg-red-700"
              >
                Xóa ngân sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
