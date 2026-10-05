"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { getJson, postJson, putJson, deleteJson } from "@/lib/api-client";
import {
  PlusIcon,
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  EditIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ReceiptIcon,
} from "@/components/ui/icons";

type CategoryItem = {
  id: number;
  name: string;
  type: "income" | "expense";
  userId: number | null;
};

type TransactionItem = {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  type: "income" | "expense";
  amount: string;
  transactionDate: string;
  note: string | null;
};

type PaginatedResult = {
  data: TransactionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function formatVND(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loaded, setLoaded] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "income" | "expense">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<TransactionItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    categoryId: "",
    amount: "",
    transactionDate: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPending, startTransition] = useTransition();
  // Lần tải đầu: hiện loading đến khi có dữ liệu; các lần sau dựa vào isPending của transition.
  const loading = isPending || !loaded;

  // Load Categories once
  useEffect(() => {
    getJson<CategoryItem[]>("/api/categories").then((res) => {
      if (res.ok) setCategories(res.data);
    });
  }, []);

  // Fetch Transactions
  const fetchTransactions = (currentPage = page) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "15");
      if (typeFilter) params.set("type", typeFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await getJson<PaginatedResult>(`/api/transactions?${params.toString()}`);
      if (res.ok && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setTransactions(list);
        setTotal(res.data.total ?? list.length);
        setPage(res.data.page ?? 1);
        setTotalPages(res.data.totalPages ?? 1);
      } else {
        setTransactions([]);
        setTotal(0);
      }
      setLoaded(true);
    });
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [typeFilter, categoryFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    const defaultCats = categories.filter((c) => c.type === "expense");
    setFormData({
      type: "expense",
      categoryId: defaultCats[0]?.id ? String(defaultCats[0].id) : "",
      amount: "",
      transactionDate: new Date().toISOString().split("T")[0],
      note: "",
    });
    setEditItem(null);
    setFormError(null);
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (tx: TransactionItem) => {
    setEditItem(tx);
    setFormData({
      type: tx.type,
      categoryId: String(tx.categoryId),
      amount: tx.amount,
      transactionDate: tx.transactionDate.split("T")[0],
      note: tx.note || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Handle Submit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      categoryId: Number(formData.categoryId),
      type: formData.type,
      amount: Number(formData.amount),
      transactionDate: formData.transactionDate,
      note: formData.note.trim() || undefined,
    };

    if (editItem) {
      const res = await putJson(`/api/transactions/${editItem.id}`, payload);
      if (res.ok) {
        setModalOpen(false);
        fetchTransactions(page);
      } else {
        setFormError(res.error.message);
      }
    } else {
      const res = await postJson("/api/transactions", payload);
      if (res.ok) {
        setModalOpen(false);
        fetchTransactions(1);
      } else {
        setFormError(res.error.message);
      }
    }
    setIsSubmitting(false);
  };

  // Handle Delete
  const handleDelete = async (id: number) => {
    const res = await deleteJson(`/api/transactions/${id}`);
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchTransactions(page);
    }
  };

  // Handle CSV Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    setImportStatus("Đang nhập...");
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv; charset=utf-8" },
        body: importText,
      });
      const data = await res.json();
      if (res.ok) {
        setImportStatus(`Nhập thành công ${data.inserted} giao dịch!`);
        setTimeout(() => {
          setImportModalOpen(false);
          setImportText("");
          setImportStatus(null);
          fetchTransactions(1);
        }, 1200);
      } else {
        setImportStatus(`Lỗi: ${data.error?.message || "Nhập thất bại"}`);
      }
    } catch {
      setImportStatus("Lỗi mạng khi kết nối máy chủ");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">Sổ giao dịch</h1>
          <p className="text-sm text-ink-soft mt-1">Ghi nhận, tra cứu và phân loại thu nhập / chi tiêu ({total} bản ghi)</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export CSV button */}
          <a
            href="/api/transactions/export"
            download
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-ink shadow-sm hover:bg-cream transition-all"
          >
            <DownloadIcon className="h-4 w-4 text-ink-soft" />
            <span>Xuất CSV</span>
          </a>

          {/* Import CSV button */}
          <button
            onClick={() => {
              setImportText("");
              setImportStatus(null);
              setImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-ink shadow-sm hover:bg-cream transition-all"
          >
            <UploadIcon className="h-4 w-4 text-ink-soft" />
            <span>Nhập CSV</span>
          </button>

          {/* Create button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Thêm giao dịch</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search by note */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
            <input
              type="text"
              placeholder="Tìm kiếm theo ghi chú giao dịch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-cream/40 pl-9 pr-4 py-2 text-sm text-ink placeholder:text-ink-soft/70 focus:border-gold focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "" | "income" | "expense")}
              aria-label="Lọc theo loại giao dịch"
              className="rounded-xl border border-border bg-cream/40 px-3 py-2 text-xs sm:text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="">Tất cả loại</option>
              <option value="income">Thu nhập (+)</option>
              <option value="expense">Chi tiêu (-)</option>
            </select>

            {/* Filter by Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Lọc theo danh mục"
              className="rounded-xl border border-border bg-cream/40 px-3 py-2 text-xs sm:text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "income" ? "Thu" : "Chi"})
                </option>
              ))}
            </select>

            {/* Date range filters */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Từ ngày"
              className="rounded-xl border border-border bg-cream/40 px-2.5 py-1.5 text-xs sm:text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
            />
            <span className="text-ink-soft text-xs">đến</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Đến ngày"
              className="rounded-xl border border-border bg-cream/40 px-2.5 py-1.5 text-xs sm:text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
            />

            <button
              type="submit"
              className="rounded-xl bg-ink px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-ink-muted transition-colors"
            >
              Lọc
            </button>
          </div>
        </form>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              <p className="text-xs text-ink-soft">Đang tải dữ liệu giao dịch...</p>
            </div>
          </div>
        ) : (!transactions || transactions.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ReceiptIcon className="h-12 w-12 text-border mb-3" />
            <h3 className="font-serif font-bold text-ink text-base">Không tìm thấy giao dịch nào</h3>
            <p className="text-xs text-ink-soft mt-1">Hãy thử thay đổi bộ lọc hoặc thêm một giao dịch mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-cream/50 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-5 py-3.5">Ngày</th>
                  <th className="px-5 py-3.5">Danh mục</th>
                  <th className="px-5 py-3.5">Ghi chú</th>
                  <th className="px-5 py-3.5 text-right">Số tiền</th>
                  <th className="px-5 py-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(transactions || []).map((tx) => {
                  const isIncome = tx.type === "income";
                  return (
                    <tr key={tx.id} className="hover:bg-cream/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-ink-soft">
                        {tx.transactionDate.split("T")[0]}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                            isIncome
                              ? "bg-green-tint text-green-dark"
                              : "bg-gold-tint/70 text-gold-dark font-semibold"
                          }`}
                        >
                          {tx.categoryName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink max-w-[280px] truncate">
                        {tx.note || <span className="text-ink-soft/50 italic">Không có</span>}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right whitespace-nowrap font-mono font-bold ${
                          isIncome ? "text-green" : "text-red-600"
                        }`}
                      >
                        {isIncome ? `+${formatVND(tx.amount)}` : `-${formatVND(tx.amount)}`}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            title="Chỉnh sửa"
                            className="p-1.5 text-ink-soft hover:text-gold-dark hover:bg-gold-tint/40 rounded-lg transition-colors"
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(tx.id)}
                            title="Xóa"
                            className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-cream/20 text-xs text-ink-soft">
            <span>
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng {total} giao dịch)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => fetchTransactions(page - 1)}
                className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" /> Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchTransactions(page + 1)}
                className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream"
              >
                Sau <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-lg font-bold text-ink">
                {editItem ? "Sửa giao dịch" : "Thêm giao dịch mới"}
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

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Loại giao dịch
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        type: "expense",
                        categoryId: String(categories.find((c) => c.type === "expense")?.id || ""),
                      }));
                    }}
                    className={`rounded-xl py-2 text-sm font-semibold transition-all ${
                      formData.type === "expense"
                        ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                        : "border border-border bg-cream/40 text-ink-soft hover:bg-white"
                    }`}
                  >
                    Chi tiêu (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        type: "income",
                        categoryId: String(categories.find((c) => c.type === "income")?.id || ""),
                      }));
                    }}
                    className={`rounded-xl py-2 text-sm font-semibold transition-all ${
                      formData.type === "income"
                        ? "bg-green text-white shadow-md shadow-green/20"
                        : "border border-border bg-cream/40 text-ink-soft hover:bg-white"
                    }`}
                  >
                    Thu nhập (+)
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="tx-category-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Danh mục
                </label>
                <select
                  id="tx-category-select"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                >
                  <option value="" disabled>-- Chọn danh mục --</option>
                  {categories
                    .filter((c) => c.type === formData.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Số tiền (VNĐ)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ví dụ: 50000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="1"
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink font-mono font-semibold focus:border-gold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Ngày giao dịch
                </label>
                <input
                  type="date"
                  value={formData.transactionDate}
                  onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                  required
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Ghi chú (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cà phê cùng bạn bè"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  maxLength={255}
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                />
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
                  {isSubmitting ? "Đang lưu..." : editItem ? "Lưu thay đổi" : "Thêm giao dịch"}
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
            <h3 className="font-serif text-lg font-bold text-ink">Xác nhận xóa giao dịch</h3>
            <p className="text-xs text-ink-soft mt-1.5">
              Giao dịch này sẽ được chuyển vào thùng rác (xóa mềm).
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
                Xóa giao dịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-lg font-bold text-ink">Nhập giao dịch từ CSV</h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-lg hover:bg-cream"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-ink-soft bg-cream/70 rounded-xl p-3 border border-border">
              <p className="font-semibold text-ink">Định dạng file CSV chuẩn:</p>
              <code className="block mt-1 text-[11px] text-gold-dark font-mono">
                date,type,category,amount,note<br />
                2026-09-20,expense,Ăn uống,45000,Cà phê<br />
                2026-09-21,income,Lương,15000000,Lương tháng 9
              </code>
            </div>

            {importStatus && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                {importStatus}
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm hover:bg-cream"
                >
                  📁 Chọn file CSV từ máy
                </button>
                <span className="text-xs text-ink-soft">hoặc dán trực tiếp nội dung vào bên dưới</span>
              </div>

              <textarea
                rows={6}
                placeholder="Dán nội dung CSV vào đây..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full rounded-xl border border-border bg-cream/40 p-3 text-xs font-mono text-ink placeholder:text-ink-soft/70 focus:border-gold focus:bg-white focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-cream"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!importText.trim()}
                  className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark disabled:opacity-50"
                >
                  Bắt đầu nhập dữ liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
