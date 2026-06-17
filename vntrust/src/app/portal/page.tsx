"use client";
// UC31 — Unified Super Portal Landing Page
// Hợp nhất 4 module thành 1 entry point duy nhất theo §V (file 5)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface PortalStats {
  totalScans: number;
  totalProducts: number;
  totalBatches: number;
  fakeAttempts: number;
  openAlerts: number;
  integrityScore: string;
}

export default function PortalLandingPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [stats, setStats] = useState<PortalStats | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);

    // Live clock
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        + ' · ' + d.toLocaleDateString('vi-VN'));
    };
    tick();
    const interval = setInterval(tick, 60000);

    // Public stats
    fetch("/api/dashboard/stats", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  // 4 module buttons — route theo role
  const modules = [
    {
      id: 1,
      title: tr("Doanh nghiệp", "Enterprise"),
      subtitle: tr("Hồ sơ + Sản phẩm + QR + Chứng nhận", "Profile + Products + QR + Certificates"),
      icon: "domain",
      color: "from-blue-500/30 to-blue-700/10",
      borderColor: "border-blue-500/40",
      iconColor: "text-blue-300",
      action: () => {
        if (userRole === 'manufacturer' || userRole === 'importer' || userRole === 'admin') {
          router.push("/dashboard/inventory");
        } else {
          router.push("/login/manufacturer");
        }
      },
      requiresLogin: true,
    },
    {
      id: 2,
      title: tr("Người tiêu dùng", "Consumer"),
      subtitle: tr("Quét QR + Báo cáo nghi vấn + Ẩn danh", "Scan QR + Report + Anonymous"),
      icon: "qr_code_scanner",
      color: "from-emerald-500/30 to-emerald-700/10",
      borderColor: "border-emerald-500/40",
      iconColor: "text-emerald-300",
      action: () => router.push("/verify"),
      requiresLogin: false,
    },
    {
      id: 3,
      title: tr("AI Kiểm tra & Đánh giá", "AI Inspection"),
      subtitle: tr("Vision AI + Risk Scoring + Fraud Detection", "Vision AI + Risk + Fraud"),
      icon: "smart_toy",
      color: "from-[#C8A557]/30 to-[#C8A557]/10",
      borderColor: "border-[#C8A557]/40",
      iconColor: "text-[#C8A557]",
      action: () => {
        if (userRole === 'admin') router.push("/dashboard/alerts");
        else router.push("/verify/scan");
      },
      requiresLogin: false,
    },
    {
      id: 4,
      title: tr("Phân tích & Tra cứu", "Analytics & Search"),
      subtitle: tr("Dashboard + Heatmap GPS + Báo cáo điều hành", "Dashboard + Heatmap + Reports"),
      icon: "analytics",
      color: "from-purple-500/30 to-purple-700/10",
      borderColor: "border-purple-500/40",
      iconColor: "text-purple-300",
      action: () => {
        if (userRole) router.push("/dashboard");
        else router.push("/login/consumer");
      },
      requiresLogin: true,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0B1623] text-[#F6F1E8] flex flex-col"
         style={{
           backgroundImage:
             'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,165,87,0.15) 0%, transparent 60%),' +
             'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(200,165,87,0.08) 0%, transparent 60%)',
         }}>

      {/* ─── Top header: logo + search + user + time ─── */}
      <header className="sticky top-0 z-40 bg-[#0B1623]/85 backdrop-blur-md border-b border-[#C8A557]/20 px-4 sm:px-8 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link href="/portal" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.png"
            alt="AI VeriGoods Logo"
            width={140}
            height={45}
            style={{ objectFit: "contain" }}
            priority
          />
        </Link>

        {/* Global search — hide on mobile */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchVal.trim()) {
                router.push(`/verify/${encodeURIComponent(searchVal.trim())}`);
              }
            }}
            placeholder={tr("Tra cứu: QR / DN / Mã SP / Vụ việc…", "Search: QR / DN / SKU / Case…")}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#C8A557]/50"
          />
        </div>

        <div className="flex-1 md:hidden" />

        {/* Right: lang + time + user */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            className="text-xs font-bold text-slate-300 hover:text-white px-2 py-1 rounded-md hover:bg-white/5">
            {lang === 'vi' ? 'VI' : 'EN'}
          </button>
          <div className="hidden sm:block text-xs text-slate-400 font-mono">{time}</div>
          {userRole ? (
            <Link href="/dashboard" className="px-3 py-1.5 rounded-full bg-[#C8A557]/15 border border-[#C8A557]/30 text-[#C8A557] text-xs font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">account_circle</span>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          ) : (
            <Link href="/login" className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] text-xs font-bold">
              {tr("Đăng nhập", "Login")}
            </Link>
          )}
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main className="flex-1 flex flex-col px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto w-full">

        {/* Hero title */}
        <section className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold text-[#C8A557] uppercase tracking-widest mb-2">
            {tr("Nền tảng quốc gia chống hàng giả", "National Anti-Counterfeit Platform")}
          </p>
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="AI VeriGoods Logo" width={280} height={90} style={{objectFit: 'contain'}} priority />
          </div>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {tr(
              "Unified Anti-Counterfeit Intelligence Platform — Xác thực doanh nghiệp, truy xuất nguồn gốc, giám sát thị trường, chống hàng giả bằng AI",
              "Unified Anti-Counterfeit Intelligence Platform — Enterprise verification, traceability, AI fraud detection"
            )}
          </p>
        </section>

        {/* 4 module buttons (HERO) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-8 sm:mb-12">
          {modules.map(mod => (
            <button
              key={mod.id}
              onClick={mod.action}
              className={`group relative rounded-3xl border-2 ${mod.borderColor} bg-gradient-to-br ${mod.color} p-5 sm:p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] overflow-hidden`}
            >
              {/* Big number badge */}
              <div className="absolute top-4 right-4 text-5xl sm:text-7xl font-black opacity-10 group-hover:opacity-20 transition">
                {mod.id}
              </div>

              {/* Icon */}
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-4 ${mod.iconColor}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 36 }}>{mod.icon}</span>
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-[#C8A557] transition">
                {mod.title}
              </h3>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                {mod.subtitle}
              </p>

              {/* Arrow */}
              <div className="flex items-center gap-2 text-xs font-bold text-[#C8A557] uppercase tracking-wider">
                {tr("Vào module", "Enter")} →
                {mod.requiresLogin && !userRole && (
                  <span className="text-[10px] text-amber-300/80 normal-case font-medium ml-2">
                    🔒 {tr("Cần đăng nhập", "Login required")}
                  </span>
                )}
              </div>
            </button>
          ))}
        </section>

        {/* ─── KPI Stats strip ─── */}
        {stats && (
          <section className="mb-8 sm:mb-12">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
              {tr("Thống kê hệ thống", "System statistics")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard label={tr("Lượt quét", "Scans")} value={stats.totalScans.toLocaleString('vi-VN')} icon="qr_code_scanner" color="text-blue-300" />
              <KpiCard label={tr("Sản phẩm", "Products")} value={stats.totalProducts} icon="inventory_2" color="text-purple-300" />
              <KpiCard label={tr("Lô hàng", "Batches")} value={stats.totalBatches} icon="local_shipping" color="text-cyan-300" />
              <KpiCard label={tr("Chính hãng", "Genuine")} value={`${stats.integrityScore}%`} icon="verified" color="text-emerald-300" />
              <KpiCard label={tr("Nghi giả", "Fake attempts")} value={stats.fakeAttempts} icon="gpp_bad" color="text-red-300" />
              <KpiCard label={tr("Cảnh báo mở", "Open alerts")} value={stats.openAlerts} icon="warning" color="text-amber-300" />
            </div>
          </section>
        )}

        {/* ─── Realtime notification banner ─── */}
        <section className="mb-8 sm:mb-12">
          <div className="rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-emerald-500/10 border border-white/10 p-4 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-white font-bold">
                {tr("Hệ thống đang hoạt động bình thường", "System operational")}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                {tr(
                  `Cập nhật cuối: ${time} · ${stats?.openAlerts || 0} cảnh báo mở · ${stats?.fakeAttempts || 0} nghi vấn 24h gần đây`,
                  `Last update: ${time} · ${stats?.openAlerts || 0} open alerts · ${stats?.fakeAttempts || 0} suspect 24h`
                )}
              </p>
            </div>
            <Link href="/dashboard/alerts" className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold text-[#C8A557] transition">
              {tr("Xem chi tiết", "Details")} →
            </Link>
          </div>
        </section>

        {/* ─── Footer info ─── */}
        <footer className="mt-auto pt-6 border-t border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-[#C8A557] font-bold mb-2">{tr("Về VNTrust", "About")}</p>
              <ul className="space-y-1 text-slate-400">
                <li><Link href="/supply-chain" className="hover:text-white">{tr("Chuỗi cung ứng", "Supply chain")}</Link></li>
                <li><Link href="/dashboard/glossary" className="hover:text-white">{tr("Thuật ngữ", "Glossary")}</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[#C8A557] font-bold mb-2">{tr("Đăng ký", "Register")}</p>
              <ul className="space-y-1 text-slate-400">
                <li><Link href="/login/manufacturer" className="hover:text-white">{tr("Doanh nghiệp", "Enterprise")}</Link></li>
                <li><Link href="/login/consumer" className="hover:text-white">{tr("Người tiêu dùng", "Consumer")}</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[#C8A557] font-bold mb-2">{tr("API & Tích hợp", "API & Integration")}</p>
              <ul className="space-y-1 text-slate-400">
                <li><a className="hover:text-white">API Documentation</a></li>
                <li><Link href="/dashboard/webhook" className="hover:text-white">Webhook ERP</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[#C8A557] font-bold mb-2">{tr("Hỗ trợ", "Support")}</p>
              <ul className="space-y-1 text-slate-400">
                <li>{tr("Hotline:", "Hotline:")} 1900-VNTRUST</li>
                <li>Email: support@vntrust.vn</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-slate-500">
            <p>© 2026 VNTrust — National Anti-Counterfeit Platform · Tuân thủ Luật BVDLCN 2025</p>
            <div className="flex gap-3">
              <span>ISO 27001</span>
              <span>·</span>
              <span>OAuth2 + PKI</span>
              <span>·</span>
              <span>AES-256</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: any; icon: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center hover:bg-white/8 transition">
      <span className={`material-symbols-outlined text-2xl mb-1 ${color}`}>{icon}</span>
      <p className="text-lg sm:text-xl font-black text-white">{value}</p>
      <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">{label}</p>
    </div>
  );
}
