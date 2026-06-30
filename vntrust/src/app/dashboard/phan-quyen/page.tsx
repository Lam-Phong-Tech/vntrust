"use client";
// Phân quyền hệ thống — Admin RBAC matrix (Role × Module)
// Bố cục: sidebar quản trị + thẻ thống kê + ma trận quyền (toggle).
// Lưu thật vào /api/system-config (key=roles_permissions, namespace=permission).
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Vai trò (đồng bộ với /dashboard/users) — 4 vai trò ──────────────────────
const ROLES: Array<{ key: string; label: string; en: string; icon: string; color: string; locked?: boolean }> = [
  { key: "admin",        label: "Quản trị",          en: "Admin",      icon: "admin_panel_settings", color: "text-red-300",    locked: true },
  { key: "manufacturer", label: "Doanh nghiệp",      en: "Enterprise", icon: "domain",               color: "text-[#C8A557]" },
  { key: "authority",    label: "Cơ quan chức năng", en: "Authority",  icon: "gavel",                color: "text-cyan-300" },
  { key: "consumer",     label: "Người tiêu dùng",   en: "Consumer",   icon: "person",               color: "text-slate-300" },
];

// ─── Nhóm quyền (module chức năng) ───────────────────────────────────────────
const MODULES: Array<{ key: string; label: string; en: string; icon: string; desc: string }> = [
  { key: "nguoi_dung",   label: "Quản lý người dùng",   en: "User management",   icon: "group",            desc: "Khóa / mở khóa / đổi vai trò" },
  { key: "doanh_nghiep", label: "Doanh nghiệp & KYC",   en: "Enterprise & KYC",  icon: "domain",           desc: "Duyệt hồ sơ, xác minh DN" },
  { key: "san_pham",     label: "Sản phẩm & Kho",       en: "Products & stock",  icon: "inventory_2",      desc: "Tạo / sửa sản phẩm, kho hàng" },
  { key: "lo_hang",      label: "Lô hàng & Tem QR",     en: "Batches & QR",      icon: "qr_code_2",        desc: "Phát hành tem, quản lý lô" },
  { key: "phan_phoi",    label: "Phân phối & Giao hàng",en: "Distribution",      icon: "conveyor_belt",    desc: "Đơn chuyển hàng, giao nhận" },
  { key: "canh_bao",     label: "Cảnh báo & Giám sát",  en: "Alerts & monitor",  icon: "notifications_active", desc: "Cảnh báo real-time, điều tra" },
  { key: "bao_cao",      label: "Báo cáo & Phân tích",  en: "Reports",           icon: "monitoring",       desc: "Thống kê, xuất báo cáo" },
  { key: "tuan_thu",     label: "Tuân thủ & Chứng nhận",en: "Compliance",        icon: "fact_check",       desc: "Quy tắc, chứng chỉ, audit" },
  { key: "diem_thuong",  label: "Điểm thưởng",          en: "Rewards",           icon: "stars",            desc: "Cấp / thu hồi điểm thưởng" },
  { key: "bao_mat",      label: "Bảo mật & Nhật ký",    en: "Security & logs",   icon: "security",         desc: "Audit log, SLA, security score" },
  { key: "cau_hinh",     label: "Cấu hình hệ thống",    en: "System config",     icon: "settings",         desc: "Ngưỡng AI, retention, thông báo" },
  { key: "phan_quyen",   label: "Phân quyền",           en: "Permissions",       icon: "key",              desc: "Cấp quyền cho vai trò" },
];

type Matrix = Record<string, Record<string, boolean>>;

// Quyền mặc định hợp lý theo từng vai trò
function defaultMatrix(): Matrix {
  const m: Matrix = {};
  for (const r of ROLES) {
    m[r.key] = {};
    for (const mod of MODULES) m[r.key][mod.key] = false;
  }
  // admin: toàn quyền
  for (const mod of MODULES) m.admin[mod.key] = true;
  // Doanh nghiệp (gộp NSX + NK): sản phẩm, lô hàng, phân phối, cảnh báo, báo cáo, tuân thủ
  ["san_pham", "lo_hang", "phan_phoi", "canh_bao", "bao_cao", "tuan_thu"].forEach(k => (m.manufacturer[k] = true));
  // authority (cơ quan chức năng): giám sát
  ["canh_bao", "bao_cao", "doanh_nghiep"].forEach(k => (m.authority[k] = true));
  // consumer: không có quyền backend
  return m;
}

