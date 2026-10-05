"use client";

import { useEffect, useState, useTransition } from "react";
import { getJson, patchJson, postJson, putJson, deleteJson } from "@/lib/api-client";
import {
  UsersIcon,
  ShieldIcon,
  FolderIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "@/components/ui/icons";

type SystemStats = {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalTransactions: number;
  totalCategories: number;
};

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "locked";
};

type CategoryItem = {
  id: number;
  name: string;
  type: "income" | "expense";
};

type AuditLogItem = {
  id: number;
  userId: number | null;
  userName: string | null;
  action: string;
  targetTable: string | null;
  targetId: number | null;
  detail: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "categories" | "audit">("users");
  const [loading, setLoading] = useState(true);

  // Users Tab state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"" | "active" | "locked">("");

  // Categories Tab state
  const [defaultCategories, setDefaultCategories] = useState<CategoryItem[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditItem, setCatEditItem] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");

  // Audit Logs Tab state
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  const [isPending, startTransition] = useTransition();

  const fetchStats = async () => {
    const res = await getJson<SystemStats>("/api/admin/stats");
    if (res.ok) setStats(res.data);
  };

  const fetchUsers = (page = userPage) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (userSearch) params.set("search", userSearch);
      if (userStatusFilter) params.set("status", userStatusFilter);

      const res = await getJson<{ data: UserItem[]; total: number; totalPages: number; page: number }>(
        `/api/admin/users?${params.toString()}`
      );
      if (res.ok && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setUsers(list);
        setUserTotal(res.data.total ?? list.length);
        setUserPage(res.data.page ?? 1);
        setUserTotalPages(res.data.totalPages ?? 1);
      } else {
        setUsers([]);
      }
    });
  };

  const fetchDefaultCategories = async () => {
    const res = await getJson<CategoryItem[]>("/api/admin/categories");
    if (res.ok && Array.isArray(res.data)) setDefaultCategories(res.data);
  };

  const fetchAuditLogs = (page = logPage) => {
    startTransition(async () => {
      const res = await getJson<{ data: AuditLogItem[]; total: number; totalPages: number; page: number }>(
        `/api/admin/audit-logs?page=${page}&limit=15`
      );
      if (res.ok && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setLogs(list);
        setLogTotal(res.data.total ?? list.length);
        setLogPage(res.data.page ?? 1);
        setLogTotalPages(res.data.totalPages ?? 1);
      } else {
        setLogs([]);
      }
    });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(1), fetchDefaultCategories(), fetchAuditLogs(1)]).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleToggleUserStatus = async (user: UserItem) => {
    const newStatus = user.status === "active" ? "locked" : "active";
    const actionName = newStatus === "locked" ? "khóa" : "mở khóa";
    if (!confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản ${user.email}?`)) return;

    const res = await patchJson(`/api/admin/users/${user.id}`, { status: newStatus });
    if (res.ok) {
      fetchUsers(userPage);
      fetchStats();
    } else {
      alert(res.error.message);
    }
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (catEditItem) {
      const res = await putJson(`/api/admin/categories/${catEditItem.id}`, { name: catName, type: catType });
      if (res.ok) {
        setCatModalOpen(false);
        fetchDefaultCategories();
      } else {
        alert(res.error.message);
      }
    } else {
      const res = await postJson("/api/admin/categories", { name: catName, type: catType });
      if (res.ok) {
        setCatModalOpen(false);
        fetchDefaultCategories();
      } else {
        alert(res.error.message);
      }
    }
  };

  const handleCatDelete = async (id: number) => {
    if (!confirm("Xác nhận xóa danh mục mặc định này?")) return;
    const res = await deleteJson(`/api/admin/categories/${id}`);
    if (res.ok) fetchDefaultCategories();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldIcon className="h-6 w-6 text-gold-dark" />
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Quản trị hệ thống (Admin)
          </h1>
        </div>
        <p className="text-sm text-ink-soft">
          Giám sát người dùng, cấu hình danh mục hệ thống và theo dõi nhật ký hoạt động
        </p>
      </div>

      {/* System Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tổng thành viên</span>
          <p className="mt-2 font-serif text-2xl font-bold text-ink">{stats?.totalUsers ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Đang hoạt động</span>
          <p className="mt-2 font-serif text-2xl font-bold text-green">{stats?.activeUsers ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tài khoản bị khóa</span>
          <p className="mt-2 font-serif text-2xl font-bold text-red-600">{stats?.lockedUsers ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tổng giao dịch</span>
          <p className="mt-2 font-serif text-2xl font-bold text-gold-dark">{stats?.totalTransactions ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm col-span-2 md:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Tổng danh mục</span>
          <p className="mt-2 font-serif text-2xl font-bold text-ink">{stats?.totalCategories ?? 0}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "users"
              ? "bg-ink text-white"
              : "bg-white text-ink-soft border border-border hover:bg-cream"
          }`}
        >
          <UsersIcon className="h-4 w-4" />
          <span>Người dùng ({userTotal})</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "categories"
              ? "bg-ink text-white"
              : "bg-white text-ink-soft border border-border hover:bg-cream"
          }`}
        >
          <FolderIcon className="h-4 w-4" />
          <span>Danh mục mặc định ({defaultCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "audit"
              ? "bg-ink text-white"
              : "bg-white text-ink-soft border border-border hover:bg-cream"
          }`}
        >
          <ShieldIcon className="h-4 w-4" />
          <span>Nhật ký hệ thống ({logTotal})</span>
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
              <input
                type="text"
                placeholder="Tìm người dùng theo tên hoặc email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  fetchUsers(1);
                }}
                className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2 text-sm text-ink focus:border-gold focus:outline-none"
              />
            </div>

            <select
              value={userStatusFilter}
              onChange={(e) => {
                setUserStatusFilter(e.target.value as typeof userStatusFilter);
                fetchUsers(1);
              }}
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-ink focus:border-gold focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động (active)</option>
              <option value="locked">Bị khóa (locked)</option>
            </select>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-cream/50 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Họ và tên</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Vai trò</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const isLocked = u.status === "locked";
                    const isAdmin = u.role === "admin";

                    return (
                      <tr key={u.id} className="hover:bg-cream/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-ink-soft">#{u.id}</td>
                        <td className="px-5 py-3.5 font-semibold text-ink">{u.name}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-ink-soft">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                              isAdmin ? "bg-gold-tint text-gold-dark" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isAdmin ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                              isLocked ? "bg-red-100 text-red-700" : "bg-green-tint text-green-dark"
                            }`}
                          >
                            {isLocked ? "Đã khóa" : "Hoạt động"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {!isAdmin && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                isLocked
                                  ? "bg-green text-white hover:bg-green-dark"
                                  : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                              }`}
                            >
                              {isLocked ? "Mở khóa" : "Khóa tài khoản"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {userTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-cream/20 text-xs text-ink-soft">
                <span>
                  Trang <strong>{userPage}</strong> / <strong>{userTotalPages}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => fetchUsers(userPage - 1)}
                    className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-ink disabled:opacity-40 hover:bg-cream"
                  >
                    <ChevronLeftIcon className="h-3.5 w-3.5" /> Trước
                  </button>
                  <button
                    disabled={userPage >= userTotalPages}
                    onClick={() => fetchUsers(userPage + 1)}
                    className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-ink disabled:opacity-40 hover:bg-cream"
                  >
                    Sau <ChevronRightIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-ink-soft">
              Danh mục mặc định được áp dụng chung cho tất cả người dùng trong hệ thống
            </p>
            <button
              onClick={() => {
                setCatEditItem(null);
                setCatName("");
                setCatType("expense");
                setCatModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-gold/20 hover:bg-gold-dark"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Thêm danh mục mặc định</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {defaultCategories.map((c) => {
              const isExpense = c.type === "expense";
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border bg-white p-4 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold mb-1 ${
                        isExpense ? "bg-red-50 text-red-700" : "bg-green-tint text-green-dark"
                      }`}
                    >
                      {isExpense ? "Chi tiêu" : "Thu nhập"}
                    </span>
                    <h3 className="font-semibold text-ink text-sm">{c.name}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setCatEditItem(c);
                        setCatName(c.name);
                        setCatType(c.type);
                        setCatModalOpen(true);
                      }}
                      className="p-1 text-ink-soft hover:text-gold-dark hover:bg-gold-tint/40 rounded-lg"
                      title="Sửa"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleCatDelete(c.id)}
                      className="p-1 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Xóa"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-cream/50 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Người thực hiện</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3">Bảng tác động</th>
                  <th className="px-4 py-3">Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-cream/20">
                    <td className="px-4 py-2.5 text-ink-soft whitespace-nowrap">
                      {log.createdAt.replace("T", " ").split(".")[0]}
                    </td>
                    <td className="px-4 py-2.5 font-sans font-medium text-ink">
                      {log.userName || <span className="text-ink-soft italic">Hệ thống</span>}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-gold-dark">{log.action}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{log.targetTable || "-"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{log.ipAddress || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-cream/20 text-xs text-ink-soft">
              <span>
                Trang <strong>{logPage}</strong> / <strong>{logTotalPages}</strong> (Tổng {logTotal} sự kiện)
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={logPage <= 1}
                  onClick={() => fetchAuditLogs(logPage - 1)}
                  className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-ink disabled:opacity-40 hover:bg-cream"
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" /> Trước
                </button>
                <button
                  disabled={logPage >= logTotalPages}
                  onClick={() => fetchAuditLogs(logPage + 1)}
                  className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-ink disabled:opacity-40 hover:bg-cream"
                >
                  Sau <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Default Category */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-lg font-bold text-ink">
                {catEditItem ? "Sửa danh mục mặc định" : "Thêm danh mục mặc định"}
              </h3>
              <button onClick={() => setCatModalOpen(false)} className="text-ink-soft hover:text-ink">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCatSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                  Loại danh mục
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatType("expense")}
                    className={`rounded-xl py-2 text-sm font-semibold ${
                      catType === "expense" ? "bg-red-600 text-white" : "border border-border bg-cream/40 text-ink-soft"
                    }`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType("income")}
                    className={`rounded-xl py-2 text-sm font-semibold ${
                      catType === "income" ? "bg-green text-white" : "border border-border bg-cream/40 text-ink-soft"
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
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  placeholder="Ví dụ: Ăn uống, Lương..."
                  className="w-full rounded-xl border border-border bg-cream/40 px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-cream"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
