"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Log = {
  id: string;
  action: string;
  user: string;
  role: string;
  ip: string;
  time: string;
  status: string;
};

export default function HistoryPage() {
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const { t } = useLanguage();

  // Dịch thời gian theo ngôn ngữ hiện tại
  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60)    return t("time_just_now");
    if (diff < 3600)  return `${Math.floor(diff / 60)} ${t("time_min_ago")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t("time_hour_ago")}`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ${t("time_day_ago")}`;
    return date.toLocaleDateString("vi-VN");
  }

  // Map vai trò → key dịch
  const roleKeyMap: Record<string, string> = {
    admin:        "role_admin",
    manufacturer: "role_mfr",
    importer:     "role_imp",
    consumer:     "role_consumer",
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "";
    setUserRole(role);
    loadLogs(role);
    const interval = setInterval(() => loadLogs(role), 15000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async (role: string) => {
    try {
      const res = await fetch(`/api/logs?role=${role}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "all" ? logs : logs.filter(l => l.status === filter);

  return (
    <div className="flex transparent font-body">
      <main className="mx-auto max-w-7xl w-full flex-1 p-8 lg:p-12 min-h-[calc(100vh-80px)] overflow-x-hidden">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <div>
            <p className="font-label text-xs font-bold text-primary tracking-[0.2em] uppercase mb-2">
              {t("hist_monitor")}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">{t("hist_title")}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {userRole === "admin" ? t("hist_sub_admin") : t("hist_sub_user")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${filter === "all" ? "bg-primary text-white" : "bg-white/5 glass-panel text-slate-300 border border-white/20 hover:bg-white/10"}`}>
              {t("hist_all")}
            </button>
            <button onClick={() => setFilter("warning")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${filter === "warning" ? "bg-[#C8A557] text-white" : "bg-white/5 glass-panel text-slate-300 border border-white/20 hover:bg-white/10"}`}>
              {t("hist_warning")}
            </button>
            <button onClick={() => setFilter("error")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${filter === "error" ? "bg-red-500 text-white" : "bg-white/5 glass-panel text-slate-300 border border-white/20 hover:bg-white/10"}`}>
              {t("hist_error")}
            </button>
          </div>
        </header>

        <div className="bg-white/5 glass-panel text-white rounded-3xl p-4 sm:p-8 border border-white/10 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-slate-400">{t("hist_loading")}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-3 block">history</span>
              <p className="text-sm">{t("hist_empty")}</p>
            </div>
          ) : (
            /* Mobile: card list; Desktop: table */
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/10">
                      <th className="pb-4 w-[35%]">{t("hist_col_action")}</th>
                      <th className="pb-4 w-[20%]">{t("hist_col_user")}</th>
                      {userRole === "admin" && <th className="pb-4 w-[15%]">{t("hist_col_role")}</th>}
                      <th className="pb-4 w-[15%]">{t("hist_col_ip")}</th>
                      <th className="pb-4 w-[15%]">{t("hist_col_time")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map(log => (
                      <tr key={log.id} className="hover:bg-white/5 transition">
                        <td className="py-4 font-medium align-middle pr-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex justify-center items-center shrink-0 ${log.status === "success" ? "bg-emerald-500/10 text-emerald-400" : log.status === "warning" ? "bg-[#C8A557]/10 text-[#C8A557]" : "bg-red-500/10 text-red-400"}`}>
                              <span className="material-symbols-outlined text-sm">
                                {log.status === "success" ? "check_circle" : log.status === "warning" ? "warning" : "cancel"}
                              </span>
                            </span>
                            <span className="text-sm text-slate-200 leading-snug break-words">{log.action}</span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-white font-bold align-middle pr-4 break-all">{log.user}</td>
                        {userRole === "admin" && (
                          <td className="py-4 align-middle pr-4">
                            <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold whitespace-nowrap inline-block">
                              {t(roleKeyMap[log.role] || "role_unknown")}
                            </span>
                          </td>
                        )}
                        <td className="py-4 text-sm font-mono text-slate-400 align-middle whitespace-nowrap pr-4">{log.ip}</td>
                        <td className="py-4 text-xs font-semibold text-slate-400 align-middle whitespace-nowrap">{formatTime(log.time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden space-y-3">
                {filtered.map(log => (
                  <div key={log.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="flex items-start gap-3 mb-2">
                      <span className={`w-8 h-8 rounded-full flex justify-center items-center shrink-0 mt-0.5 ${log.status === "success" ? "bg-emerald-500/10 text-emerald-400" : log.status === "warning" ? "bg-[#C8A557]/10 text-[#C8A557]" : "bg-red-500/10 text-red-400"}`}>
                        <span className="material-symbols-outlined text-sm">
                          {log.status === "success" ? "check_circle" : log.status === "warning" ? "warning" : "cancel"}
                        </span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-medium leading-snug break-words">{log.action}</p>
                        <p className="text-xs text-white font-bold mt-1 break-all">{log.user}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{formatTime(log.time)}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-11">
                      {userRole === "admin" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                          {t(roleKeyMap[log.role] || "role_unknown")}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">{log.ip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
