"use client";
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
  success: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  error:   "text-red-300 bg-red-500/15 border-red-500/30",
  warning: "text-amber-300 bg-amber-500/15 border-amber-500/30",
};

const ROLE_COLORS: Record<string, string> = {
  admin:        "text-violet-300",
  manufacturer: "text-blue-300",
  importer:     "text-cyan-300",
  consumer:     "text-emerald-300",
  unknown:      "text-slate-500",
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
    if (role !== "admin") { router.replace("/dashboard"); return; }
    setLoading(false);
    fetchHealth();
    fetchLogs();
  }, []);

  useEffect(() => { fetchLogs(); }, [statusFilter, roleFilter, page]);

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

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const slaColor = (ms: number) => ms <= 200 ? "text-emerald-400" : ms <= 500 ? "text-amber-400" : "text-red-400";

  const TABS: [string, string, string][] = [
    ["health", t("sec_tab_health"), "monitor_heart"],
    ["audit",  t("sec_tab_audit"),  "receipt_long"],
    ["nfr",    t("sec_tab_nfr"),    "checklist"],
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl ${toast.ok ? "bg-emerald-600" : "bg-red-600"} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {t("cmn_dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-400">security</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline flex items-center gap-2">
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition ${activeTab === k ? "bg-violet-500 text-white border-violet-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
            <span className="material-symbols-outlined text-[15px]">{icon}</span>
            {l}
          </button>
        ))}
      </div>

      {/* ── SYSTEM HEALTH TAB ── */}
      {activeTab === "health" && health && (
        <div className="space-y-6">
          {/* SLA Performance (NFR-PF) */}
          <div className="glass-panel border border-violet-500/20 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-400 text-[18px]">speed</span>
              SLA Performance — NFR-PF
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Uptime", value: health.sla.uptime, target: "≥99.5%", pass: true, icon: "cloud_done" },
                { label: "P95 Response", value: health.sla.p95ResponseMs + "ms", target: "≤200ms", pass: health.sla.p95ResponseMs <= 200, icon: "timer" },
                { label: "P50 Response", value: health.sla.p50ResponseMs + "ms", target: "≤100ms", pass: health.sla.p50ResponseMs <= 100, icon: "timer" },
                { label: "Open Alerts", value: health.alerts.open, target: "= 0 ideal", pass: health.alerts.open === 0, icon: "notifications_active" },
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-xl border ${s.pass ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`material-symbols-outlined text-[16px] ${s.pass ? "text-emerald-400" : "text-red-400"}`}>{s.icon}</span>
                    <span className={`text-xs font-bold ${s.pass ? "text-emerald-300" : "text-red-300"}`}>{s.pass ? "OK" : t("sec_warn_label")}</span>
                  </div>
                  <p className={`text-2xl font-black mt-1 ${s.pass ? "text-white" : "text-red-300"}`}>{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Target: {s.target}</p>
                </div>
              ))}
            </div>
          </div>

          {/* System Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t("sec_users"),    value: health.users.total,       icon: "people",          color: "text-blue-400" },
              { label: t("sec_products"), value: health.data.products,     icon: "inventory_2",     color: "text-cyan-400" },
              { label: t("sec_batches"),  value: health.data.batches,      icon: "inventory",       color: "text-purple-400" },
              { label: t("sec_scans"),    value: health.data.scans.toLocaleString(), icon: "qr_code_scanner", color: "text-white" },
              { label: t("sec_total_logs"), value: health.logs.total,      icon: "receipt_long",    color: "text-slate-300" },
              { label: t("sec_errors"),   value: health.logs.errors,       icon: "error",           color: health.logs.errors > 0 ? "text-red-400" : "text-emerald-400" },
              { label: t("sec_warnings"), value: health.logs.warnings,     icon: "warning",         color: health.logs.warnings > 10 ? "text-amber-400" : "text-slate-300" },
              { label: t("sec_weak_pw"),  value: health.security.nonCompliantPasswords, icon: "key_off", color: health.security.nonCompliantPasswords > 0 ? "text-red-400" : "text-emerald-400" },
            ].map((s, i) => (
              <div key={i} className="glass-panel border border-white/10 rounded-xl p-4">
                <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
                <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent errors */}
          {health.recentErrors.length > 0 && (
            <div className="glass-panel border border-red-500/20 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400 text-[18px]">error</span>
                {t("sec_recent_errors")}
              </h2>
              <div className="space-y-2">
                {health.recentErrors.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
                    <span className="material-symbols-outlined text-red-400 text-[16px] shrink-0">error</span>
                    <div className="flex-1">
                      <p className="text-red-200 font-medium">{e.action}</p>
                      <p className="text-xs text-slate-500">{e.user} · {e.ip}</p>
                    </div>
                    <p className="text-xs text-slate-500 shrink-0">{new Date(e.time).toLocaleString("vi-VN")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-400 placeholder:text-slate-500" />
              <button type="submit" className="px-4 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold hover:bg-violet-400 transition">{t("sec_find")}</button>
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
                <option value="importer">{t("sec_importer")}</option>
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
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-white/5">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3">{t("sec_time")}</th>
                    <th className="px-4 py-3">{t("sec_user_role")}</th>
                    <th className="px-4 py-3">{t("sec_action")}</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">{t("sec_status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logData?.logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.time).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white font-medium">{log.user}</p>
                        <p className={`text-xs font-bold ${ROLE_COLORS[log.role] || "text-slate-400"}`}>{log.role}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200 max-w-xs">
                        <span className="truncate block" title={log.action}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.ip}</td>
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
          <div className="glass-panel border border-violet-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-400">shield</span>
                NFR-SC: Security Controls Checklist
              </h2>
              <div className="text-center">
                <p className={`text-4xl font-black ${scoreColor(health.security.score)}`}>{health.security.score}</p>
                <p className="text-xs text-slate-400">/100</p>
              </div>
            </div>
            <div className="space-y-2">
              {health.security.checks.map((c, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${c.pass ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <span className={`material-symbols-outlined text-[18px] shrink-0 ${c.pass ? "text-emerald-400" : "text-red-400"}`}>
                    {c.pass ? "check_circle" : "cancel"}
                  </span>
                  <span className={`text-sm flex-1 font-medium ${c.pass ? "text-white" : "text-red-200"}`}>{c.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.pass ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                    {c.pass ? "PASS" : "FAIL"} +{c.weight}pts
                  </span>
                </div>
              ))}
            </div>
            {!health.security.checks.find(c => c.name.includes('2FA'))?.pass && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex gap-2">
                <span className="material-symbols-outlined text-[15px] shrink-0">info</span>
                <span><strong>NFR-SC-03:</strong> 2FA chưa được enforce. Cần triển khai TOTP (Google Authenticator) hoặc OTP via SMS (Twilio) trong Giai đoạn 2.</span>
              </div>
            )}
          </div>

          {/* NFR-PF Performance Checklist */}
          <div className="glass-panel border border-blue-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">speed</span>
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
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${r.pass === true ? "bg-emerald-500/10 border-emerald-500/20" : r.pass === false ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10"}`}>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 shrink-0 ${r.pass === true ? "text-emerald-300" : r.pass === false ? "text-red-300" : "text-slate-400"}`}>{r.code}</span>
                  <span className="text-sm flex-1 text-slate-200">{r.req}</span>
                  <span className={`text-sm font-bold ${r.pass === true ? "text-emerald-400" : r.pass === false ? "text-red-400" : "text-slate-400"}`}>{r.value}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.pass === true ? "bg-emerald-500/20 text-emerald-300" : r.pass === false ? "bg-red-500/20 text-red-300" : "bg-slate-500/20 text-slate-400"}`}>
                    {r.pass === true ? "PASS" : r.pass === false ? "FAIL" : "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Accuracy (Table 13) */}
          <div className="glass-panel border border-purple-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">psychology</span>
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
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${r.ready ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" : "text-slate-400 bg-white/5 border border-white/10"}`}>
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
