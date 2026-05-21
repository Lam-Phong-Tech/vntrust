"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

const STATUS_FILTER_KEYS = ["all", "full", "partial", "none", "revoked"] as const;
const STATUS_LABELS: Record<string, string> = {
  all: "cmn_all", full: "comp_full", partial: "comp_partial",
  none: "comp_none", revoked: "comp_filter_revoked",
};
const TYPE_FILTER_KEYS = ["all", "NSX", "NNK"] as const;
const TYPE_LABELS: Record<string, string> = {
  all: "comp_all_types", NSX: "comp_nsx", NNK: "comp_nnk",
};

export default function ComplianceDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper: read doanhNghiepId from localStorage OR browser cookie
  const getDoanhNghiepId = useCallback(() => {
    if (typeof window === "undefined") return "";
    const fromLS = localStorage.getItem("doanhNghiepId") || "";
    if (fromLS) return fromLS;
    const match = document.cookie.match(/(?:^|;\\s*)doanhNghiepId=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const role = localStorage.getItem("userRole") || "";
    const doanhNghiepId = getDoanhNghiepId();
    if (doanhNghiepId && !localStorage.getItem("doanhNghiepId")) {
      localStorage.setItem("doanhNghiepId", doanhNghiepId);
    }
    const params = new URLSearchParams({ role });
    if (doanhNghiepId) params.set("doanhNghiepId", doanhNghiepId);
    try {
      const res = await fetch(`/api/compliance?${params}`);
      const d = await res.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "";
    if (!role) { router.replace("/login"); return; }
    setUserRole(role);
    fetchData();
  }, []);

  const handleLockToggle = async (companyId: string, currentStatus: string, companyName: string) => {
    const isRevoked = currentStatus === "revoked";
    const newStatus = isRevoked ? "verified" : "revoked";
    const confirmMsg = isRevoked
      ? `Mở khóa tài khoản "${companyName}"?`
      : `Thu hồi (khóa) tài khoản "${companyName}"? Doanh nghiệp sẽ không thể đăng nhập.`;
    if (!confirm(confirmMsg)) return;
    setActionLoading(companyId);
    try {
      const res = await fetch("/api/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_approval", id: companyId, trangThai: newStatus }),
      });
      const d = await res.json();
      if (!res.ok) showToast("✗ " + d.error, false);
      else {
        showToast(isRevoked ? `✓ Đã mở khóa ${companyName}` : `🔒 Đã thu hồi ${companyName}`, true);
        fetchData();
      }
    } catch (e: any) {
      showToast("✗ " + e.message, false);
    }
    setActionLoading(null);
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-cyan-400"></div>
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-center text-red-400">
        Lỗi tải dữ liệu: {error}
      </div>
    );

  const { stats, data: complianceList } = data;

  // Client-side filtering
  let filtered = complianceList as any[];
  if (search.trim()) {
    filtered = filtered.filter((i: any) => i.ten.toLowerCase().includes(search.toLowerCase()));
  }
  if (filterStatus !== "all") {
    filtered = filtered.filter((i: any) => {
      if (filterStatus === "revoked") return i.kycStatus === "revoked";
      if (filterStatus === "full")    return i.status === "Đáp ứng đầy đủ" && i.kycStatus !== "revoked";
      if (filterStatus === "partial") return i.status === "Đáp ứng một phần" && i.kycStatus !== "revoked";
      if (filterStatus === "none")    return i.status === "Chưa đáp ứng" && i.kycStatus !== "revoked";
      return true;
    });
  }
  if (filterType !== "all") {
    filtered = filtered.filter((i: any) => i.loai === filterType);
  }

  const revokedCount = complianceList.filter((i: any) => i.kycStatus === "revoked").length;
  const nonCompliantCount = stats.nonCompliance;

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl ${toast.ok ? "bg-emerald-600" : "bg-red-600"} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header (giống Alerts) ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {t("cmn_dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-400">fact_check</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline flex items-center gap-2">
                {t("comp_title")}
                {nonCompliantCount > 0 && (
                  <span className="text-sm px-2 py-0.5 bg-red-500 text-white rounded-full animate-pulse font-bold">
                    {nonCompliantCount} {t("comp_violations")}
                  </span>
                )}
                {revokedCount > 0 && (
                  <span className="text-sm px-2 py-0.5 bg-orange-500/80 text-white rounded-full font-bold">
                    {revokedCount} {t("comp_revoked_count")}
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-400">{t("comp_sub")}</p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-sm font-bold transition active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            {t("comp_scan_all")}
          </button>
        </div>
      </div>

      {/* ── Stats (icon style giống Alerts) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: t("comp_total"),   value: stats.totalDoanhNghiep,  icon: "corporate_fare", color: "text-white" },
          { label: t("comp_full"),    value: stats.fullCompliance,    icon: "verified",       color: "text-emerald-400" },
          { label: t("comp_partial"), value: stats.partialCompliance, icon: "rule",           color: "text-amber-400", pulse: stats.partialCompliance > 0 },
          { label: t("comp_none"),    value: stats.nonCompliance,     icon: "gpp_bad",        color: "text-red-400",   pulse: stats.nonCompliance > 0 },
        ].map((s, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4">
            <span className={`material-symbols-outlined text-2xl ${s.color} ${ (s as any).pulse ? "animate-pulse" : ""}`}>{s.icon}</span>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs (giống Alerts) ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTER_KEYS.map((k) => (
            <button key={k} onClick={() => setFilterStatus(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                filterStatus === k
                  ? "bg-emerald-500 text-white border-emerald-400"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}>
              {t(STATUS_LABELS[k])}
            </button>
          ))}
        </div>
        {/* Type filter */}
        <div className="flex gap-2">
          {TYPE_FILTER_KEYS.map((k) => (
            <button key={k} onClick={() => setFilterType(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                filterType === k
                  ? "bg-blue-500 text-white border-blue-400"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}>
              {t(TYPE_LABELS[k])}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative ml-auto">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[16px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("comp_search_ph")}
            className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/20 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 w-52 transition"
          />
        </div>
      </div>

      {/* Section header */}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-slate-300">{t("comp_detail_title")}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t("comp_detail_sub")}</p>
      </div>

      {/* ── Company List (card style giống Alerts) ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3 block">search_off</span>
          {search ? `${t("comp_no_data")}: "${search}"` : t("comp_no_data")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => {
            const isRevoked = item.kycStatus === "revoked";
            const statusCls =
              item.status === "Đáp ứng đầy đủ"
                ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                : item.status === "Đáp ứng một phần"
                ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
                : "text-red-400 bg-red-500/15 border-red-500/30";
            const loaiCls = item.loai === "NSX"
              ? "text-blue-300 bg-blue-500/15 border-blue-500/30"
              : "text-purple-300 bg-purple-500/15 border-purple-500/30";
            const cardBorder = isRevoked
              ? "border-orange-500/40 bg-orange-900/10"
              : item.status === "Chưa đáp ứng"
              ? "border-red-500/30 bg-red-900/5"
              : "border-white/10";

            return (
              <div key={item.id} className={`glass-panel border rounded-2xl p-5 transition hover:border-white/20 ${cardBorder} ${isRevoked ? "opacity-75" : ""}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Left: icon + info */}
                  <div className="flex gap-3 flex-1">
                    {/* Score circle */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${statusCls}`}>
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isRevoked ? "lock" : item.status === "Đáp ứng đầy đủ" ? "verified" : item.status === "Đáp ứng một phần" ? "rule" : "gpp_bad"}
                      </span>
                    </div>

                    <div className="flex-1">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${statusCls}`}>
                          {item.status}
                        </span>
                        {isRevoked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border bg-orange-500/15 text-orange-400 border-orange-500/30">
                            <span className="material-symbols-outlined text-[11px]">lock</span>
                            {t("comp_revoked_badge")}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${loaiCls}`}>
                          <span className="material-symbols-outlined text-[11px]">{item.loai === "NSX" ? "factory" : "local_shipping"}</span>
                          {item.loai === "NSX" ? t("comp_nsx") : t("comp_nnk")}
                        </span>
                        {/* Score badge */}
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                          item.score === 100
                            ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                            : item.score >= 50
                            ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                            : "text-red-300 bg-red-500/10 border-red-500/20"
                        }`}>
                          {item.score}%
                        </span>
                      </div>

                      {/* Company name */}
                      <p className="text-sm font-bold text-white">{item.ten}</p>

                      {/* Score bar */}
                      <div className="w-48 bg-white/10 rounded-full h-1 mt-1.5 mb-2">
                        <div
                          className={`h-1 rounded-full transition-all ${item.score === 100 ? "bg-emerald-400" : item.score >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>

                      {/* Missing items */}
                      {item.details.length === 0 ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-xs">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          {t("comp_ok")}
                        </span>
                      ) : (
                        <ul className="list-disc list-inside space-y-0.5 text-red-400 text-xs">
                          {item.details.map((detail: string, idx: number) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions (giống Alerts) */}
                  {userRole === "admin" && (
                    <div className="flex gap-2 shrink-0">
                      {isRevoked ? (
                        <button
                          onClick={() => handleLockToggle(item.id, item.kycStatus, item.ten)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition disabled:opacity-50"
                        >
                          {actionLoading === item.id
                            ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            : <span className="material-symbols-outlined text-[14px]">lock_open</span>
                          }
                          {t("comp_unlock")}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLockToggle(item.id, item.kycStatus, item.ten)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold hover:bg-orange-500/25 transition disabled:opacity-50"
                        >
                          {actionLoading === item.id
                            ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            : <span className="material-symbols-outlined text-[14px]">lock</span>
                          }
                          {t("comp_revoke")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {search && filtered.length > 0 && (
        <div className="mt-4 text-xs text-slate-500">
          {t("comp_found")} <strong className="text-white">{filtered.length}</strong> / {complianceList.length} {t("comp_businesses")}
        </div>
      )}
    </div>
  );
}
