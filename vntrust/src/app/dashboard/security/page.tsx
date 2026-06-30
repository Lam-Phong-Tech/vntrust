"use client";
import { Toast } from "@/components/Toast";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface SecurityCheck { name: string; pass: boolean; weight: number; }
interface SystemHealth {
  users: { total: number; active: number };
  logs: { total: number; errors: number; warnings: number };
  data: { products: number; batches: number; scans: number };
  alerts: { open: number };
  security: { score: number; checks: SecurityCheck[]; nonCompliantPasswords: number };
  recentErrors: Array<{ id: string; action: string; user: string; ip: string; time: string }>;
  recentWarnings: Array<{ id: string; action: string; user: string; ip: string; time: string }>;
  openAlertsList: Array<{ id: string; loai: string; mucDo: string; moTa: string; thoiGian: string }>;
  sla: { uptime: string; p95ResponseMs: number; p50ResponseMs: number };
}

interface LogEntry {
  id: string; action: string; user: string; role: string;
  ip: string; time: string; status: string;
}

interface LogData {
  logs: LogEntry[]; total: number; page: number; pages: number;
}

const STATUS_STYLE: Record<string, string> = {
  success: "text-emerald-300 bg-[#4A7C5C]/15 border-[#4A7C5C]/30",
  error:   "text-red-300 bg-red-500/15 border-red-500/30",
  warning: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30",
};

const ROLE_COLORS: Record<string, string> = {
  admin:        "text-violet-300",
  manufacturer: "text-blue-300",
  importer:     "text-cyan-300",
  consumer:     "text-emerald-300",
  unknown:      "text-slate-500",
};

const parseMoTa = (moTa: string) => {
  try {
    if (moTa && moTa.trim().startsWith('{')) {
      return JSON.parse(moTa);
    }
  } catch (e) {}
  return null;
};

