"use client";

import { useEffect, useState, useTransition } from "react";
import { getJson, postJson, putJson, deleteJson } from "@/lib/api-client";
import {
  PlusIcon,
  BellIcon,
  TrashIcon,
  EditIcon,
  XIcon,
} from "@/components/ui/icons";

type CategoryItem = {
  id: number;
  name: string;
};

type ReminderItem = {
  id: number;
  userId: number;
  categoryId: number | null;
  categoryName: string | null;
  title: string;
  amount: string | null;
  recurrence: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
  channel: "email" | "in_app" | "both";
  isActive: boolean;
};

function formatVND(amount: string | number | null) {
  if (!amount) return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
  yearly: "Hàng năm",
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "Trong ứng dụng",
  email: "Qua Email",
  both: "Email & Ứng dụng",
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReminderItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [channel, setChannel] = useState<"in_app" | "email" | "both">("in_app");
  const [nextRunDate, setNextRunDate] = useState(tomorrow);
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPending, startTransition] = useTransition();

  const fetchRemindersAndCategories = () => {
    setLoading(true);
    startTransition(async () => {
      const [rRes, cRes] = await Promise.all([
        getJson<ReminderItem[]>("/api/reminders"),
        getJson<CategoryItem[]>("/api/categories"),
      ]);
      if (rRes.ok && Array.isArray(rRes.data)) setReminders(rRes.data);
      else setReminders([]);
      if (cRes.ok && Array.isArray(cRes.data)) setCategories(cRes.data);
      else setCategories([]);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchRemindersAndCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditItem(null);
    setTitle("");
    setCategoryId("");
    setAmount("");
    setRecurrence("monthly");
    setChannel("in_app");
    setNextRunDate(tomorrow);
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (r: ReminderItem) => {
    setEditItem(r);
    setTitle(r.title);
    setCategoryId(r.categoryId ? String(r.categoryId) : "");
    setAmount(r.amount || "");
    setRecurrence(r.recurrence);
    setChannel(r.channel);
    setNextRunDate(r.nextRunDate.split("T")[0]);
    setIsActive(r.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      categoryId: categoryId ? Number(categoryId) : undefined,
      amount: amount ? Number(amount) : undefined,
      recurrence,
      channel,
      nextRunDate,
      isActive,
    };

    if (editItem) {
      const res = await putJson(`/api/reminders/${editItem.id}`, payload);
      if (res.ok) {
        setModalOpen(false);
        fetchRemindersAndCategories();
      } else {
        setFormError(res.error.message);
      }
    } else {
      const res = await postJson("/api/reminders", payload);
      if (res.ok) {
        setModalOpen(false);
        fetchRemindersAndCategories();
      } else {
        setFormError(res.error.message);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    const res = await deleteJson(`/api/reminders/${id}`);
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchRemindersAndCategories();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">Nhắc nhở chi tiêu</h1>
          <p className="text-sm text-ink-soft mt-1">Cài đặt lịch nhắc các khoản chi tiêu hoặc hóa đơn định kỳ</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark transition-all self-start sm:self-auto"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Tạo nhắc nhở mới</span>
        </button>
      </div>

      {/* Reminders List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-xs text-ink-soft">Đang tải danh sách nhắc nhở...</p>
          </div>
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border bg-white">
          <BellIcon className="h-12 w-12 text-border mb-3" />
          <h3 className="font-serif font-bold text-ink text-base">Chưa có lịch nhắc nhở nào</h3>
          <p className="text-xs text-ink-soft mt-1 max-w-sm">
            Thêm nhắc nhở để không bỏ lỡ hạn thanh toán tiền nhà, điện nước, trả góp hay học phí.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-white hover:bg-gold-dark"
          >
            Tạo nhắc nhở đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reminders.map((r) => {
            return (
              <div
                key={r.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-all flex flex-col justify-between ${
                  r.isActive ? "border-border hover:shadow-md" : "border-border/60 opacity-70 bg-cream/30"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-ink text-base line-clamp-1">{r.title}</h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold shrink-0 ${
                        r.isActive ? "bg-green-tint text-green-dark" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {r.isActive ? "Đang bật" : "Đã tắt"}
                    </span>
                  </div>

                  {r.amount && (
                    <p className="font-mono font-bold text-red-600 text-lg mb-2">
                      {formatVND(r.amount)}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
                    <span className="rounded-md bg-gold-tint/60 text-gold-dark font-medium px-2 py-0.5">
                      🔄 {RECURRENCE_LABELS[r.recurrence]}
                    </span>
                    <span className="rounded-md bg-cream text-ink-soft font-medium px-2 py-0.5 border border-border">
                      📡 {CHANNEL_LABELS[r.channel]}
                    </span>
                    {r.categoryName && (
                      <span className="rounded-md bg-slate-100 text-ink-soft font-medium px-2 py-0.5">
                        📁 {r.categoryName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-ink-soft">
                  <div>
                    <span className="text-[11px] block">Lần nhắc tới:</span>
                    <span className="font-mono font-semibold text-ink">
                      {r.nextRunDate.split("T")[0]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1 text-ink-soft hover:text-gold-dark hover:bg-gold-tint/40 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(r.id)}
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
                {editItem ? "Sửa nhắc nhở" : "Tạo nhắc nhở mới"}
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
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Tiêu đề nhắc nhở
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trả tiền thuê nhà, Tiền điện nước..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={150}
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Số tiền dự kiến (tùy chọn)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ví dụ: 3500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink font-mono focus:border-gold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="modal-reminder-category-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Danh mục liên quan (tùy chọn)
                </label>
                <select
                  id="modal-reminder-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                >
                  <option value="">-- Không gắn danh mục --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-recurrence-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Tần suất
                  </label>
                  <select
                    id="modal-recurrence-select"
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
                    className="w-full rounded-xl border border-border bg-cream/40 px-3 py-2 text-xs sm:text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                  >
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                    <option value="yearly">Hàng năm</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="modal-channel-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                    Kênh nhận
                  </label>
                  <select
                    id="modal-channel-select"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as typeof channel)}
                    className="w-full rounded-xl border border-border bg-cream/40 px-3 py-2 text-xs sm:text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                  >
                    <option value="in_app">Trong ứng dụng</option>
                    <option value="email">Qua Email</option>
                    <option value="both">Cả hai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Ngày nhắc kế tiếp
                </label>
                <input
                  type="date"
                  value={nextRunDate}
                  onChange={(e) => setNextRunDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveModalToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-gold focus:ring-gold"
                />
                <label htmlFor="isActiveModalToggle" className="text-sm font-medium text-ink cursor-pointer">
                  Kích hoạt lịch nhắc này
                </label>
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
                  {isSubmitting ? "Đang lưu..." : editItem ? "Lưu thay đổi" : "Tạo nhắc nhở"}
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
            <h3 className="font-serif text-lg font-bold text-ink">Xác nhận xóa nhắc nhở</h3>
            <p className="text-xs text-ink-soft mt-1.5">
              Lịch nhắc này sẽ bị xóa vĩnh viễn và không gửi thông báo trong tương lai nữa.
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
                Xóa nhắc nhở
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