// ─── Toggle switch ───────────────────────────────────────────────────────────
function Toggle({ on, locked, onClick }: { on: boolean; locked?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      disabled={locked}
      aria-pressed={on}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        on ? "bg-[#C8A557]" : "bg-white/10 border border-white/15"
      } ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:brightness-110"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function PhanQuyenPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matrix, setMatrix] = useState<Matrix>(defaultMatrix());
  const [saved, setSaved] = useState<Matrix>(defaultMatrix());
  const [activeRole, setActiveRole] = useState<string>("manufacturer"); // dùng cho mobile
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Guard: chỉ admin
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (role !== "admin") { router.replace("/dashboard?error=forbidden"); return; }
    setReady(true);
  }, [router]);

  // Load cấu hình đã lưu
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/system-config?key=roles_permissions", { cache: "no-store" });
      if (r.ok) {
        const json = await r.json();
        if (json?.value) {
          const parsed = JSON.parse(json.value) as Matrix;
          // Merge để bù module/role mới (nếu code thêm về sau)
          const base = defaultMatrix();
          for (const rk of Object.keys(base))
            for (const mk of Object.keys(base[rk]))
              if (parsed[rk] && typeof parsed[rk][mk] === "boolean") base[rk][mk] = parsed[rk][mk];
          for (const mod of MODULES) base.admin[mod.key] = true; // admin luôn full
          setMatrix(base);
          setSaved(base);
        }
      }
      // 404 hoặc chưa có → giữ defaultMatrix
    } catch {
      // im lặng — dùng default
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  const toggle = (roleKey: string, modKey: string) => {
    if (roleKey === "admin") return; // admin khóa toàn quyền
    setMatrix(prev => ({ ...prev, [roleKey]: { ...prev[roleKey], [modKey]: !prev[roleKey][modKey] } }));
  };

  const dirty = useMemo(() => JSON.stringify(matrix) !== JSON.stringify(saved), [matrix, saved]);

  const stats = useMemo(() => {
    let on = 0;
    for (const rk of Object.keys(matrix)) for (const mk of Object.keys(matrix[rk])) if (matrix[rk][mk]) on++;
    return { roles: ROLES.length, modules: MODULES.length, on };
  }, [matrix]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "roles_permissions",
          namespace: "permission",
          value: JSON.stringify(matrix),
          moTa: "Ma trận phân quyền vai trò × module (RBAC)",
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Save failed");
      setSaved(matrix);
      showToast(tr("Đã lưu phân quyền", "Permissions saved"), true);
    } catch (e: any) {
      showToast(e.message, false);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setMatrix(defaultMatrix()); showToast(tr("Đã khôi phục mặc định (chưa lưu)", "Reset to defaults (unsaved)"), true); };

  if (!ready) return null;

  return (
    <div className="min-h-screen w-full max-w-[1500px] mx-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 pb-[100px] md:pb-8 overflow-x-hidden">
      <div className="flex gap-6 min-w-0">
        {/* ── Nội dung ── */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">{tr("Quản trị hệ thống", "System admin")}</p>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1 leading-tight break-words">
                {tr("Phân quyền hệ thống", "Role permissions")}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                {tr("Cấp / thu hồi quyền truy cập từng module theo vai trò",
                    "Grant / revoke per-module access by role")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:justify-end">
              <button
                onClick={reset}
                className="min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                {tr("Mặc định", "Defaults")}
              </button>
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="min-w-0 px-4 py-2 rounded-xl bg-[#C8A557] text-[#0B1623] font-bold hover:brightness-110 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">{saving ? "progress_activity" : "save"}</span>
                {saving ? tr("Đang lưu…", "Saving…") : tr("Lưu thay đổi", "Save changes")}
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4 min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">{tr("Vai trò", "Roles")}</p>
              <p className="text-2xl font-black text-white">{stats.roles}</p>
            </div>
            <div className="rounded-2xl bg-[#C8A557]/5 border border-[#C8A557]/20 p-3 sm:p-4 min-w-0">
              <p className="text-[10px] text-[#C8A557] uppercase tracking-wider font-bold mb-1">{tr("Nhóm quyền", "Modules")}</p>
              <p className="text-2xl font-black text-[#C8A557]">{stats.modules}</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 sm:p-4 min-w-0">
              <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold mb-1">{tr("Quyền đang bật", "Active grants")}</p>
              <p className="text-2xl font-black text-emerald-300">{stats.on}</p>
            </div>
            <div className={`rounded-2xl p-3 sm:p-4 border min-w-0 ${dirty ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"}`}>
              <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${dirty ? "text-amber-300" : "text-slate-400"}`}>{tr("Trạng thái", "Status")}</p>
              <p className={`text-sm font-black mt-1.5 ${dirty ? "text-amber-300" : "text-emerald-300"}`}>
                {dirty ? tr("Chưa lưu", "Unsaved") : tr("Đã đồng bộ", "In sync")}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center text-slate-400">{tr("Đang tải…", "Loading…")}</div>
          ) : (
            <>
              {/* ── Ma trận: desktop (table) ── */}
              <div className="hidden xl:block rounded-2xl bg-white/5 border border-white/10 overflow-hidden max-w-full">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm table-fixed">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr className="text-left">
                        <th className="w-[280px] px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-slate-400 sticky left-0 bg-[#101d2e] z-10">
                          {tr("Nhóm quyền", "Module")}
                        </th>
                        {ROLES.map(r => (
                          <th key={r.key} className="px-2 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`material-symbols-outlined text-[18px] ${r.color}`}>{r.icon}</span>
                              <span className="text-[10px] font-bold text-slate-300 leading-tight">{tr(r.label, r.en)}</span>
                              {r.locked && <span className="text-[8px] text-[#C8A557] font-bold uppercase">{tr("Full", "Full")}</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map(mod => (
                        <tr key={mod.key} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                          <td className="px-4 py-3 sticky left-0 bg-[#0d1726] z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#C8A557]/10 border border-[#C8A557]/20 text-[#C8A557] flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px]">{mod.icon}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-white font-bold leading-snug break-words">{tr(mod.label, mod.en)}</div>
                                <div className="text-[11px] text-slate-500 leading-snug break-words">{mod.desc}</div>
                              </div>
                            </div>
                          </td>
                          {ROLES.map(r => (
                            <td key={r.key} className="px-3 py-3 text-center">
                              <Toggle on={matrix[r.key]?.[mod.key] ?? false} locked={r.locked} onClick={() => toggle(r.key, mod.key)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Ma trận: mobile (chọn vai trò → list module) ── */}
              <div className="xl:hidden">
                <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-2 mb-3 hide-scrollbar">
                  {ROLES.map(r => (
                    <button
                      key={r.key}
                      onClick={() => setActiveRole(r.key)}
                      className={`shrink-0 max-w-[210px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        activeRole === r.key ? "bg-[#C8A557]/15 border-[#C8A557]/40 text-white" : "bg-white/5 border-white/10 text-slate-300"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${r.color}`}>{r.icon}</span>
                      <span className="truncate">{tr(r.label, r.en)}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {MODULES.map(mod => {
                    const locked = ROLES.find(r => r.key === activeRole)?.locked;
                    return (
                      <div key={mod.key} className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#C8A557]/10 border border-[#C8A557]/20 text-[#C8A557] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">{mod.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold text-sm leading-snug break-words">{tr(mod.label, mod.en)}</div>
                          <div className="text-[11px] text-slate-500 leading-snug break-words">{mod.desc}</div>
                        </div>
                        <div className="pt-1 shrink-0">
                          <Toggle on={matrix[activeRole]?.[mod.key] ?? false} locked={locked} onClick={() => toggle(activeRole, mod.key)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-4 flex items-start gap-1.5 leading-relaxed">
                <span className="material-symbols-outlined text-[14px] text-[#C8A557] mt-0.5 shrink-0">info</span>
                {tr("Vai trò Quản trị luôn có toàn quyền và không thể chỉnh. Nhấn “Lưu thay đổi” để áp dụng.",
                    "The Admin role always has full access and cannot be edited. Click “Save changes” to apply.")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-[90px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-24px)] max-w-md px-4 py-3 rounded-xl text-sm font-bold border shadow-lg backdrop-blur text-center ${
          toast.ok ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" : "bg-red-500/15 border-red-500/40 text-red-200"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
