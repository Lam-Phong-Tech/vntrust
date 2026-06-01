"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const LOCATION_HUBS = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Nha Trang", "Biên Hòa", "Huế"];
const PRODUCTS = ["Túi Xách Cao Cấp", "Đồng Hồ Cơ", "Rượu Vang Grand Cru", "Thiết Bị Y Tế", "Linh Kiện Bán Dẫn", "Mỹ Phẩm Thuần Chay"];
const ACTION_KEYS = ["sc_action_log1", "sc_action_log2", "sc_action_log3", "sc_action_log4"];

function generateId() {
  return "0x" + Math.random().toString(16).substr(2, 8);
}

export default function SupplyChainPage() {
  const [totalAuths, setTotalAuths] = useState(0);
  const [prevPeriodAuths, setPrevPeriodAuths] = useState(0);
  const [preventions, setPreventions] = useState(0);
  const [latency, setLatency] = useState(1.2);
  const [todayAuths, setTodayAuths] = useState(0);

  const [logs, setLogs] = useState<any[]>([]);
  const [liveNode, setLiveNode] = useState({
    loc: "Unknown",
    lat: "21.0285",
    lng: "105.8048",
  });

  const [chartPoints, setChartPoints] = useState<number[]>(Array(24).fill(180));
  const [chartLabels, setChartLabels] = useState<string[]>(Array(24).fill(""));
  const [chartPeriod, setChartPeriod] = useState<"1" | "7" | "30">("1");
  const [timeRange, setTimeRange] = useState("30");
  const { t } = useLanguage();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const role = localStorage.getItem("userRole") || "";
        const doanhNghiepId = localStorage.getItem("doanhNghiepId") || "";
        const params = new URLSearchParams({ days: timeRange, chartPeriod, role });
        if (doanhNghiepId) params.set("doanhNghiepId", doanhNghiepId);
        const res = await fetch(`/api/stats?${params}`);
        const data = await res.json();
        setTotalAuths(data.totalAuths ?? 0);
        setPrevPeriodAuths(data.prevPeriodAuths ?? 0);
        setPreventions(data.preventions ?? 0);
        setTodayAuths(data.todayAuths ?? 0);
        if (data.chartData && data.chartData.length > 0) {
          const counts: number[] = data.chartData;
          const maxCount = Math.max(...counts, 1);
          setChartPoints(counts.map((c) => 180 - (c / maxCount) * 160));
          setChartLabels(data.chartLabels ?? []);
        } else {
          const empty = chartPeriod === "1" ? 24 : chartPeriod === "7" ? 7 : 10;
          setChartPoints(Array(empty).fill(180));
          setChartLabels(Array(empty).fill(""));
        }
          if (data.recentLogs) {
            setLogs(data.recentLogs);
          }
          if (data.recentNode) {
            setLiveNode(data.recentNode);
          }
          setLatency((Math.random() * 1.5 + 0.5).toFixed(2) as unknown as number);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();

    const interval = setInterval(() => {
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [timeRange, chartPeriod]);

  const generatePath = (pts: number[]) => {
    if (pts.length < 2) return "";
    const svgW = 800;
    const step = svgW / (pts.length - 1);
    let d = "M 0 " + pts[0];
    for (let i = 1; i < pts.length; i++) {
      const cpX = (i - 0.5) * step;
      d += " C " + cpX + " " + pts[i - 1] + ", " + cpX + " " + pts[i] + ", " + (i * step) + " " + pts[i];
    }
    return d;
  };

  const linePath = generatePath(chartPoints);
  const lastPt = chartPoints[chartPoints.length - 1];
  const lastX = 800;

  const safeScoreNum = totalAuths > 0 ? (((totalAuths - preventions) / totalAuths) * 100) : 100;
  const safeScoreDisplay = safeScoreNum >= 99.9 && safeScoreNum < 100 ? 99.9 : parseFloat(safeScoreNum.toFixed(1));
  const dashOffset = 502 - (502 * safeScoreDisplay / 100);

  return (
    <div className="flex transparent font-body">
      <main className="mx-auto max-w-7xl w-full flex-1 p-4 sm:p-8 lg:p-12 overflow-x-hidden min-h-[calc(100vh-80px)] transparent">
        <header className="flex justify-between items-center mb-10 pb-4 border-b border-outline-variant/10">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-secondary mb-1 uppercase tracking-widest">
              <Link href="/dashboard" className="hover:text-white transition">{t("sc_board")}</Link>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-primary font-bold">{t("sc_analytics")}</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-headline tracking-tighter text-white">{t("sc_title")}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center bg-white/5 glass-panel text-white rounded-full border border-outline-variant/30 shadow-sm relative overflow-hidden">
              <span className="material-symbols-outlined text-outline text-sm absolute left-4 z-10 pointer-events-none">calendar_today</span>
              <select
                className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none appearance-none pr-10 pl-10 py-1.5 cursor-pointer w-full relative z-20"
                value={timeRange}
                onChange={(e) => {
                  setTimeRange(e.target.value);
                  setChartPeriod("1");
                }}
              >
                <option value="7">{t("sc_7d")}</option>
                <option value="30">{t("sc_30d")}</option>
                <option value="90">{t("sc_90d")}</option>
              </select>
              <span className="material-symbols-outlined text-outline text-sm absolute right-3 z-10 pointer-events-none">expand_more</span>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          {/* ── Stat Cards ── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white/5 glass-panel text-white p-6 rounded-2xl shadow-sm border-l-4 border-primary relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full scale-150 transition-transform group-hover:scale-175"></div>
              <p className="text-sm font-bold text-secondary uppercase tracking-tighter mb-2">{t("sc_total_auth")}</p>
              <div className="flex items-end gap-3">
                <h3 className="text-4xl font-extrabold font-headline text-white">{totalAuths.toLocaleString("en-US")}</h3>
                {(() => {
                  const rate = prevPeriodAuths > 0
                    ? (((totalAuths - prevPeriodAuths) / prevPeriodAuths) * 100).toFixed(1)
                    : totalAuths > 0 ? "100.0" : "0.0";
                  const pos = parseFloat(rate) >= 0;
                  return (
                    <span className={`text-xs font-bold mb-1.5 flex items-center px-2 py-0.5 rounded-full animate-pulse transition-all ${pos ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                      <span className="material-symbols-outlined text-xs">{pos ? "trending_up" : "trending_down"}</span> {pos ? "+" : ""}{rate}%
                    </span>
                  );
                })()}
              </div>
              <p className="text-[11px] text-outline mt-4 font-mono transition-opacity">HASH: {generateId()}...{generateId().substring(0, 4)}</p>
            </div>

            <div className="bg-white/5 glass-panel text-white p-6 rounded-2xl shadow-sm border-l-4 border-error relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-error/5 rounded-full scale-150 transition-transform group-hover:scale-175"></div>
              <p className="text-sm font-bold text-secondary uppercase tracking-tighter mb-2">{t("sc_fake_prev")}</p>
              <div className="flex items-end gap-3">
                <h3 className="text-4xl font-extrabold font-headline text-white">{preventions.toLocaleString("en-US")}</h3>
                <span className="text-error text-xs font-bold mb-1.5 flex items-center bg-error-container px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-xs">security</span> {t("sc_active_badge")}
                </span>
              </div>
              <p className="text-[11px] text-outline mt-4">{t("sc_ai_detect")}</p>
            </div>

            <div className="bg-white/5 glass-panel text-white p-6 rounded-2xl shadow-sm border-l-4 border-tertiary-container relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary-container/5 rounded-full scale-150 transition-transform group-hover:scale-175"></div>
              <p className="text-sm font-bold text-secondary uppercase tracking-tighter mb-2">{t("sc_efficiency")}</p>
              <div className="flex items-end gap-3">
                <h3 className="text-4xl font-extrabold font-headline text-white">{safeScoreDisplay}<span className="text-2xl">%</span></h3>
                <span className="text-emerald-700 text-xs font-bold mb-1.5 flex items-center bg-emerald-50 px-2 py-0.5 rounded-full">
                  {t("sc_optimal")}
                </span>
              </div>
              <p className="text-[11px] text-outline mt-4">{t("sc_latency")} {latency}ms (Live)</p>
            </div>
          </section>

          {/* ── Chart + Map + Log ── */}
          <section className="grid grid-cols-12 gap-6">
            {/* Chart */}
            <div className="col-span-12 lg:col-span-8 bg-white/5 glass-panel text-white p-8 rounded-2xl shadow-sm border border-outline-variant/10 transition-all overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h4 className="text-xl font-bold font-headline text-white flex items-center gap-2">
                    {t("sc_auth_speed")} <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </h4>
                  <p className="text-sm text-secondary">{t("sc_live_traffic")}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setChartPeriod("1")} className={`cursor-pointer z-20 relative ${chartPeriod === "1" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors`}>{t("sc_day")}</button>
                  {timeRange !== "7" && (
                    <button onClick={() => setChartPeriod("7")} className={`cursor-pointer z-20 relative ${chartPeriod === "7" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors`}>{t("sc_week")}</button>
                  )}
                  {timeRange === "90" && (
                    <button onClick={() => setChartPeriod("30")} className={`cursor-pointer z-20 relative ${chartPeriod === "30" ? "transparent-container text-primary" : "hover:transparent-container text-secondary"} px-4 py-2 rounded-lg text-xs font-bold transition-colors`}>{t("sc_month")}</button>
                  )}
                </div>
              </div>

              {/* SVG Line Chart */}
              <div className="relative w-full h-[200px]">
                <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3cdada" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3cdada" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {linePath && (
                    <>
                      <path d={`${linePath} L ${lastX} 200 L 0 200 Z`} fill="url(#chartGrad)" />
                      <path d={linePath} fill="none" stroke="#3cdada" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx={lastX} cy={lastPt} r="5" fill="#3cdada" />
                    </>
                  )}
                  {chartPoints.length === 0 && (
                    <text x="400" y="100" textAnchor="middle" fill="#64748b" fontSize="14">Chưa có dữ liệu quét</text>
                  )}
                </svg>
                {chartLabels.length > 0 && (
                  <div className="flex justify-between px-1 mt-1">
                    {chartLabels.filter((_, i) => i % Math.ceil(chartLabels.length / 6) === 0).map((l, i) => (
                      <span key={i} className="text-[9px] text-slate-500">{l}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Safe Score Gauge */}
              <div className="flex items-center justify-center mt-6 gap-8">
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                    <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" />
                    <circle cx="90" cy="90" r="80" fill="none" stroke="#3cdada" strokeWidth="16"
                      strokeDasharray="502" strokeDashoffset={dashOffset}
                      strokeLinecap="round" className="transition-all duration-700" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                    <span className="text-2xl font-extrabold text-white">{safeScoreDisplay}%</span>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter text-center leading-tight mt-1">{t("sc_trust_dist")}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span><span className="text-slate-300">{t("sc_total_auth")}: <strong className="text-white">{totalAuths.toLocaleString()}</strong></span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span><span className="text-slate-300">{t("sc_fake_prev")}: <strong className="text-white">{preventions.toLocaleString()}</strong></span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span><span className="text-slate-300">{t("sc_latency")}: <strong className="text-white">{latency}ms</strong></span></div>
                </div>
              </div>
            </div>

            {/* Safe Score + Right Column */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              {/* Map */}
              <div className="bg-white/5 glass-panel text-white p-6 rounded-2xl shadow-sm border border-outline-variant/10 flex-1">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-lg font-bold font-headline text-white">{t("sc_scan_activity")}</h4>
                    <p className="text-xs text-secondary">{t("sc_geo_dist")}</p>
                  </div>
                  <div className="p-2 transparent-container rounded-lg">
                    <span className="material-symbols-outlined text-primary">public</span>
                  </div>
                </div>
                <div className="relative w-full h-[200px] bg-white/10 rounded-xl overflow-hidden group">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-emerald-500/30 rounded-full blur-2xl animate-ping opacity-50"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-primary/80 rounded-full blur-md"></div>
                  <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-xl">
                    <p className="text-[9px] font-bold text-primary-fixed uppercase tracking-widest mb-0.5">{t("sc_live_data")}</p>
                    <p className="text-xs font-medium">{t("sc_new_scan")} {liveNode.loc}</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">LAT: {liveNode.lat} / LNG: {liveNode.lng}</p>
                  </div>
                </div>
              </div>

              {/* Today stat */}
              <div className="bg-white/5 glass-panel text-white p-5 rounded-2xl border border-outline-variant/10">
                <p className="text-xs text-secondary uppercase tracking-widest mb-1">Hôm nay</p>
                <p className="text-3xl font-extrabold text-white">{todayAuths.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">lượt xác thực</p>
              </div>
            </div>
          </section>

          {/* ── Live Feed ── */}
          <section className="bg-white/5 glass-panel text-white p-8 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-12 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10"></div>
            <h4 className="text-xl font-bold font-headline text-white mb-1 flex items-center justify-between">
              {t("sc_latest_ledger")}
              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-black tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> {t("sc_live")}
              </span>
            </h4>
            <p className="text-sm text-secondary mb-6">{t("sc_realtime_block")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              {logs.map((log) => {
                const logTitle = t((log as any).titleKey) + ((log as any).titleSuffix || "");
                const logTime = (log as any).timeSuffix + t((log as any).timeKey);
                const rawDesc = (log as any).desc || "";
                const logDesc = rawDesc.startsWith("sc_log_sync:") ? `${t("sc_log_sync")} ${rawDesc.split(":")[1]}` :
                  rawDesc.startsWith("sc_log_found_at:") ? (() => {
                    const parts = rawDesc.split("|");
                    const loc = parts[0].replace("sc_log_found_at:", "");
                    const sig = parts[1]?.replace("sc_log_sig_viol:", "");
                    return `${t("sc_log_found_at")} ${loc} | ${t("sc_log_sig_viol")} ${sig}`;
                  })() : rawDesc;
                return (
                  <div key={log.id} className="flex gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      log.type === "success" ? "bg-emerald-500/20 border border-emerald-500/30" :
                      log.type === "error" ? "bg-red-500/20 border border-red-500/30" :
                      "bg-white/10 border border-slate-500/30"
                    }`}>
                      <span className={`material-symbols-outlined text-sm ${
                        log.type === "success" ? "text-emerald-400" :
                        log.type === "error" ? "text-red-400" : "text-slate-300"
                      }`}>
                        {log.type === "success" ? "check_circle" : log.type === "error" ? "warning" : "link"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${log.type === "error" ? "text-red-400" : "text-white"}`}>{logTitle}</p>
                      <p className="text-xs text-slate-400 truncate">{logDesc}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                        log.type === "error" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-cyan-400"
                      }`}>{logTime}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => alert(t("sc_full_network"))}
              className="w-full mt-6 py-3 text-xs font-bold text-primary uppercase tracking-widest hover:bg-white/10 transition-colors rounded-lg border border-primary/20 bg-white/5 shadow-sm"
            >
              {t("sc_full_network")}
            </button>
          </section>
        </div>

        {/* Floating Action */}
        <div className="fixed bottom-8 right-8 z-50">
          <div className="flex items-center gap-3 bg-slate-900 text-white pl-4 pr-6 py-3 rounded-full shadow-2xl border border-slate-700">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">bolt</span>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-tighter text-emerald-400">{t("sc_ai_running")}</p>
              <p className="text-xs font-medium text-slate-300">{t("sc_scanning")} {(1.5 + Math.random()).toFixed(1)}k {t("sc_data_per_sec")}</p>
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        ` }} />
      </main>
    </div>
  );
}
