"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface AnalyticsData {
  period: string;
  totalProducts: number;
  totalBatches: number;
  totalQR: number;
  totalScans: number;
  totalFake: number;
  openAlerts: number;
  expiringSoon: number;
  fakeRate: string;
}

interface ScanStats {
  totalScans: number;
  genuineScans: number;
  suspectScans: number;
  topProducts: Array<{ uid: string; soLanQuet: number; loHang: { sanPham: { ten: string; maSKU: string } } }>;
  scanTrend: Array<{ date: string; count: number }>;
}

interface ExpiringData {
  expiring: Array<{ id: string; maLo: string; hanDung: string; soLuong: number; sanPham: { ten: string; maSKU: string }; _count: { uids: number } }>;
  expired: Array<{ id: string; maLo: string; hanDung: string; soLuong: number; sanPham: { ten: string; maSKU: string } }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const [activeTab, setActiveTab] = useState<"overview" | "scans" | "expiring">("overview");
  const [overview, setOverview] = useState<AnalyticsData | null>(null);
  const [scanStats, setScanStats] = useState<ScanStats | null>(null);
  const [expiringData, setExpiringData] = useState<ExpiringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const formatScanCount = (count: number): string => {
    if (count <= 0) return "0";
    if (count < 1000) return `${count}`;
    if (count < 1000000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    if (count < 1000000000) {
      return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (count < 1000000000000) {
      return `${(count / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
    }
    return `${count.toExponential(1).replace(/\.0(?=e)/, '').replace('+', '')}`;
  };

  const PERIOD_LABEL = () => ({
    week: t("ana_period_week"),
    month: t("ana_period_month"),
    quarter: t("ana_period_quarter"),
  });

  const exportCSV = async (exportPeriod: "week" | "month" | "quarter") => {
    setExporting(exportPeriod);
    try {
      const [ovRes, scanRes] = await Promise.all([
        fetch(`/api/analytics?type=overview&period=${exportPeriod}`),
        fetch(`/api/analytics?type=scan_stats&period=${exportPeriod}`),
      ]);
      const [ov, sc] = await Promise.all([ovRes.json(), scanRes.json()]);
      const now = new Date().toLocaleDateString("vi-VN");
      const periodLabel = exportPeriod === "week" ? "7_ngay" : exportPeriod === "month" ? "30_ngay" : "3_thang";
      const genuine = ov.totalScans - ov.totalFake;
      const integrity = ov.totalScans > 0 ? (100 - parseFloat(ov.fakeRate)).toFixed(1) : "100.0";

      const rows = [
        `VNTrust Report - Period: ${exportPeriod === "week" ? "7 days" : exportPeriod === "month" ? "30 days" : "3 months"}`,
        `Export date: ${now}`,
        ``,
        `Metric,Value`,
        `Total Products,${ov.totalProducts}`,
        `Total Batches,${ov.totalBatches}`,
        `Total QR Stamps,${ov.totalQR}`,
        `Total Scans,${ov.totalScans}`,
        `Genuine,${genuine}`,
        `Suspect/Fake,${ov.totalFake}`,
        `Fake Rate,${ov.fakeRate}%`,
        `Supply Chain Integrity,${integrity}%`,
        `Open Alerts,${ov.openAlerts}`,
        `Batches Expiring (30d),${ov.expiringSoon}`,
        ``,
        `Top Scanned Products,Scans`,
        ...(sc.topProducts || []).slice(0, 10).map((p: any) =>
          `"${p.loHang?.sanPham?.ten ?? 'N/A'} (${p.loHang?.sanPham?.maSKU ?? '-'})","${p.soLanQuet}"`
        ),
        ``,
        `Scan Trend (7 days),Count`,
        ...(sc.scanTrend || []).map((d: any) => `${d.date},${d.count}`),
      ];

      const csv = rows.join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: `VNTrust_Report_${periodLabel}_${now.replace(/\//g, "-")}.csv`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) {
      console.error("Export error", e);
    } finally {
      setExporting(null);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ovRes, scanRes, expRes] = await Promise.all([
      fetch(`/api/analytics?type=overview&period=${period}`),
      fetch(`/api/analytics?type=scan_stats&period=${period}`),
      fetch(`/api/analytics?type=expiring`),
    ]);
    const [ov, sc, ex] = await Promise.all([ovRes.json(), scanRes.json(), expRes.json()]);
    setOverview(ov);
    setScanStats(sc);
    setExpiringData(ex);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (!["admin", "manufacturer", "importer"].includes(role)) { router.replace("/dashboard"); return; }
    setUserRole(role);
  }, []);

  useEffect(() => { if (userRole) fetchData(); }, [userRole, period]);

  if (!userRole) return null;

  const pl = PERIOD_LABEL();
  const TABS: [string, string, string][] = [
    ["overview", t("ana_tab_overview"), "dashboard"],
    ["scans",    t("ana_tab_scans"),    "qr_code_scanner"],
    ["expiring", t("ana_tab_expiring"), "event_busy"],
  ];
  const EXPORT_ITEMS = [
    { label: t("ana_rpt_week"),    icon: "calendar_view_week",  period: "week"    as const },
    { label: t("ana_rpt_month"),   icon: "calendar_view_month", period: "month"   as const },
    { label: t("ana_rpt_quarter"), icon: "date_range",          period: "quarter" as const },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {t("cmn_dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-400">analytics</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline">{t("ana_title")}</h1>
              <p className="text-sm text-slate-400">
                {t("ana_sub")} {pl[period]} {t("ana_sub2")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {(["week", "month", "quarter"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${period === p ? "bg-indigo-500 text-white border-indigo-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
              {pl[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(([k, l, icon]) => (
          <button key={k} onClick={() => setActiveTab(k as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition ${activeTab === k ? "bg-indigo-500 text-white border-indigo-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
            <span className="material-symbols-outlined text-[15px]">{icon}</span>
            {l}
            {k === "expiring" && expiringData && expiringData.expiring.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{expiringData.expiring.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-400" />
        </div>
      ) : activeTab === "overview" && overview ? (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t("ana_products"), value: overview.totalProducts, icon: "inventory_2",    color: "text-blue-400",   sub: t("ana_registered") },
              { label: t("ana_batches"),  value: overview.totalBatches,  icon: "inventory",       color: "text-cyan-400",   sub: t("ana_created") },
              { label: t("ana_qr"),       value: overview.totalQR.toLocaleString(), icon: "qr_code", color: "text-purple-400", sub: t("ana_generated") },
              { label: t("ana_scans"),    value: overview.totalScans.toLocaleString(), icon: "qr_code_scanner", color: "text-white", sub: `${pl[period]} ${t("ana_period_ago")}` },
            ].map((s, i) => (
              <div key={i} className="glass-panel border border-white/10 rounded-2xl p-5">
                <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
                <p className={`text-3xl font-black mt-2 ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label} {s.sub}</p>
              </div>
            ))}
          </div>

          {/* Alert KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t("ana_suspects"),      value: overview.totalFake,    icon: "warning",              color: "text-red-400",   cls: "border-red-500/20 bg-red-900/10" },
              { label: t("ana_fake_rate"),      value: overview.fakeRate+"%", icon: "percent",              color: "text-red-300",   cls: "border-red-500/20" },
              { label: t("ana_open_alerts"),    value: overview.openAlerts,   icon: "notifications_active", color: overview.openAlerts > 0 ? "text-amber-400" : "text-emerald-400", cls: overview.openAlerts > 0 ? "border-amber-500/20 bg-amber-900/10" : "border-white/10" },
              { label: t("ana_expiring_soon"),  value: overview.expiringSoon, icon: "event_busy",           color: overview.expiringSoon > 0 ? "text-amber-400" : "text-emerald-400", cls: overview.expiringSoon > 0 ? "border-amber-500/20 bg-amber-900/10" : "border-white/10" },
            ].map((s, i) => (
              <div key={i} className={`glass-panel border rounded-2xl p-5 ${s.cls}`}>
                <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
                <p className={`text-3xl font-black mt-2 ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* FR-RPT-06: Export */}
          <div className="glass-panel border border-indigo-500/20 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-[18px]">file_download</span>
              {t("ana_export_title")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {EXPORT_ITEMS.map((r, i) => (
                <button key={i}
                  onClick={() => exportCSV(r.period)}
                  disabled={exporting === r.period}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 transition font-medium disabled:opacity-50">
                  {exporting === r.period
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <span className="material-symbols-outlined text-[16px]">{r.icon}</span>
                  }
                  {r.label}
                  <span className="text-xs text-slate-500">(CSV)</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "scans" && scanStats ? (
        <div className="space-y-6">
          {/* Scan KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("ana_total_scans"), value: scanStats.totalScans,    color: "text-white" },
              { label: t("ana_genuine"),      value: scanStats.genuineScans,  color: "text-emerald-400" },
              { label: t("ana_suspect"),      value: scanStats.suspectScans,  color: "text-red-400" },
            ].map((s, i) => (
              <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4">
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Scan trend */}
          <div className="glass-panel border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-[18px]">trending_up</span>
              {t("ana_scan_trend")
                .replace("7 ngày qua", `${pl[period].toLowerCase()} qua`)
                .replace("last 7 days", `last ${pl[period]}`)
                .replace("7天", pl[period])
                .replace("7日間", pl[period])
                .replace("7일", pl[period])
                .replace("7 derniers jours", pl[period])}
            </h2>
            <div className="flex items-end gap-2 h-32">
              {scanStats.scanTrend.map((day, i) => {
                const max = Math.max(...scanStats.scanTrend.map(d => d.count), 1);
                const height = Math.max((day.count / max) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-300">{day.count}</span>
                    <div className="w-full rounded-t-lg bg-indigo-500/60 hover:bg-indigo-400/80 transition"
                      style={{ height: `${height}%` }} title={`${day.date}: ${day.count}`} />
                    <span className="text-xs text-slate-400 whitespace-nowrap">{day.date.split("/").slice(0, 2).join("/")}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top scanned */}
          <div className="glass-panel border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-[18px]">leaderboard</span>
              {t("ana_top_products")}
            </h2>
            {scanStats.topProducts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">{t("ana_no_scans")}</p>
            ) : (
              <div className="space-y-2">
                {scanStats.topProducts.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <span className={`text-lg font-black w-6 text-center ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-500"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{p.loHang.sanPham.ten}</p>
                      <p className="text-xs text-slate-400 font-mono">{p.uid.substring(0, 8)}...</p>
                    </div>
                    <span 
                      className="text-sm font-bold text-cyan-300 whitespace-nowrap"
                      title={`${p.soLanQuet.toLocaleString()} ${t("cmn_times")}`}
                    >
                      {formatScanCount(p.soLanQuet)} {t("cmn_times")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "expiring" && expiringData ? (
        <div className="space-y-6">
          {/* FR-BAT-06: Expiring soon */}
          <div className="glass-panel border border-amber-500/20 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">schedule</span>
              {t("ana_expiring_30")}
              <span className="text-sm px-2 py-0.5 bg-amber-500 text-white rounded-full font-bold">{expiringData.expiring.length}</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">{t("ana_expiring_note")}</p>
            {expiringData.expiring.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 block text-emerald-400">check_circle</span>
                {t("ana_no_expiring")}
              </div>
            ) : (
              <div className="space-y-2">
                {expiringData.expiring.map(lo => {
                  const daysLeft = Math.ceil((new Date(lo.hanDung).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link key={lo.id} href={`/dashboard/inventory/${lo.id}/qr`} className={`flex items-center justify-between p-4 rounded-xl border hover:brightness-125 transition cursor-pointer block ${daysLeft <= 7 ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/20"}`}>
                      <div>
                        <p className="font-mono font-bold text-cyan-300 text-sm">{lo.maLo}</p>
                        <p className="text-white text-sm">{lo.sanPham.ten}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t("ana_exp_date")}: {new Date(lo.hanDung).toLocaleDateString("vi-VN")} · {lo._count?.uids?.toLocaleString() || lo.soLuong.toLocaleString()} items</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black ${daysLeft <= 7 ? "text-red-400" : "text-amber-400"}`}>{daysLeft}</p>
                        <p className="text-xs text-slate-400">{t("cmn_days_left")}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expired batches */}
          {expiringData.expired.length > 0 && (
            <div className="glass-panel border border-red-500/20 rounded-2xl p-5">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400">event_busy</span>
                {t("ana_expired_title")}
                <span className="text-sm px-2 py-0.5 bg-red-600 text-white rounded-full font-bold">{expiringData.expired.length}</span>
              </h2>
              <div className="space-y-2">
                {expiringData.expired.slice(0, 10).map(lo => (
                  <Link key={lo.id} href={`/dashboard/inventory/${lo.id}/qr`} className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition cursor-pointer block">
                    <div>
                      <span className="font-mono text-xs text-cyan-300">{lo.maLo}</span>
                      <span className="text-slate-400 text-xs ml-2">— {lo.sanPham.ten}</span>
                    </div>
                    <p className="text-xs text-red-400 font-bold">{t("ana_exp_date")}: {new Date(lo.hanDung).toLocaleDateString("vi-VN")}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
