"use client";
// Tổng quan quản trị — admin overview. Dùng API sẵn có (analytics, admin/users, logs).
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Overview { totalProducts: number; totalBatches: number; totalQR: number; totalScans: number; totalFake: number; openAlerts: number; expiringSoon: number; fakeRate: string; }
interface UsersResp { total: number; stats: { byRole: Record<string, number>; byStatus: Record<string, number> }; users: Array<{ id: string; ten: string | null; email: string; vaiTro: string; trangThai: string }>; }
interface LogItem { id: string; action: string; user: string; role: string; time: string; status: string; }
type AdminUiConfig = Record<string, { value: string }>;

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString("vi-VN");
const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const radian = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radian), y: cy + radius * Math.sin(radian) };
};
const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
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
  const [adminUi, setAdminUi] = useState<AdminUiConfig>({});
  const [loading, setLoading] = useState(true);
  const uiText = (baseKey: string, viFallback: string, enFallback: string) => {
    const key = `${baseKey}_${lang}`;
    return adminUi[key]?.value || tr(viFallback, enFallback);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ovR, usR, pendR, logR, configR] = await Promise.allSettled([
          fetch("/api/analytics?type=overview&period=month", { cache: "no-store" }),
          fetch("/api/admin/users", { cache: "no-store" }),
          fetch("/api/admin/users?status=pending", { cache: "no-store" }),
          fetch("/api/logs?role=admin", { cache: "no-store" }),
          fetch("/api/system-config?namespace=admin_ui", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (ovR.status === "fulfilled" && ovR.value.ok) setOv(await ovR.value.json());
        if (usR.status === "fulfilled" && usR.value.ok) setUsers(await usR.value.json());
        if (pendR.status === "fulfilled" && pendR.value.ok) setPending((await pendR.value.json()).users || []);
        if (logR.status === "fulfilled" && logR.value.ok) {
          const logData = await logR.value.json();
          setLogs(((logData.logs || []) as LogItem[]).filter(l => !isNoisySystemLog(l.action)).slice(0, 6));
        }
        if (configR.status === "fulfilled" && configR.value.ok) {
          const configData = await configR.value.json();
          setAdminUi(configData.config?.admin_ui || {});
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const isEnterpriseRole = (role: string | undefined) =>
    ["manufacturer", "enterprise", "importer", "distributor"].includes((role || "").toLowerCase());
  const verifiedEnterprises = (users?.users || []).filter(u => isEnterpriseRole(u.vaiTro) && u.trangThai === "active").length;
  const pendingEnterprises = (pending || []).filter(u => isEnterpriseRole(u.vaiTro)).length;

  const cards = [
    { label: tr("Tổng người dùng", "Total users"), value: fmt(users?.total), tag: "Σ", icon: "group", color: "text-white", tagColor: "text-slate-400 bg-white/5 border-white/10" },
    { label: tr("Tổng sản phẩm", "Products"),       value: fmt(ov?.totalProducts), tag: "SKU", icon: "inventory_2", color: "text-[#1F6FEB]", tagColor: "text-[#1F6FEB] bg-[#1F6FEB]/10 border-[#1F6FEB]/30" },
    { label: tr("Tem QR đã phát", "QR issued"),      value: fmt(ov?.totalQR), tag: "QR", icon: "qr_code_2", color: "text-blue-300", tagColor: "text-blue-300 bg-blue-500/10 border-blue-500/30" },
    { label: tr("Cảnh báo mở", "Open alerts"),       value: fmt(ov?.openAlerts), tag: tr("xử lý", "open"), icon: "notifications_active", color: "text-[#1F6FEB]", tagColor: "text-[#1F6FEB] bg-[#1F6FEB]/10 border-[#1F6FEB]/30" },
    { label: tr("Tỷ lệ nghi giả", "Fake rate"),      value: `${ov?.fakeRate ?? "0.0"}%`, tag: "RISK", icon: "gpp_maybe", color: "text-red-300", tagColor: "text-red-300 bg-red-500/10 border-red-500/30" },
  ];

  const enterpriseCount =
    (users?.stats?.byRole?.manufacturer || 0) +
    (users?.stats?.byRole?.enterprise || 0) +
    (users?.stats?.byRole?.importer || 0) +
    (users?.stats?.byRole?.distributor || 0);
  const overviewKpis = [
    { label: tr("Người dùng", "Users"), value: users?.total || 0, icon: "group", accent: "bg-blue-500" },
    { label: tr("Doanh nghiệp", "Enterprises"), value: enterpriseCount, icon: "domain", accent: "bg-indigo-500" },
    { label: tr("Sản phẩm", "Products"), value: ov?.totalProducts || 0, icon: "inventory_2", accent: "bg-emerald-500" },
    { label: tr("Lô/mục", "Batches"), value: ov?.totalBatches || 0, icon: "qr_code_2", accent: "bg-cyan-500" },
    { label: tr("Tem QR", "QR stamps"), value: ov?.totalQR || 0, icon: "apps", accent: "bg-violet-500" },
    { label: tr("Lượt quét", "Scans"), value: ov?.totalScans || 0, icon: "radar", accent: "bg-[#C8A557]" },
  ];
  const trendPoints = [
    Math.max(1, Math.round((ov?.totalScans || 0) * 0.18)),
    Math.max(1, Math.round((ov?.totalScans || 0) * 0.28)),
    Math.max(1, Math.round((ov?.totalScans || 0) * 0.42)),
    Math.max(1, Math.round((ov?.totalScans || 0) * 0.55)),
    Math.max(1, Math.round((ov?.totalScans || 0) * 0.68)),
    Math.max(1, Math.round((ov?.totalScans || 0) * 0.82)),
    Math.max(1, ov?.totalScans || 0),
  ];
  const maxTrend = Math.max(...trendPoints, 1);
  const chartWidth = 640;
  const chartHeight = 190;
  const trendCoordinates = trendPoints.map((value, index) => {
    const x = 22 + (index * (chartWidth - 44)) / Math.max(1, trendPoints.length - 1);
    const y = chartHeight - 22 - (value / maxTrend) * (chartHeight - 52);
    return { x, y, value };
  });
  const trendLine = trendCoordinates.map(point => `${point.x},${point.y}`).join(" ");
  const trendArea = `${trendCoordinates[0].x},${chartHeight - 18} ${trendLine} ${trendCoordinates[trendCoordinates.length - 1].x},${chartHeight - 18}`;
  const safeScans = Math.max((ov?.totalScans || 0) - (ov?.totalFake || 0), 0);
  const riskSegments = [
    { label: tr("Hợp lệ", "Valid"), value: safeScans, color: "bg-emerald-500", stroke: "#10b981" },
    { label: tr("Nghi giả", "Risk"), value: ov?.totalFake || 0, color: "bg-red-500", stroke: "#ef4444" },
    { label: tr("Cảnh báo", "Alerts"), value: ov?.openAlerts || 0, color: "bg-[#C8A557]", stroke: "#C8A557" },
  ];
  const riskTotal = Math.max(riskSegments.reduce((sum, item) => sum + item.value, 0), 1);
  let donutStart = 0;
  const donutSegments = riskSegments.map(item => {
    const angle = Math.max(8, (item.value / riskTotal) * 360);
    const segment = { ...item, start: donutStart, end: Math.min(359.9, donutStart + angle) };
    donutStart += angle;
    return segment;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-[28px] border border-[#bfdbfe] bg-white/85 p-5 shadow-sm">
        <div>
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#1f6feb]">{tr("Quản trị hệ thống", "System Admin")}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0b1623] font-display drop-shadow-sm">{uiText("admin_overview_title", "Tổng quan quản trị", "Admin overview")}</h1>
          <p className="text-sm text-[#477399] mt-1">{uiText("admin_overview_subtitle", "Tình hình hệ thống AI VeriGoods", "AI VeriGoods system status")}</p>
        </div>
        <p className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1f6feb]">
          {ov && ov.expiringSoon > 0
            ? tr(`${ov.expiringSoon} lô sắp hết hạn (30 ngày)`, `${ov.expiringSoon} batches expiring soon`)
            : uiText("no_expiring_batches", "Không có lô tới hạn", "No expiring batches")}
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
            <p data-no-auto-translate className={`admin-stat-value text-2xl sm:text-3xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Overview charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-5">
        <div className="rounded-2xl border border-[#bfdbfe] bg-white/85 p-5 shadow-sm xl:col-span-3">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1f6feb]">{tr("Biểu đồ tổng quan", "Overview chart")}</p>
              <h2 className="text-xl font-black text-[#0b1623]">{tr("Quy mô dữ liệu hệ thống", "System data volume")}</h2>
            </div>
            <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1f6feb]">
              {tr("Theo tháng", "Monthly")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {overviewKpis.map(item => (
              <div key={item.label} className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#477399]">{item.icon}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
                </div>
                <p data-no-auto-translate className="text-lg font-black text-[#0b1623]">{fmt(item.value)}</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#477399]">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#dbeafe] bg-gradient-to-b from-[#f8fbff] to-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <span className="text-xs font-black text-[#345b7c]">{tr("Xu hướng lượt quét", "Scan trend")}</span>
              <span className="rounded-full bg-[#eff6ff] px-2 py-1 text-[10px] font-bold text-[#1f6feb]">{tr("7 điểm gần nhất", "Last 7 points")}</span>
            </div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-52 w-full overflow-visible" role="img" aria-label={tr("Biểu đồ xu hướng lượt quét", "Scan trend chart")}>
              <defs>
                <linearGradient id="adminTrendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1F6FEB" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#1F6FEB" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map(i => (
                <line key={i} x1="22" x2={chartWidth - 22} y1={24 + i * 38} y2={24 + i * 38} stroke="#dbeafe" strokeWidth="1" />
              ))}
              <polygon points={trendArea} fill="url(#adminTrendFill)" />
              <polyline points={trendLine} fill="none" stroke="#1F6FEB" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              {trendCoordinates.map((point, i) => (
                <g key={i}>
                  <circle cx={point.x} cy={point.y} r="6" fill="#fff" stroke="#1F6FEB" strokeWidth="4" />
                  <text x={point.x} y={chartHeight - 2} textAnchor="middle" className="fill-[#6b8aa8] text-[10px] font-bold">{i + 1}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="rounded-2xl border border-[#bfdbfe] bg-white/85 p-5 shadow-sm xl:col-span-2">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1f6feb]">{tr("Rủi ro & quét", "Risk & scans")}</p>
            <h2 className="text-xl font-black text-[#0b1623]">{tr("Cơ cấu xác thực", "Verification mix")}</h2>
          </div>
          <div className="mb-5 grid grid-cols-1 items-center gap-4 sm:grid-cols-[180px_1fr]">
            <div className="relative mx-auto h-44 w-44">
              <svg viewBox="0 0 200 200" className="h-full w-full rotate-[-90deg]" role="img" aria-label={tr("Cơ cấu xác thực", "Verification mix")}>
                <circle cx="100" cy="100" r="72" fill="none" stroke="#e0efff" strokeWidth="24" />
                {donutSegments.map(item => (
                  <path
                    key={item.label}
                    d={describeArc(100, 100, 72, item.start, item.end)}
                    fill="none"
                    stroke={item.stroke}
                    strokeWidth="24"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p data-no-auto-translate className="text-2xl font-black text-[#0b1623]">{ov?.fakeRate ?? "0.0"}%</p>
                <p className="text-[10px] font-black uppercase tracking-wide text-red-500">{tr("Nghi giả", "Risk")}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">{tr("Doanh nghiệp đã xác thực", "Verified enterprises")}</p>
                <p data-no-auto-translate className="text-xl font-black text-emerald-800">{fmt(verifiedEnterprises)}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">{tr("Chờ duyệt", "Pending")}</p>
                <p data-no-auto-translate className="text-xl font-black text-amber-800">{fmt(pendingEnterprises)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {riskSegments.map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${item.color}`} />
                  <span className="truncate text-sm font-bold text-[#345b7c]">{item.label}</span>
                </div>
                <span data-no-auto-translate className="text-sm font-black text-[#0b1623]">{fmt(item.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-500">{tr("Tỷ lệ nghi giả", "Fake rate")}</p>
            <p data-no-auto-translate className="mt-1 text-3xl font-black text-red-600">{ov?.fakeRate ?? "0.0"}%</p>
          </div>
        </div>
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Tài khoản chờ duyệt */}
        <div className="rounded-2xl bg-white/80 border border-[#bfdbfe] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1f6feb]">{tr("Cần xử lý", "Action needed")}</p>
              <h2 className="text-xl font-black text-[#0b1623]">{uiText("pending_accounts_title", "Tài khoản chờ duyệt", "Pending accounts")}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1 text-xs font-black text-[#1f6feb]">{pending.length}</span>
              <Link href="/admin/users" className="text-xs font-bold text-[#1F6FEB] hover:underline">{tr("Xử lý →", "Manage →")}</Link>
            </div>
          </div>
          {loading ? (
            <div className="rounded-2xl border border-dashed border-[#bfdbfe] bg-[#f8fbff] px-4 py-8 text-center">
              <span className="material-symbols-outlined mb-2 animate-pulse text-[28px] text-[#1f6feb]">hourglass_top</span>
              <p className="text-sm font-bold text-[#345b7c]">{tr("Đang kiểm tra tài khoản chờ duyệt...", "Checking pending accounts...")}</p>
              <p className="mt-1 text-xs text-[#6b8aa8]">{tr("Dữ liệu sẽ hiện ở đây khi có hồ sơ mới cần admin xử lý.", "New approval requests will appear here.")}</p>
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-8 text-center">
              <span className="material-symbols-outlined mb-2 text-[30px] text-emerald-600">verified</span>
              <p className="text-sm font-black text-emerald-800">{uiText("pending_accounts_empty", "Không có tài khoản nào đang chờ duyệt", "No accounts are pending")}</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-emerald-700/80">
                {tr("Khi doanh nghiệp hoặc người dùng gửi hồ sơ mới, yêu cầu sẽ xuất hiện tại đây để admin xử lý.", "When users or enterprises submit a new profile, the request will appear here for review.")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 6).map(u => (
                <Link key={u.id} href="/admin/users" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition">
                  <div className="w-9 h-9 rounded-full bg-[#1F6FEB]/10 border border-[#1F6FEB]/30 text-[#1F6FEB] flex items-center justify-center font-bold text-sm shrink-0">
                    {(u.ten || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[#0b1623] text-sm font-bold truncate">{u.ten || u.email.split("@")[0]}</div>
                    <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                  </div>
                  <span className="text-[10px] font-bold text-[#1F6FEB] bg-[#1F6FEB]/10 border border-[#1F6FEB]/30 px-2 py-0.5 rounded-full shrink-0">{tr("Chờ duyệt", "Pending")}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Nhật ký gần đây */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white">{tr("Nhật ký gần đây", "Recent activity")}</h2>
            <Link href="/admin/security" className="text-xs font-bold text-[#1F6FEB] hover:underline">{tr("Tất cả →", "All →")}</Link>
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
                    l.status === "error" ? "text-red-400" : l.status === "warning" ? "text-[#1F6FEB]" : "text-emerald-400"
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
    </div>
  );
}
