"use client";

import { useEffect, useState, useTransition } from "react";
import { getJson, postJson, putJson, deleteJson } from "@/lib/api-client";
import {
  PlusIcon,
  FolderIcon,
  TrashIcon,
  EditIcon,
  XIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/ui/icons";

type CategoryItem = {
  id: number;
  userId: number | null;
  name: string;
  type: "income" | "expense";
  createdAt: string;
  updatedAt: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "expense" | "income">("all");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<CategoryItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPending, startTransition] = useTransition();

  const fetchCategories = () => {
    setLoading(true);
    startTransition(async () => {
      const res = await getJson<CategoryItem[]>("/api/categories");
      if (res.ok && Array.isArray(res.data)) {
        setCategories(res.data);
      } else {
        setCategories([]);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditItem(null);
    setName("");
    setType(activeTab === "income" ? "income" : "expense");
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: CategoryItem) => {
    setEditItem(item);
    setName(item.name);
    setType(item.type);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (editItem) {
      const res = await putJson(`/api/categories/${editItem.id}`, { name, type });
      if (res.ok) {
        setModalOpen(false);
        fetchCategories();
      } else {
        setFormError(res.error.message);
      }
    } else {
      const res = await postJson("/api/categories", { name, type });
      if (res.ok) {
        setModalOpen(false);
        fetchCategories();
      } else {
        setFormError(res.error.message);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    const res = await deleteJson(`/api/categories/${id}`);
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchCategories();
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (activeTab === "all") return true;
    return c.type === activeTab;
  });

  const expenseCount = categories.filter((c) => c.type === "expense").length;
  const incomeCount = categories.filter((c) => c.type === "income").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">Danh mục thu / chi</h1>
          <p className="text-sm text-ink-soft mt-1">Phân loại và tổ chức các khoản giao dịch tài chính của bạn</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark transition-all self-start sm:self-auto"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Thêm danh mục riêng</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
            activeTab === "all"
              ? "bg-ink text-white"
              : "bg-white text-ink-soft border border-border hover:bg-cream"
          }`}
        >
          Tất cả ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab("expense")}
          className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
            activeTab === "expense"
              ? "bg-red-600 text-white"
              : "bg-white text-ink-soft border border-border hover:bg-cream"
          }`}
        >
          Chi tiêu ({expenseCount})
        </button>
        <button
          onClick={() => setActiveTab("income")}
          className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
            activeTab === "income"
              ? "bg-green text-white"
              : "bg-white text-ink-soft border border-border hover:bg-cream"
          }`}
        >
          Thu nhập ({incomeCount})
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-xs text-ink-soft">Đang tải danh mục...</p>
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border bg-white">
          <FolderIcon className="h-12 w-12 text-border mb-3" />
          <h3 className="font-serif font-bold text-ink text-base">Chưa có danh mục nào</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((c) => {
            const isSystem = c.userId === null;
            const isExpense = c.type === "expense";

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        isExpense ? "bg-red-50 text-red-700" : "bg-green-tint text-green-dark"
                      }`}
                    >
                      {isExpense ? "Chi tiêu" : "Thu nhập"}
                    </span>

                    {isSystem ? (
                      <span className="flex items-center gap-1 text-[11px] text-ink-soft font-medium bg-cream px-2 py-0.5 rounded-md">
                        <ShieldIcon className="h-3 w-3" /> Hệ thống
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-gold-dark font-medium bg-gold-tint/50 px-2 py-0.5 rounded-md">
                        <UserIcon className="h-3 w-3" /> Cá nhân
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-ink text-base mt-2 flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isExpense ? "bg-red-500" : "bg-green"
                      }`}
                    />
                    {c.name}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-ink-soft">
                  <span>{isSystem ? "Mặc định hệ thống" : "Tự định nghĩa"}</span>

                  {!isSystem && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1 text-ink-soft hover:text-gold-dark hover:bg-gold-tint/40 rounded-lg transition-colors"
                        title="Sửa"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(c.id)}
                        className="p-1 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-lg font-bold text-ink">
                {editItem ? "Sửa danh mục" : "Thêm danh mục mới"}
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
                  Loại danh mục
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`rounded-xl py-2 text-sm font-semibold transition-all ${
                      type === "expense"
                        ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                        : "border border-border bg-cream/40 text-ink-soft hover:bg-white"
                    }`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`rounded-xl py-2 text-sm font-semibold transition-all ${
                      type === "income"
                        ? "bg-green text-white shadow-md shadow-green/20"
                        : "border border-border bg-cream/40 text-ink-soft hover:bg-white"
                    }`}
                  >
                    Thu nhập
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Tên danh mục
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tiền điện nước, Mua sắm..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
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
                  {isSubmitting ? "Đang lưu..." : editItem ? "Lưu thay đổi" : "Tạo danh mục"}
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
            <h3 className="font-serif text-lg font-bold text-ink">Xóa danh mục này?</h3>
            <p className="text-xs text-ink-soft mt-1.5">
              Danh mục sẽ được ẩn đi. Các giao dịch cũ thuộc danh mục này vẫn được lưu an toàn.
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
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
