"use client";
// Admin User Management — quản lý tài khoản NguoiDung
// Khóa/Mở khóa (suspend/active) · Đổi vai trò · Xóa · Search/filter
import { FormEvent, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Toast } from "@/components/Toast";

interface User {
  id: string;
  ten: string | null;
  email: string;
  soDienThoai: string | null;
  vaiTro: string;
  trangThai: string;
  doanhNghiepId: string | null;
  doanhNghiep: { id: string; ten: string; loai: string; maSoThue: string } | null;
}

interface ListResp {
  users: User[];
  total: number;
  stats: {
    byRole:   Record<string, number>;
    byStatus: Record<string, number>;
  };
}

interface CreateUserForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  password: string;
}

// Hệ thống còn 4 vai trò: Admin · Doanh nghiệp (gộp NSX + NK) · Người tiêu dùng · Cơ quan chức năng
const ROLE_META: Record<string, { label: string; en: string; color: string; icon: string }> = {
  admin:        { label: "Quản trị",          en: "Admin",      color: "text-red-300 bg-red-500/15 border-red-500/30",        icon: "admin_panel_settings" },
  manufacturer: { label: "Doanh nghiệp",      en: "Enterprise", color: "text-[#C8A557] bg-[#C8A557]/15 border-[#C8A557]/30",  icon: "domain" },
  consumer:     { label: "Người tiêu dùng",   en: "Consumer",   color: "text-slate-300 bg-slate-500/15 border-slate-500/30",  icon: "person" },
  authority:    { label: "Cơ quan chức năng", en: "Authority",  color: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",      icon: "gavel" },
};

const STATUS_META: Record<string, { label: string; en: string; color: string; icon: string }> = {
  active:    { label: "Đang hoạt động", en: "Active",    color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", icon: "check_circle" },
  suspended: { label: "Đã khóa",        en: "Suspended", color: "text-red-300 bg-red-500/15 border-red-500/30",             icon: "lock" },
  pending:   { label: "Chờ duyệt",      en: "Pending",   color: "text-amber-300 bg-amber-500/15 border-amber-500/30",       icon: "schedule" },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [actionTarget, setActionTarget] = useState<User | null>(null);
  const [confirmDel, setConfirmDel] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    phone: "",
    role: "consumer",
    status: "active",
    password: "",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Guard: only admin
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (role !== "admin") { router.replace("/dashboard?error=forbidden"); return; }
    setUserRole(role);
  }, [router]);

  const fetchUsers = useCallback(async () => {
    if (userRole !== "admin") return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set("q", search);
      if (roleFilter)   params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Fetch failed");
      setData(json);
    } catch (e: any) {
      setToast({ msg: e.message, type: "err" });
    } finally {
      setLoading(false);
    }
  }, [userRole, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Reset to page 1 whenever the search/filter changes
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleSuspend = async (u: User) => {
    const next = u.trangThai === "active" ? "suspended" : "active";
    setActing(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: next }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Update failed");
      showToast(next === "suspended"
        ? tr(`Đã khóa ${u.email}`, `Suspended ${u.email}`)
        : tr(`Đã mở khóa ${u.email}`, `Reactivated ${u.email}`), "ok");
      setActionTarget(null);
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message, "err");
    } finally {
      setActing(null);
    }
  };

  const changeRole = async (u: User, newRole: string) => {
    if (newRole === u.vaiTro) return;
    setActing(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaiTro: newRole }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Update failed");
      showToast(tr(`Đã đổi vai trò → ${ROLE_META[newRole]?.label || newRole}`, `Role → ${ROLE_META[newRole]?.en || newRole}`), "ok");
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message, "err");
    } finally {
      setActing(null);
    }
  };

  const deleteUser = async () => {
    if (!confirmDel) return;
    const u = confirmDel;
    setActing(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Delete failed");
      showToast(tr(`Đã xóa ${u.email}`, `Deleted ${u.email}`), "ok");
      setConfirmDel(null);
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message, "err");
    } finally {
      setActing(null);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      email: "",
      phone: "",
      role: "consumer",
      status: "active",
      password: "",
    });
  };

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await r.json();
      if (!r.ok) {
        const detail = Array.isArray(json.details) ? `: ${json.details.join(", ")}` : "";
        throw new Error((json.error || "Create failed") + detail);
      }
      showToast(tr(`Đã tạo tài khoản ${createForm.email}`, `Created account ${createForm.email}`), "ok");
      setShowCreate(false);
      resetCreateForm();
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message, "err");
    } finally {
      setCreating(false);
    }
  };

  if (!userRole) return null;

  const stats = data?.stats || { byRole: {}, byStatus: {} };
  const adminCount = Number(stats.byRole.admin || 0);
  const isLastAdminUser = (u: User) => u.vaiTro === "admin" && adminCount <= 1;

  // Pagination over the already-filtered list returned by the API
  const filtered = data?.users || [];
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 pb-[100px] md:pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">{tr("Quản trị hệ thống", "System admin")}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            {tr("Quản lý người dùng", "User management")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {tr("Khóa / mở khóa / xóa tài khoản người dùng, NSX, nhà phân phối",
                "Lock / unlock / delete accounts of users, manufacturers, distributors")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1F6FEB] px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#1857c9]"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          {tr("Thêm người dùng", "Add user")}
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">{tr("Tổng tài khoản", "Total accounts")}</p>
          <p className="text-2xl font-black text-white">{data?.total ?? "—"}</p>
        </div>
        <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4">
          <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold mb-1">{tr("Đang hoạt động", "Active")}</p>
          <p className="text-2xl font-black text-emerald-300">{stats.byStatus.active ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-4">
          <p className="text-[10px] text-red-300 uppercase tracking-wider font-bold mb-1">{tr("Đã khóa", "Suspended")}</p>
          <p className="text-2xl font-black text-red-300">{stats.byStatus.suspended ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4">
          <p className="text-[10px] text-amber-300 uppercase tracking-wider font-bold mb-1">{tr("Chờ duyệt", "Pending")}</p>
          <p className="text-2xl font-black text-amber-300">{stats.byStatus.pending ?? 0}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("Tìm theo email, tên, SĐT…", "Search email, name, phone…")}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557]/50"
          />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50"
        >
          <option value="">{tr("Tất cả vai trò", "All roles")}</option>
          {Object.entries(ROLE_META).map(([k, m]) => (
            <option key={k} value={k}>{lang === "en" ? m.en : m.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50"
        >
          <option value="">{tr("Tất cả trạng thái", "All statuses")}</option>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <option key={k} value={k}>{lang === "en" ? m.en : m.label}</option>
          ))}
        </select>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3 font-bold">{tr("Người dùng", "User")}</th>
              <th className="px-4 py-3 font-bold">{tr("Vai trò", "Role")}</th>
              <th className="px-4 py-3 font-bold">{tr("Doanh nghiệp", "Enterprise")}</th>
              <th className="px-4 py-3 font-bold">{tr("Trạng thái", "Status")}</th>
              <th className="px-4 py-3 font-bold text-right">{tr("Thao tác", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{tr("Đang tải…", "Loading…")}</td></tr>
            )}
            {!loading && (data?.users.length || 0) === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{tr("Không có người dùng nào", "No users")}</td></tr>
            )}
            {!loading && pagedUsers.map((u) => {
              const role = ROLE_META[u.vaiTro] || ROLE_META.consumer;
              const status = STATUS_META[u.trangThai] || STATUS_META.active;
              const isAct = acting === u.id;
              const isLastAdmin = isLastAdminUser(u);
              return (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#C8A557]/15 border border-[#C8A557]/30 text-[#C8A557] flex items-center justify-center font-bold text-sm shrink-0">
                        {(u.ten || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-bold truncate">{u.ten || u.email.split("@")[0]}</div>
                        <div className="text-xs text-slate-400 truncate">{u.email}{u.soDienThoai ? ` · ${u.soDienThoai}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.vaiTro}
                      onChange={(e) => changeRole(u, e.target.value)}
                      disabled={isAct || isLastAdmin}
                      title={isLastAdmin ? tr("Không thể đổi vai trò admin cuối cùng", "Cannot change the last admin role") : undefined}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${role.color} focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${isLastAdmin ? "cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {Object.entries(ROLE_META).map(([k, m]) => (
                        <option key={k} value={k} className="bg-[#0B1623] text-white">{lang === "en" ? m.en : m.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.doanhNghiep ? (
                      <div>
                        <div className="text-slate-200 truncate max-w-[200px]">{u.doanhNghiep.ten}</div>
                        <div className="text-[10px] text-slate-500">MST: {u.doanhNghiep.maSoThue} · {u.doanhNghiep.loai}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">{tr("Không gắn DN", "No enterprise")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                      <span className="material-symbols-outlined text-[13px]">{status.icon}</span>
                      {lang === "en" ? status.en : status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setActionTarget(u)}
                        disabled={isAct}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#1F6FEB]/30 bg-[#1F6FEB]/10 px-3 py-2 text-xs font-black text-blue-200 transition hover:bg-[#1F6FEB]/20 disabled:opacity-50"
                        title={tr("Mở menu thao tác", "Open actions")}
                      >
                        <span className="material-symbols-outlined text-[16px]">more_horiz</span>
                        {tr("Thao tác", "Actions")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card list — mobile */}
      <div className="md:hidden space-y-3">
        {loading && <div className="text-center text-slate-400 py-6">{tr("Đang tải…", "Loading…")}</div>}
        {!loading && pagedUsers.map((u) => {
          const role = ROLE_META[u.vaiTro] || ROLE_META.consumer;
          const status = STATUS_META[u.trangThai] || STATUS_META.active;
          const isAct = acting === u.id;
          return (
            <div key={u.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-[#C8A557]/15 border border-[#C8A557]/30 text-[#C8A557] flex items-center justify-center font-bold shrink-0">
                  {(u.ten || u.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold truncate">{u.ten || u.email.split("@")[0]}</div>
                  <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                  {u.soDienThoai && <div className="text-[11px] text-slate-500">{u.soDienThoai}</div>}
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color} shrink-0`}>
                  <span className="material-symbols-outlined text-[11px]">{status.icon}</span>
                  {lang === "en" ? status.en : status.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border ${role.color}`}>
                  <span className="material-symbols-outlined text-[12px]">{role.icon}</span>
                  {lang === "en" ? role.en : role.label}
                </span>
                {u.doanhNghiep && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-slate-300 bg-white/5 border border-white/10 max-w-[180px] truncate">
                    {u.doanhNghiep.ten}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActionTarget(u)}
                  disabled={isAct}
                  className="flex-1 rounded-xl border border-[#1F6FEB]/30 bg-[#1F6FEB]/10 py-2 text-xs font-black text-blue-200 disabled:opacity-50"
                >
                  {tr("Thao tác", "Actions")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination controls */}
      {!loading && pageCount > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            {tr("Trước", "Prev")}
          </button>
          <span className="text-sm text-slate-300 font-bold">
            {tr("Trang", "Page")} {safePage}/{pageCount}
            <span className="text-slate-500 font-medium"> · {filtered.length} {tr("tài khoản", "accounts")}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {tr("Sau", "Next")}
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4" onClick={() => setShowCreate(false)}>
          <form
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0B1623] p-4 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
            onSubmit={createUser}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A557]">{tr("Quản trị hệ thống", "System admin")}</p>
                <h3 className="text-xl font-black text-white">{tr("Thêm người dùng mới", "Add new user")}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {tr("Admin tạo tài khoản trực tiếp, mật khẩu phải đạt chính sách bảo mật.", "Create an account directly. Password must meet security policy.")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-300 hover:bg-white/10"
                aria-label={tr("Đóng", "Close")}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{tr("Họ và tên", "Full name")} *</span>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  maxLength={60}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#1F6FEB]/60"
                  placeholder={tr("VD: Nguyễn Văn A", "Ex: Nguyen Van A")}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Email *</span>
                <input
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value.trim().toLowerCase() }))}
                  required
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#1F6FEB]/60"
                  placeholder="email@example.com"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{tr("Số điện thoại", "Phone")}</span>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 12) }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#1F6FEB]/60"
                  placeholder="0987654321"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{tr("Mật khẩu", "Password")} *</span>
                <input
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  type="password"
                  minLength={12}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#1F6FEB]/60"
                  placeholder="Az@123456789"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{tr("Vai trò", "Role")}</span>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#1F6FEB]/60"
                >
                  {Object.entries(ROLE_META).map(([k, m]) => (
                    <option key={k} value={k} className="bg-[#0B1623] text-white">{lang === "en" ? m.en : m.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{tr("Trạng thái", "Status")}</span>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#1F6FEB]/60"
                >
                  {Object.entries(STATUS_META).map(([k, m]) => (
                    <option key={k} value={k} className="bg-[#0B1623] text-white">{lang === "en" ? m.en : m.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                {tr("Hủy", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-xl bg-[#1F6FEB] py-3 text-sm font-black text-white hover:bg-[#1857c9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? tr("Đang tạo...", "Creating...") : tr("Tạo tài khoản", "Create account")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account actions modal */}
      {actionTarget && (() => {
        const target = actionTarget;
        const isActing = acting === target.id;
        const isLastAdmin = isLastAdminUser(target);
        const nextLockText = target.trangThai === "active" ? tr("Khóa tài khoản", "Lock account") : tr("Mở khóa tài khoản", "Unlock account");
        return (
          <div className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4" onClick={() => setActionTarget(null)}>
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B1623] p-4 shadow-2xl sm:p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C8A557]/30 bg-[#C8A557]/15 text-[#C8A557] font-black">
                  {(target.ten || target.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-black text-white">{target.ten || target.email.split("@")[0]}</h3>
                  <p className="truncate text-xs font-medium text-slate-400">{target.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActionTarget(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300 hover:bg-white/10"
                  aria-label={tr("Đóng", "Close")}
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleSuspend(target)}
                  disabled={isActing}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-black transition disabled:opacity-50 ${
                    target.trangThai === "active"
                      ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">{target.trangThai === "active" ? "lock" : "lock_open"}</span>
                    {nextLockText}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActionTarget(null); setConfirmDel(target); }}
                  disabled={isActing || isLastAdmin}
                  className="flex w-full items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm font-black text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  title={isLastAdmin ? tr("Không thể xóa quản trị cuối cùng", "Cannot delete the last admin") : undefined}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    {tr("Xóa tài khoản", "Delete account")}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete confirm modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-[2147483646] bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm" onClick={() => setConfirmDel(null)}>
          <div
            className="w-full rounded-2xl border border-red-500/30 bg-[#0B1623] p-4 shadow-2xl sm:p-6"
            style={{ maxWidth: 448 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{tr("Xác nhận xóa", "Confirm delete")}</h3>
                <p className="text-sm text-slate-400 mt-1 break-words">
                  {tr(`Xóa vĩnh viễn tài khoản ${confirmDel.email}? Hành động không thể hoàn tác.`,
                      `Permanently delete ${confirmDel.email}? This cannot be undone.`)}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10"
              >
                {tr("Hủy", "Cancel")}
              </button>
              <button
                onClick={deleteUser}
                disabled={acting === confirmDel.id}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50"
              >
                {acting === confirmDel.id ? tr("Đang xóa…", "Deleting…") : tr("Xóa", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} ok={toast.type === "ok"} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
