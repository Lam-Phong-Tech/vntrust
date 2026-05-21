"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface Integration {
  id: string; name: string; description: string; protocol: string;
  status: string; latencyMs: number | null; lastSync: string | null;
  icon: string; color: string; endpoint: string; authType: string;
  dataFields: string[]; phase: number;
}

interface GovResult {
  status: string; source: string; checkedAt: string; data?: any;
  soToKhai?: string; soChungNhan?: string; soGiayPhep?: string;
  tenHangHoa?: string; tenSanPham?: string; tenDoanhNghiep?: string;
  ngayCap?: string; ngayHetHan?: string; ngayThongQuan?: string;
  cuaKhau?: string; nuocXuatXu?: string; hsCode?: string; soLuong?: string;
  toChucCap?: string; loaiGiayPhep?: string;
}

const STATUS_STYLE_KEYS = ["active", "configured", "pending", "error"] as const;
const STATUS_CLS: Record<string, { cls: string; dot: string; labelKey: string }> = {
  active:     { cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-400",             labelKey: "int_active" },
  configured: { cls: "text-blue-300 bg-blue-500/15 border-blue-500/30",         dot: "bg-blue-400 animate-pulse",  labelKey: "int_configured" },
  pending:    { cls: "text-amber-300 bg-amber-500/15 border-amber-500/30",       dot: "bg-amber-400",               labelKey: "int_pending" },
  error:      { cls: "text-red-300 bg-red-500/15 border-red-500/30",             dot: "bg-red-400",                 labelKey: "int_error" },
};

const COLOR_MAP: Record<string, string> = {
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  red: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function IntegrationPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuery, setActiveQuery] = useState<string>("check_haiquan");
  const [queryCode, setQueryCode] = useState("");
  const [querying, setQuerying] = useState(false);
  const [forceChecking, setForceChecking] = useState(false);
  const [queryResult, setQueryResult] = useState<{ result: GovResult; elapsedMs: number } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/gov-integration?type=status");
    const data = await res.json();
    setIntegrations(data.integrations || []);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (!["admin", "manufacturer", "importer"].includes(role)) { router.replace("/dashboard"); return; }
    setUserRole(role);
    fetchStatus();
    // Auto-refresh mỗi 30 giây — đồng bộ với background checker
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryCode.trim()) { showToast("Vui lòng nhập mã tra cứu", false); return; }
    setQuerying(true);
    setQueryResult(null);
    const res = await fetch(`/api/gov-integration?type=${activeQuery}&code=${encodeURIComponent(queryCode)}`);
    const data = await res.json();
    if (!res.ok) showToast("✗ " + data.error, false);
    else setQueryResult(data);
    setQuerying(false);
  };

  const handleForceCheck = async () => {
    setForceChecking(true);
    const res = await fetch("/api/gov-integration?type=force_check");
    if (res.ok) { await fetchStatus(); showToast("✓ Đã kiểm tra lại tất cả integration", true); }
    else showToast("✗ Lỗi khi force check", false);
    setForceChecking(false);
  };

  const QUERY_OPTIONS = [
    { value: "check_haiquan", label: t("int_haiquan"), icon: "local_shipping",   placeholder: "VD: HQ2024/001234" },
    { value: "check_byt",     label: t("int_byt"),     icon: "medical_services", placeholder: "VD: ATTP/2024/0892" },
    { value: "check_bct",     label: t("int_bct"),     icon: "business",         placeholder: "VD: BCT/GP/2024/5678" },
  ];

  if (!userRole) return null;

  const activeCount  = integrations.filter(i => i.status === "active").length;
  const configuredCount = integrations.filter(i => i.status === "configured").length;
  const pendingCount = integrations.filter(i => i.status === "pending").length;

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl ${toast.ok ? "bg-emerald-600" : "bg-red-600"} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span> Bảng điều khiển
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-cyan-400">hub</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline">{t("int_title")}</h1>
              <p className="text-sm text-slate-400">{t("int_sub")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && <p className="text-xs text-slate-500">{t("cmn_updated")}: {lastRefresh.toLocaleTimeString()}</p>}
            {userRole === 'admin' && (
              <button onClick={handleForceCheck} disabled={forceChecking}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition disabled:opacity-50">
                {forceChecking
                  ? <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-[14px]">refresh</span>}
                Force Check
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: t("int_active"),     value: activeCount,    color: "text-emerald-400", icon: "check_circle" },
          { label: t("int_configured"),  value: configuredCount, color: "text-blue-400",   icon: "settings" },
          { label: t("int_pending"),     value: pendingCount,   color: "text-amber-400",   icon: "pending" },
        ].map((s, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
          {integrations.map(intg => {
            const st = STATUS_CLS[intg.status] || STATUS_CLS.pending;
            const colCls = COLOR_MAP[intg.color] || COLOR_MAP.blue;
            return (
              <div key={intg.id} className={`glass-panel border rounded-2xl p-5 flex flex-col gap-3 ${colCls}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-2xl`}>{intg.icon}</span>
                    <div>
                      <p className="font-bold text-white text-sm">{intg.name}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${st.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {t(st.labelKey)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {t("cmn_phase")} {intg.phase}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{intg.description}</p>

                {/* Tech info */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-16 shrink-0">Protocol:</span>
                    <span className="text-slate-300 font-mono text-[10px]">{intg.protocol}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-16 shrink-0">Auth:</span>
                    <span className="text-slate-300">{intg.authType}</span>
                  </div>
                  {intg.latencyMs && (
                    <div className="flex gap-2">
                      <span className="text-slate-500 w-16 shrink-0">Latency:</span>
                      <span className={`font-bold ${intg.latencyMs <= 500 ? "text-emerald-400" : "text-red-400"}`}>{intg.latencyMs}ms</span>
                    </div>
                  )}
                  {intg.lastSync && (
                    <div className="flex gap-2">
                      <span className="text-slate-500 w-16 shrink-0">Sync:</span>
                      <span className="text-slate-400">{new Date(intg.lastSync).toLocaleString("vi-VN")}</span>
                    </div>
                  )}
                </div>

                {/* Data fields */}
                <div className="flex flex-wrap gap-1 pt-1 border-t border-white/10">
                  {intg.dataFields.map((f, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/10 text-slate-400 rounded font-medium">{f}</span>
                  ))}
                </div>

                {(intg as any).lastError && (
                  <div className="text-[10px] text-red-300 flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5">
                    <span className="material-symbols-outlined text-[12px]">warning</span>
                    {(intg as any).lastError}
                  </div>
                )}
                {intg.status === "pending" && !(intg as any).lastError && (
                  <div className="text-[10px] text-amber-300 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    {t("int_phase2_note")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Gov API Query Tool (BR-07) */}
      <div className="glass-panel border border-cyan-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">manage_search</span>
          {t("int_query_title")}
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          {t("int_query_sub")}
        </p>

        {/* Query type tabs */}
        <div className="flex gap-2 mb-4">
          {QUERY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => { setActiveQuery(opt.value); setQueryResult(null); setQueryCode(""); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${activeQuery === opt.value ? "bg-cyan-500 text-white border-cyan-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
              <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleQuery} className="flex gap-3">
          <input value={queryCode} onChange={e => setQueryCode(e.target.value)}
            placeholder={QUERY_OPTIONS.find(o => o.value === activeQuery)?.placeholder}
            className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400" />
          <button type="submit" disabled={querying}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2">
            {querying ? <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> : <span className="material-symbols-outlined text-[16px]">search</span>}
            {t("int_search")}
          </button>
        </form>

        {/* Query Result */}
        {queryResult && (
          <div className={`mt-5 p-4 rounded-xl border ${queryResult.result.status === "valid" ? "bg-emerald-500/10 border-emerald-500/30" : queryResult.result.status === "not_found" ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20"}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`material-symbols-outlined text-2xl ${queryResult.result.status === "valid" ? "text-emerald-400" : queryResult.result.status === "not_found" ? "text-amber-400" : "text-red-400"}`}>
                {queryResult.result.status === "valid" ? "verified" : queryResult.result.status === "not_found" ? "search_off" : "error"}
              </span>
              <div>
                <p className={`font-bold text-sm ${queryResult.result.status === "valid" ? "text-emerald-300" : queryResult.result.status === "not_found" ? "text-amber-300" : "text-red-300"}`}>
                {queryResult.result.status === "valid" ? `✓ ${t("int_valid")}` : queryResult.result.status === "not_found" ? `⚠ ${t("int_not_found")}` : "✗ Error"}
                </p>
                <p className="text-xs text-slate-400">{t("int_source")}: {queryResult.result.source} · {queryResult.elapsedMs}ms</p>
              </div>
            </div>

            {queryResult.result.status === "valid" && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(queryResult.result).filter(([k]) => !["status", "source", "checkedAt"].includes(k)).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
                    <span className="text-white font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {queryResult.result.status === "not_found" && (
              <p className="text-xs text-amber-300">Mã không tồn tại trong hệ thống {queryResult.result.source}. Thử mã mẫu: <strong>HQ2024/001234</strong>, <strong>ATTP/2024/0892</strong>, <strong>BCT/GP/2024/5678</strong></p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