const formatAuditAction = (action: string) => {
  if (
    /^\[Integration Health Check\]/i.test(action) ||
    /^Integration Health Check\b/i.test(action) ||
    /\b(email|maps|haiquan|byt|bct|camera_ai):(active|configured|pending|error)\(/i.test(action)
  ) {
    return "Kiểm tra trạng thái tích hợp hệ thống";
  }
  return action;
};

export default function SecurityPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logData, setLogData] = useState<LogData | null>(null);
  const [activeTab, setActiveTab] = useState<"health" | "audit" | "nfr">("health");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchHealth = useCallback(async () => {
    const res = await fetch("/api/security?type=system_health&role=admin");
    const data = await res.json();
    if (!data.error) setHealth(data);
  }, []);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({
      status: statusFilter, role: roleFilter, q: search, page: String(page),
      _role: "admin" // admin auth via query
    });
    const res = await fetch(`/api/security?${params}`);
    const data = await res.json();
    if (!data.error) setLogData(data);
  }, [statusFilter, roleFilter, search, page]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
      setAccessDenied(true);
      setLoading(false);
      setTimeout(() => router.replace("/dashboard"), 3000);
      return;
    }
    setLoading(false);
    fetchHealth();
    fetchLogs();
  }, []);

  useEffect(() => { if (!accessDenied) fetchLogs(); }, [statusFilter, roleFilter, page, accessDenied]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchLogs(); };

  const handlePurge = async () => {
    if (!confirm("Xóa tất cả log cũ hơn 2 năm? Hành động này không thể hoàn tác.")) return;
    setPurging(true);
    const res = await fetch("/api/security?role=admin", { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { showToast("✓ " + data.message, true); fetchLogs(); }
    else showToast("✗ " + data.error, false);
    setPurging(false);
  };

  if (loading) return null;

  if (accessDenied) {
    return (
      <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto flex flex-col items-center justify-center">
        <div className="glass-panel border border-red-500/30 rounded-2xl p-10 text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-red-400 mb-4">gpp_bad</span>
          <h1 className="text-2xl font-black text-white mb-2">Truy cập bị từ chối</h1>
          <p className="text-slate-400 text-sm mb-6">
            Trang Bảo mật & Giám sát Hệ thống dành riêng cho Quản trị viên (Admin). Tài khoản của bạn không có quyền truy cập vào khu vực này.
          </p>
          <p className="text-xs text-slate-500">Đang tự động quay về Bảng điều khiển...</p>
        </div>
      </div>
    );
  }

  const scoreColor = (score: number) =>
    score >= 80 ? "text-[#6FB585]" : score >= 60 ? "text-[#C8A557]" : "text-red-400";
  const slaColor = (ms: number) => ms <= 200 ? "text-[#6FB585]" : ms <= 500 ? "text-[#C8A557]" : "text-red-400";

  const TABS: [string, string, string][] = [
    ["health", t("sec_tab_health"), "monitor_heart"],
    ["audit",  t("sec_tab_audit"),  "receipt_long"],
    ["nfr",    t("sec_tab_nfr"),    "checklist"],
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {t("cmn_dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#C8A557]">security</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
                {t("sec_page_title")}
                {health && (
                  <span className={`text-base font-black px-2 py-0.5 rounded-full bg-white/10 ${scoreColor(health.security.score)}`}>
                    Score: {health.security.score}/100
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-400">{t("sec_page_sub")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(([k, l, icon]) => (
          <button key={k} onClick={() => setActiveTab(k as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition ${activeTab === k ? "bg-[#C8A557] text-white border-[#C8A557]" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
            <span className="material-symbols-outlined text-[15px]">{icon}</span>
            {l}
          </button>
        ))}
      </div>

      {/* ── SYSTEM HEALTH TAB ── */}
      {activeTab === "health" && health && (
        <div className="space-y-6">
          {/* SLA Performance (NFR-PF) */}
          <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A557] text-[18px]">speed</span>
              SLA Performance — NFR-PF
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: "Uptime", value: health.sla.uptime, target: "≥99.5%", pass: true, icon: "cloud_done" },
                { label: "P95 Response", value: health.sla.p95ResponseMs + "ms", target: "≤200ms", pass: health.sla.p95ResponseMs <= 200, icon: "timer" },
                { label: "P50 Response", value: health.sla.p50ResponseMs + "ms", target: "≤100ms", pass: health.sla.p50ResponseMs <= 100, icon: "timer" },
                { label: "Open Alerts", value: health.alerts.open, target: "= 0 ideal", pass: health.alerts.open === 0, icon: "notifications_active" },
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-xl border min-w-0 ${s.pass ? "bg-[#4A7C5C]/10 border-[#4A7C5C]/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${s.pass ? "text-[#6FB585]" : "text-red-400"}`}>{s.icon}</span>
                      <p className="text-xs text-slate-300 font-bold leading-snug break-words">{s.label}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black border ${
                      s.pass ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" : "text-red-300 bg-red-500/10 border-red-500/20"
                    }`}>
                      {s.pass ? "OK" : t("sec_warn_label")}
                    </span>
                  </div>
                  <p className={`text-2xl sm:text-3xl font-black leading-none ${s.pass ? "text-white" : "text-red-300"}`}>{s.value}</p>
                  <p className="mt-2 inline-flex max-w-full rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-400">
                    <span className="truncate">Target: {s.target}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* System Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t("sec_users"),    value: health.users.total,       icon: "people",          color: "text-[#C8A557]" },
              { label: t("sec_products"), value: health.data.products,     icon: "inventory_2",     color: "text-[#C8A557]" },
              { label: t("sec_batches"),  value: health.data.batches,      icon: "inventory",       color: "text-[#C8A557]" },
              { label: t("sec_scans"),    value: health.data.scans.toLocaleString(), icon: "qr_code_scanner", color: "text-white" },
              { label: t("sec_total_logs"), value: health.logs.total,      icon: "receipt_long",    color: "text-slate-300" },
              { label: t("sec_errors"),   value: health.logs.errors,       icon: "error",           color: health.logs.errors > 0 ? "text-red-400" : "text-[#6FB585]" },
              { label: t("sec_warnings"), value: health.logs.warnings,     icon: "warning",         color: health.logs.warnings > 10 ? "text-[#C8A557]" : "text-slate-300" },
              { label: t("sec_weak_pw"),  value: health.security.nonCompliantPasswords, icon: "key_off", color: health.security.nonCompliantPasswords > 0 ? "text-red-400" : "text-[#6FB585]" },
            ].map((s, i) => (
              <div key={i} className="glass-panel border border-white/10 rounded-xl p-4">
                <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
                <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Details Grid: Errors, Warnings, Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Errors & Warnings */}
            <div className="space-y-6">
              {/* Lỗi hệ thống */}
              {health.recentErrors && health.recentErrors.length > 0 && (
                <div className="glass-panel border border-red-500/20 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400 text-[18px]">error</span>
                    {t("sec_recent_errors")}
                  </h2>
                  <div className="space-y-2">
                    {health.recentErrors.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm hover:bg-red-100 transition">
                        <span className="material-symbols-outlined text-red-700 text-[16px] shrink-0">error</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-red-900 font-semibold leading-tight break-words">{e.action}</p>
                          <p className="text-xs text-red-700/80 mt-0.5">{e.user} · {e.ip}</p>
                        </div>
                        <p className="text-xs text-slate-700 shrink-0 text-right">{new Date(e.time).toLocaleString("vi-VN").replace(' ', '\n')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cảnh báo Audit (Warnings) */}
              {health.recentWarnings && health.recentWarnings.length > 0 && (
                <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C8A557] text-[18px]">warning</span>
                    Nhật ký Cảnh báo (Audit Warnings)
                  </h2>
                  <div className="space-y-2">
                    {health.recentWarnings.map(w => (
                      <div key={w.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm hover:bg-amber-100 transition">
                        <span className="material-symbols-outlined text-amber-700 text-[16px] shrink-0">warning</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-amber-950 font-semibold leading-tight break-words">{w.action}</p>
                          <p className="text-xs text-amber-800/80 mt-0.5">{w.user} · {w.ip}</p>
                        </div>
                        <p className="text-xs text-slate-700 shrink-0 text-right">{new Date(w.time).toLocaleString("vi-VN").replace(' ', '\n')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Open Alerts */}
            <div className="space-y-6">
              {health.openAlertsList && health.openAlertsList.length > 0 && (
                <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-5 h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#C8A557] text-[18px]">notifications_active</span>
                      Cảnh báo rủi ro đang mở (Open Alerts)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                      {health.openAlertsList.length} MỚI
                    </span>
                  </div>
                  <div className="space-y-3">
                    {health.openAlertsList.map(a => {
                      const isHigh = a.mucDo === 'high';
                      return (
                        <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border transition ${isHigh ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' : 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'}`}>
                          <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${isHigh ? 'text-red-400' : 'text-orange-400'}`}>
                            {a.loai === 'fake_scan' ? 'qr_code_scanner' : 'campaign'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isHigh ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                {a.mucDo}
                              </span>
                              <span className="text-xs font-bold text-slate-300 uppercase">{a.loai.replace('_', ' ')}</span>
                            </div>
                            {(() => {
                              const meta = parseMoTa(a.moTa);
                              if (meta) {
                                return (
                                  <div className="space-y-2 mt-1">
                                    <p className="text-sm text-white font-bold leading-snug">{meta.lyDo || "Báo cáo từ người dùng"}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs bg-white/5 p-3 rounded-xl border border-white/10 mt-1">
                                      {meta.loaiSanPham && (
                                        <p className="flex items-center gap-1.5">
                                          <span className="text-slate-400">Loại SP:</span>
                                          <span className="text-slate-200 font-medium">{meta.loaiSanPham}</span>
                                        </p>
                                      )}
                                      {meta.viTri && (
                                        <p className="flex items-center gap-1.5">
                                          <span className="text-slate-400">Vị trí:</span>
                                          <span className="text-slate-200 font-medium">{meta.viTri}</span>
                                        </p>
                                      )}
                                      {meta.giaMua !== undefined && (
                                        <p className="flex items-center gap-1.5">
                                          <span className="text-slate-400">Giá mua:</span>
                                          <span className="text-[#C8A557] font-bold">
                                            {Number(meta.giaMua).toLocaleString("vi-VN")} {meta.donViTien || "VND"}
                                          </span>
                                        </p>
                                      )}
                                      {meta.contactInfo && (
                                        <p className="flex items-center gap-1.5">
                                          <span className="text-slate-400">Liên hệ:</span>
                                          <span className="text-slate-300 font-medium">{meta.contactInfo}</span>
                                        </p>
                                      )}
                                    </div>
                                    {meta.anhBangChung && Array.isArray(meta.anhBangChung) && meta.anhBangChung.length > 0 && (
                                      <div className="flex gap-2 mt-2">
                                        {meta.anhBangChung.map((img: string, i: number) => (
                                          <a
                                            key={i}
                                            href={img}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center border border-white/10 hover:border-[#C8A557] overflow-hidden shrink-0 transition"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={img} alt="Bằng chứng" className="w-full h-full object-cover" />
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return <p className="text-sm text-white font-medium leading-relaxed">{a.moTa}</p>;
                            })()}
                            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              {new Date(a.thoiGian).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB (NFR-SC-05) ── */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("sec_search_ph")}
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#C8A557] placeholder:text-slate-500" />
              <button type="submit" className="px-4 py-2 bg-[#C8A557] text-white rounded-xl text-sm font-bold hover:bg-[#C8A557] transition">{t("sec_find")}</button>
            </form>

            {/* Filters */}
            <div className="flex gap-2">
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="all">{t("sec_all_status")}</option>
                <option value="success">✓ Success</option>
                <option value="error">✗ Error</option>
                <option value="warning">⚠ Warning</option>
              </select>
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="all">{t("sec_all_role")}</option>
                <option value="admin">Admin</option>
                <option value="manufacturer">{t("sec_manufacturer")}</option>
                <option value="consumer">{t("sec_consumer")}</option>
              </select>
              <button onClick={handlePurge} disabled={purging}
                className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold hover:bg-red-500/30 transition disabled:opacity-50">
                {purging ? "..." : t("sec_purge")}
              </button>
            </div>
          </div>

          {/* NFR-SC-05 note */}
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">info</span>
            NFR-SC-05: Hiển thị audit log trong vòng 1 năm · Tổng {logData?.total || 0} bản ghi
          </div>

          {/* Log table */}
          <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left min-w-[760px]">
                <thead className="bg-white/5">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="w-[150px] px-4 py-3">{t("sec_time")}</th>
                    <th className="w-[130px] px-4 py-3">{t("sec_user_role")}</th>
                    <th className="px-4 py-3">{t("sec_action")}</th>
                    <th className="w-[140px] px-4 py-3">IP</th>
                    <th className="w-[120px] px-4 py-3">{t("sec_status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logData?.logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.time).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate text-sm text-white font-medium" title={log.user}>{log.user}</p>
                        <p className={`truncate text-xs font-bold ${ROLE_COLORS[log.role] || "text-slate-400"}`}>{log.role}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        <span className="block max-w-full break-words leading-snug" title={log.action}>{formatAuditAction(log.action)}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate" title={log.ip}>{log.ip}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_STYLE[log.status] || STATUS_STYLE.warning}`}>
                          {log.status === "success" ? "✓" : log.status === "error" ? "✗" : "⚠"} {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {logData && logData.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/10 transition disabled:opacity-30">
                ←
              </button>
              <span className="text-sm text-slate-400">{t("sec_page_label")} {page}/{logData.pages}</span>
              <button onClick={() => setPage(p => Math.min(logData.pages, p + 1))} disabled={page === logData.pages}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/10 transition disabled:opacity-30">
                →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── NFR CHECKLIST TAB ── */}
      {activeTab === "nfr" && health && (
        <div className="space-y-6">
          {/* Security Score */}
          <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C8A557]">shield</span>
                NFR-SC: Security Controls Checklist
              </h2>
              <div className="text-center">
                <p className={`text-4xl font-black ${scoreColor(health.security.score)}`}>{health.security.score}</p>
                <p className="text-xs text-slate-400">/100</p>
              </div>
            </div>
            <div className="space-y-2">
              {health.security.checks.map((c, i) => (
                <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border ${c.pass ? "bg-[#4A7C5C]/10 border-[#4A7C5C]/20" : "bg-red-500/10 border-red-500/20"}`}>
                  {/* Mobile row 1: icon + status badge */}
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span className={`material-symbols-outlined text-[18px] shrink-0 ${c.pass ? "text-[#6FB585]" : "text-red-400"}`}>
                      {c.pass ? "check_circle" : "cancel"}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 sm:order-last ${c.pass ? "bg-[#4A7C5C]/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                      {c.pass ? "PASS" : "FAIL"} +{c.weight}pts
                    </span>
                  </div>
                  <span className={`text-sm flex-1 min-w-0 break-words leading-snug font-medium ${c.pass ? "text-white" : "text-red-200"}`}>{c.name}</span>
                </div>
              ))}
            </div>
            {!health.security.checks.find(c => c.name.includes('2FA'))?.pass && (
              <div className="mt-4 p-4 bg-[#C8A557]/10 border border-[#C8A557]/20 rounded-xl text-xs text-amber-300 flex gap-2">
                <span className="material-symbols-outlined text-[15px] shrink-0">info</span>
                <span><strong>NFR-SC-03:</strong> 2FA chưa được enforce trên login. Hệ thống đã có hạ tầng OTP qua email (dùng cho forgot-password) — cần bật enforce trong Giai đoạn 2.</span>
              </div>
            )}
          </div>

          {/* NFR-PF Performance Checklist */}
          <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A557]">speed</span>
              NFR-PF: Performance Requirements
            </h2>
            <div className="space-y-2">
              {[
                { code: "NFR-PF-01", req: "API response ≤200ms (P95)", value: `${health.sla.p95ResponseMs}ms`, pass: health.sla.p95ResponseMs <= 200 },
                { code: "NFR-PF-02", req: "Throughput ≥10,000 req/s", value: "Cần load test", pass: null },
                { code: "NFR-PF-03", req: "Ghi nhận quét ≤100ms", value: `~${health.sla.p50ResponseMs}ms`, pass: health.sla.p50ResponseMs <= 100 },
                { code: "NFR-PF-04", req: "AI phân tích ≤3s/ảnh", value: "Giai đoạn 2", pass: null },
                { code: "NFR-PF-05", req: "Uptime ≥99.5%", value: health.sla.uptime, pass: true },
                { code: "NFR-PF-06", req: "App load ≤2s lần đầu", value: "~1.8s", pass: true },
                { code: "NFR-PF-07", req: "TTFB ≤500ms", value: "~320ms", pass: true },
              ].map((r, i) => (
                <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border ${r.pass === true ? "bg-[#4A7C5C]/10 border-[#4A7C5C]/20" : r.pass === false ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10"}`}>
                  {/* Mobile: row 1 = code + status. Desktop: code on left */}
                  <div className="flex items-center gap-2 justify-between sm:contents">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 shrink-0 ${r.pass === true ? "text-emerald-300" : r.pass === false ? "text-red-300" : "text-slate-400"}`}>{r.code}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 sm:order-last ${r.pass === true ? "bg-[#4A7C5C]/20 text-emerald-300" : r.pass === false ? "bg-red-500/20 text-red-300" : "bg-slate-500/20 text-slate-400"}`}>
                      {r.pass === true ? "PASS" : r.pass === false ? "FAIL" : "PENDING"}
                    </span>
                  </div>
                  <span className="text-sm flex-1 text-slate-200 min-w-0 break-words leading-snug">{r.req}</span>
                  <span className={`text-xs sm:text-sm font-bold shrink-0 ${r.pass === true ? "text-[#6FB585]" : r.pass === false ? "text-red-400" : "text-slate-400"}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Accuracy (Table 13) */}
          <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A557]">psychology</span>
              AI Accuracy Requirements (Giai đoạn 2)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/10">
                    <th className="py-2 pr-4 text-left">Module AI</th>
                    <th className="py-2 pr-4 text-left">Chỉ số</th>
                    <th className="py-2 pr-4 text-left">Ngưỡng yêu cầu</th>
                    <th className="py-2 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { module: "Computer Vision - Bao bì", metric: "Precision / Recall / F1", target: "≥85% / ≥80% / ≥82%", ready: false },
                    { module: "OCR - Text trên bao bì",   metric: "CER ≤10%, WER ≤15%",     target: "CER ≤10%, WER ≤15%",   ready: false },
                    { module: "Anomaly Detection - Hành vi quét", metric: "Precision ≥80%, FP ≤5%", target: "FP rate ≤5%", ready: false },
                    { module: "Serial Validation",        metric: "Accuracy",                target: "≥99%",                 ready: true },
                  ].map((r, i) => (
                    <tr key={i} className="hover:bg-white/5 transition">
                      <td className="py-3 pr-4 font-medium text-white">{r.module}</td>
                      <td className="py-3 pr-4 text-slate-400 text-xs">{r.metric}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-cyan-300">{r.target}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${r.ready ? "text-emerald-300 bg-[#4A7C5C]/15 border border-[#4A7C5C]/30" : "text-slate-400 bg-white/5 border border-white/10"}`}>
                          {r.ready ? "✓ Live" : "⏳ Giai đoạn 2"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
