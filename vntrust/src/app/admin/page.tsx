"use client";
// Tổng quan quản trị — admin overview. Dùng API sẵn có (analytics, admin/users, logs).
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Overview { totalProducts: number; totalBatches: number; totalQR: number; totalScans: number; totalFake: number; openAlerts: number; expiringSoon: number; fakeRate: string; }
interface UsersResp { total: number; stats: { byRole: Record<string, number>; byStatus: Record<string, number> }; users: Array<{ id: string; ten: string | null; email: string; vaiTro: string; trangThai: string }>; }
interface LogItem { id: string; action: string; user: string; role: string; time: string; status: string; }

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString("vi-VN");
const ROLE_LABELS: Record<string, { vi: string; en: string }> = {
  admin: { vi: "Quản trị", en: "Admin" },
  consumer: { vi: "Người tiêu dùng", en: "Consumer" },
  manufacturer: { vi: "Doanh nghiệp", en: "Enterprise" },
  authority: { vi: "Cơ quan chức năng", en: "Authority" },
};

const isNoisySystemLog = (action: string) =>
  /^\[Integration Health Check\]/i.test(action) ||
  /^Integration Health Check\b/i.test(action);

const formatLogAction = (action: string) => {
  const bracketMatch = action.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracketMatch) {
    return {
      title: bracketMatch[1].replace(/[_-]+/g, " ").trim(),
      detail: bracketMatch[2].trim(),
    };
  }

  const colonMatch = action.match(/^([^:]{1,56}):\s+(.+)$/);
  if (colonMatch) {
    return {
      title: colonMatch[1].trim(),
      detail: colonMatch[2].trim(),
    };
  }

  return { title: action, detail: "" };
};

export default function AdminOverview() {
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [ov, setOv] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UsersResp | null>(null);
  const [pending, setPending] = useState<UsersResp["users"]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ovR, usR, pendR, logR] = await Promise.allSettled([
          fetch("/api/analytics?type=overview&period=month", { cache: "no-store" }),
          fetch("/api/admin/users", { cache: "no-store" }),
          fetch("/api/admin/users?status=pending", { cache: "no-store" }),
          fetch("/api/logs?role=admin", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (ovR.status === "fulfilled" && ovR.value.ok) setOv(await ovR.value.json());
        if (usR.status === "fulfilled" && usR.value.ok) setUsers(await usR.value.json());
        if (pendR.status === "fulfilled" && pendR.value.ok) setPending((await pendR.value.json()).users || []);
        if (logR.status === "fulfilled" && logR.value.ok) {
          const logData = await logR.value.json();
          setLogs(((logData.logs || []) as LogItem[]).filter(l => !isNoisySystemLog(l.action)).slice(0, 6));
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const cards = [
    { label: tr("Tổng người dùng", "Total users"), value: fmt(users?.total), tag: "Σ", icon: "group", color: "text-white", tagColor: "text-slate-400 bg-white/5 border-white/10" },
    { label: tr("Tổng sản phẩm", "Products"),       value: fmt(ov?.totalProducts), tag: "SKU", icon: "inventory_2", color: "text-[#C8A557]", tagColor: "text-[#C8A557] bg-[#C8A557]/10 border-[#C8A557]/30" },
    { label: tr("Tem QR đã phát", "QR issued"),      value: fmt(ov?.totalQR), tag: "QR", icon: "qr_code_2", color: "text-blue-300", tagColor: "text-blue-300 bg-blue-500/10 border-blue-500/30" },
    { label: tr("Cảnh báo mở", "Open alerts"),       value: fmt(ov?.openAlerts), tag: tr("xử lý", "open"), icon: "notifications_active", color: "text-amber-300", tagColor: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
    { label: tr("Tỷ lệ nghi giả", "Fake rate"),      value: `${ov?.fakeRate ?? "0.0"}%`, tag: "RISK", icon: "gpp_maybe", color: "text-red-300", tagColor: "text-red-300 bg-red-500/10 border-red-500/30" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">{tr("Tổng quan quản trị", "Admin overview")}</h1>
          <p className="text-sm text-slate-400 mt-1">{tr("Tình hình hệ thống AI VeriGoods", "AI VeriGoods system status")}</p>
        </div>
        <p className="text-xs text-slate-500">
          {ov && ov.expiringSoon > 0
            ? tr(`${ov.expiringSoon} lô sắp hết hạn (30 ngày)`, `${ov.expiringSoon} batches expiring soon`)
            : tr("Không có lô tới hạn", "No expiring batches")}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {cards.map((c, i) => (
          <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 hover:bg-white/[0.06] transition">
            <div className="flex items-start justify-between mb-3">
              <span className="material-symbols-outlined text-[22px] text-slate-400">{c.icon}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${c.tagColor}`}>{c.tag}</span>
            </div>
            <p className={`text-2xl sm:text-3xl font-black ${c.color}`}>{loading ? "—" : c.value}</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Tài khoản chờ duyệt */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">{tr("Tài khoản chờ duyệt", "Pending accounts")}</h2>
            <Link href="/admin/users" className="text-xs font-bold text-[#C8A557] hover:underline">{tr("Xử lý →", "Manage →")}</Link>
          </div>
          {loading ? (
            <p className="text-center text-slate-500 py-10 text-sm">{tr("Đang tải…", "Loading…")}</p>
          ) : pending.length === 0 ? (
            <p className="text-center text-slate-500 py-10 text-sm">{tr("Không có yêu cầu nào", "No pending requests")}</p>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 6).map(u => (
                <Link key={u.id} href="/admin/users" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition">
                  <div className="w-9 h-9 rounded-full bg-[#C8A557]/15 border border-[#C8A557]/30 text-[#C8A557] flex items-center justify-center font-bold text-sm shrink-0">
                    {(u.ten || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm font-bold truncate">{u.ten || u.email.split("@")[0]}</div>
                    <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">{tr("Chờ duyệt", "Pending")}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Nhật ký gần đây */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">{tr("Nhật ký gần đây", "Recent activity")}</h2>
            <Link href="/admin/security" className="text-xs font-bold text-[#C8A557] hover:underline">{tr("Tất cả →", "All →")}</Link>
          </div>
          {loading ? (
            <p className="text-center text-slate-500 py-10 text-sm">{tr("Đang tải…", "Loading…")}</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-slate-500 py-10 text-sm">{tr("Chưa có nhật ký", "No activity yet")}</p>
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map(l => {
                const action = formatLogAction(l.action);
                return (
                <div key={l.id} className="flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-white/[0.03] transition">
                  <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${
                    l.status === "error" ? "text-red-400" : l.status === "warning" ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {l.status === "error" ? "error" : l.status === "warning" ? "warning" : "check_circle"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm font-semibold leading-snug break-words">{action.title}</div>
                    {action.detail && (
                      <div className="mt-1 text-[11px] text-slate-400 leading-relaxed break-all sm:break-words">
                        {action.detail}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-slate-500 break-words">{l.user || "System"} - {l.time}</div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick links theo vai trò */}
      {users?.stats?.byRole && (
        <div className="mt-6 rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <h2 className="text-lg font-black text-white mb-4">{tr("Người dùng theo vai trò", "Users by role")}</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(users.stats.byRole).map(([role, count]) => (
              <div key={role} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white font-black text-lg mr-2">{count}</span>
                <span className="text-xs text-slate-400">{tr(ROLE_LABELS[role]?.vi || role, ROLE_LABELS[role]?.en || role)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
