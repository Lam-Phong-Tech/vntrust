"use client";
import { Toast } from "@/components/Toast";
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

// §VI Sprint 11 — Priority + Risk styling
const PRIORITY_STYLE: Record<string, { label: string; cls: string; icon: string }> = {
  critical: { label: "Critical", cls: "text-red-300 bg-red-500/15 border-red-500/40",       icon: "emergency" },
  high:     { label: "Cao",       cls: "text-orange-300 bg-orange-500/15 border-orange-500/40", icon: "priority_high" },
  medium:   { label: "Trung bình", cls: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30", icon: "warning" },
  low:      { label: "Thấp",       cls: "text-blue-300 bg-[#C8A557]/10 border-[#C8A557]/20",   icon: "info" },
};
const RISK_STYLE: Record<string, { label: string; cls: string; bar: string }> = {
  high:   { label: "Rủi ro cao",   cls: "text-red-300 bg-red-500/15 border-red-500/40",  bar: "bg-red-500" },
  medium: { label: "Trung bình",   cls: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30", bar: "bg-[#C8A557]" },
  low:    { label: "An toàn",      cls: "text-emerald-300 bg-[#4A7C5C]/15 border-[#4A7C5C]/30", bar: "bg-[#6FB585]" },
};

export default function ComplianceDashboard() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === 'en' ? en : vi);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState<string>("all"); // Sprint 11
  const [expandedId, setExpandedId] = useState<string | null>(null);  // Sprint 11 — DN detail
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
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-[#C8A557]"></div>
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
  // Sprint 11 — Filter theo priority level
  if (filterPriority !== "all") {
    filtered = filtered.filter((i: any) => (i.priorityBreakdown?.[filterPriority] || 0) > 0);
  }

  const revokedCount = complianceList.filter((i: any) => i.kycStatus === "revoked").length;
  const nonCompliantCount = stats.nonCompliance;
  // Sprint 11 — §VI new aggregates
  const priorityTotals = stats.priorityTotals || { critical: 0, high: 0, medium: 0, low: 0 };
  const heatmap = (data.heatmap || []) as Array<{ region: string; count: number; nonCompliant: number; avgScore: number; riskLevel: 'high' | 'medium' | 'low' }>;

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}

      {/* ── Header (giống Alerts) ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {t("cmn_dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A7C5C]/20 border border-[#4A7C5C]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#6FB585]">fact_check</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
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
        <div className="flex items-center gap-2 flex-wrap">
          {userRole === "admin" && (
            <Link
              href="/dashboard/compliance/legal"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#C8A557]/10 border border-[#C8A557]/30 text-[#C8A557] rounded-xl text-sm font-bold hover:bg-[#C8A557]/20 transition"
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              {t("comp_legal_link") || "Tuân thủ Pháp lý"}
            </Link>
          )}
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#C8A557]/20 hover:bg-[#C8A557]/30 text-cyan-300 border border-[#C8A557]/30 rounded-xl text-sm font-bold transition active:scale-95"
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
          { label: t("comp_full"),    value: stats.fullCompliance,    icon: "verified",       color: "text-[#6FB585]" },
          { label: t("comp_partial"), value: stats.partialCompliance, icon: "rule",           color: "text-[#C8A557]", pulse: stats.partialCompliance > 0 },
          { label: t("comp_none"),    value: stats.nonCompliance,     icon: "gpp_bad",        color: "text-red-400",   pulse: stats.nonCompliance > 0 },
        ].map((s, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4">
            <span className={`material-symbols-outlined text-2xl ${s.color} ${ (s as any).pulse ? "animate-pulse" : ""}`}>{s.icon}</span>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ═══ §VI Sprint 11 — Priority breakdown + Heatmap khu vực ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Priority breakdown — left col (1/3) */}
        <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C8A557] text-[18px]">stacked_bar_chart</span>
            {tr("Phân loại vi phạm theo mức độ", "Violations by priority")}
          </h2>
          <p className="text-[11px] text-slate-400 mb-3">{tr("Theo §VI.4.2 — Bấm để lọc DN", "Per §VI.4.2 — Click to filter DN")}</p>
          <div className="space-y-2">
            {(['critical', 'high', 'medium', 'low'] as const).map(p => {
              const style = PRIORITY_STYLE[p];
              const count = priorityTotals[p] || 0;
              const total = priorityTotals.critical + priorityTotals.high + priorityTotals.medium + priorityTotals.low || 1;
              const pct = Math.round((count / total) * 100);
              const active = filterPriority === p;
              return (
                <button
                  key={p}
                  onClick={() => setFilterPriority(active ? 'all' : p)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition text-left ${active ? style.cls : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${active ? '' : 'text-slate-400'}`}>{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold ${active ? '' : 'text-slate-300'}`}>{style.label}</span>
                      <span className={`text-sm font-black ${active ? '' : 'text-white'}`}>{count}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${p === 'critical' ? 'bg-red-500' : p === 'high' ? 'bg-orange-500' : p === 'medium' ? 'bg-[#C8A557]' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {filterPriority !== 'all' && (
            <button
              onClick={() => setFilterPriority('all')}
              className="w-full mt-3 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 hover:bg-white/10 transition"
            >
              {tr("Bỏ lọc", "Clear filter")} ×
            </button>
          )}
        </div>

        {/* Heatmap khu vực — right col (2/3) */}
        <div className="lg:col-span-2 glass-panel border border-[#C8A557]/20 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C8A557] text-[18px]">map</span>
            {tr("Bản đồ nóng — DN rủi ro theo khu vực", "Heatmap — High-risk DN by region")}
          </h2>
          <p className="text-[11px] text-slate-400 mb-3">{tr("Theo §VI.4.4 — Phân bố DN không đáp ứng theo tỉnh/thành", "Per §VI.4.4 — Non-compliant DN distribution by province")}</p>
          {heatmap.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">{tr("Chưa có dữ liệu vùng", "No region data yet")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {heatmap.map((h, i) => {
                const risk = RISK_STYLE[h.riskLevel];
                const dangerPct = h.count > 0 ? Math.round((h.nonCompliant / h.count) * 100) : 0;
                return (
                  <div key={i} className={`p-3 rounded-xl border ${risk.cls}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[16px] shrink-0">place</span>
                        <span className="text-sm font-bold text-white truncate">{h.region}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        {risk.label}
                      </span>
                    </div>
                    <div className="flex items-end justify-between text-xs mb-1.5">
                      <span className="text-slate-400">
                        <span className="font-black text-base text-white">{h.nonCompliant}</span>
                        <span className="text-slate-500">/{h.count}</span>
                        {tr(" DN vi phạm", " non-compliant")}
                      </span>
                      <span className="text-slate-300 font-mono">{tr("TB", "Avg")}: {h.avgScore}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${risk.bar} transition-all`} style={{ width: `${dangerPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Tabs (giống Alerts) ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTER_KEYS.map((k) => (
            <button key={k} onClick={() => setFilterStatus(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                filterStatus === k
                  ? "bg-[#4A7C5C] text-white border-[#4A7C5C]"
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
                  ? "bg-[#C8A557] text-white border-[#C8A557]"
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
            className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/20 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] w-52 transition"
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
                ? "text-emerald-300 bg-[#4A7C5C]/15 border-[#4A7C5C]/30"
                : item.status === "Đáp ứng một phần"
                ? "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30"
                : "text-red-400 bg-red-500/15 border-red-500/30";
            const loaiCls = item.loai === "NSX"
              ? "text-blue-300 bg-[#C8A557]/15 border-[#C8A557]/30"
              : "text-purple-300 bg-[#C8A557]/15 border-[#C8A557]/30";
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
                            ? "text-emerald-300 bg-[#4A7C5C]/10 border-[#4A7C5C]/20"
                            : item.score >= 50
                            ? "text-amber-300 bg-[#C8A557]/10 border-[#C8A557]/20"
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
                          className={`h-1 rounded-full transition-all ${item.score === 100 ? "bg-[#4A7C5C]" : item.score >= 50 ? "bg-[#C8A557]" : "bg-red-400"}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>

                      {/* Missing items + §VI Sprint 11 priority badges + expandable detail */}
                      {item.details.length === 0 ? (
                        <span className="text-[#6FB585] flex items-center gap-1 text-xs">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          {t("comp_ok")}
                        </span>
                      ) : (
                        <div className="space-y-2">
                          {/* Priority badges row — quick overview */}
                          {item.priorityBreakdown && (
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              {(['critical', 'high', 'medium', 'low'] as const).map(p => {
                                const c = item.priorityBreakdown[p];
                                if (!c) return null;
                                const s = PRIORITY_STYLE[p];
                                return (
                                  <span key={p} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold ${s.cls}`}>
                                    <span className="material-symbols-outlined text-[10px]">{s.icon}</span>
                                    {c} {s.label.toLowerCase()}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Expand toggle */}
                          <button
                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            className="text-xs text-[#C8A557] hover:text-[#E4D2A1] flex items-center gap-1 font-medium"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {expandedId === item.id ? 'expand_less' : 'expand_more'}
                            </span>
                            {expandedId === item.id
                              ? tr(`Ẩn ${item.details.length} hạng mục thiếu`, `Hide ${item.details.length} missing items`)
                              : tr(`Xem ${item.details.length} hạng mục thiếu`, `View ${item.details.length} missing items`)}
                          </button>

                          {/* Expanded list — §VI.4.2 structured detailedItems */}
                          {expandedId === item.id && (
                            <div className="mt-2 space-y-2 pl-1 border-l-2 border-[#C8A557]/30 ml-1 pt-1">
                              {(item.detailedItems || []).map((d: any, idx: number) => {
                                const s = PRIORITY_STYLE[d.priority] || PRIORITY_STYLE.medium;
                                return (
                                  <div key={idx} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                                    <div className="flex items-start gap-2 mb-1.5">
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${s.cls} shrink-0`}>
                                        <span className="material-symbols-outlined text-[10px]">{s.icon}</span>
                                        {s.label}
                                      </span>
                                      <span className="text-xs text-slate-200 leading-snug flex-1">{d.message}</span>
                                    </div>
                                    {d.canCu && (
                                      <p className="text-[10px] text-slate-400 mt-1 flex items-start gap-1">
                                        <span className="material-symbols-outlined text-[11px] text-[#C8A557] shrink-0">gavel</span>
                                        <span>{tr("Căn cứ:", "Basis:")} <span className="text-slate-300 font-medium">{d.canCu}</span></span>
                                      </p>
                                    )}
                                    {d.hanhDong && (
                                      <p className="text-[10px] text-[#6FB585] mt-1 flex items-start gap-1">
                                        <span className="material-symbols-outlined text-[11px] shrink-0">arrow_right</span>
                                        <span><span className="text-slate-400">{tr("Đề xuất:", "Action:")}</span> {d.hanhDong}</span>
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                              {/* Fallback if no detailedItems — show plain details */}
                              {(!item.detailedItems || item.detailedItems.length === 0) && (
                                <ul className="list-disc list-inside space-y-0.5 text-red-400 text-xs">
                                  {item.details.map((detail: string, idx: number) => (
                                    <li key={idx}>{detail}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
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
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A7C5C]/20 text-emerald-300 border border-[#4A7C5C]/30 rounded-lg text-xs font-bold hover:bg-[#4A7C5C]/30 transition disabled:opacity-50"
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
