"use client";
// Khu Quản trị (Admin Console) — layout riêng: sidebar + topbar đầy đủ.
// Bọc mọi trang /admin/*. Tái dùng API & các trang chức năng sẵn có.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import NotificationBell from "@/components/NotificationBell";

type NavItem = { href: string; label: string; en: string; icon: string };
type NavGroup = { title: string; en: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Tổng quan", en: "Overview",
    items: [
      { href: "/admin", label: "Tổng quan", en: "Dashboard", icon: "dashboard" },
    ],
  },
  {
    title: "Người dùng & Doanh nghiệp", en: "Users & Enterprises",
    items: [
      { href: "/admin/users",      label: "Người dùng",     en: "Users",       icon: "group" },
      { href: "/admin/kyc",        label: "Doanh nghiệp",   en: "Enterprises", icon: "domain" },
      { href: "/admin/phan-quyen", label: "Phân quyền",     en: "Permissions", icon: "key" },
    ],
  },
  {
    title: "Vận hành", en: "Operations",
    items: [
      { href: "/admin/duyet-sp",      label: "Duyệt SP & Lô", en: "Approvals",    icon: "fact_check" },
      { href: "/admin/alerts",        label: "Cảnh báo",     en: "Alerts",        icon: "notifications_active" },
      { href: "/admin/investigation", label: "Điều tra",     en: "Investigation", icon: "policy" },
      { href: "/admin/distribution",  label: "Phân phối",    en: "Distribution",  icon: "local_shipping" },
    ],
  },
  {
    title: "Phân tích & Thưởng", en: "Analytics & Rewards",
    items: [
      { href: "/admin/analytics", label: "Báo cáo",      en: "Reports", icon: "monitoring" },
      { href: "/admin/rewards",   label: "Điểm thưởng",  en: "Rewards", icon: "stars" },
    ],
  },
  {
    title: "Hệ thống", en: "System",
    items: [
      { href: "/admin/security",      label: "Bảo mật",   en: "Security",  icon: "security" },
      { href: "/admin/system-config", label: "Cấu hình",  en: "Config",    icon: "settings" },
      { href: "/admin/integration",   label: "Tích hợp",  en: "Integration", icon: "hub" },
    ],
  },
];

function clearSession() {
  ["userRole", "userName", "doanhNghiepId", "vntrust_chat_web"].forEach(k => { try { localStorage.removeItem(k); } catch {} });
  try { Object.keys(localStorage).filter(k => k.startsWith("vntrust_chat_")).forEach(k => localStorage.removeItem(k)); } catch {}
  ["userRole", "userName", "doanhNghiepId"].forEach(n => { document.cookie = `${n}=; Max-Age=0; path=/`; });
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [open, setOpen] = useState(false); // mobile sidebar

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (role !== "admin") { router.replace("/dashboard?error=forbidden"); return; }
    setUserName(localStorage.getItem("userName") || "Admin");
    setReady(true);
  }, [router]);

  // Đóng drawer khi đổi route (mobile)
  useEffect(() => { setOpen(false); }, [pathname]);

  const logout = () => { clearSession(); window.location.href = "/login"; };

  if (!ready) return null;

  const initials = (userName || "A").trim().split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();

  const SidebarInner = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/admin" className="flex items-center gap-2.5 px-5 h-[68px] shrink-0" style={{ background: '#1F6FEB' }}>
        <span style={{ background: '#ffffff', borderRadius: 9, padding: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.16)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="AI VeriGoods" width={30} height={30} style={{ objectFit: 'contain', display: 'block' }} />
        </span>
        <div className="leading-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/verigoods-wordmark.png" alt="VeriGoods" style={{ height: 14, width: 'auto', display: 'block' }} />
          <div className="text-[9px] text-white/85 uppercase tracking-widest mt-0.5">Admin Console</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 hide-scrollbar">
        {NAV.map(group => (
          <div key={group.title} className="mb-5">
            <p className="px-3 mb-2 text-[10px] font-bold text-white/75 uppercase tracking-widest">{tr(group.title, group.en)}</p>
            <div className="flex flex-col gap-1">
              {group.items.map(item => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`admin-sidebar-link group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                      active
                        ? "bg-[#0B4FC7] text-white border border-white/25 shadow-sm"
                        : "text-white/90 hover:bg-[#155EDB] hover:text-white border border-transparent"
                    }`}
                  >
                    {active && <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-white" />}
                    <span className={`material-symbols-outlined text-[20px] transition ${
                      active ? "text-white" : "text-white/90 group-hover:text-white"
                    }`} style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24" : "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>{item.icon}</span>
                    <span className="min-w-0 truncate">{tr(item.label, item.en)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="shrink-0 p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-2xl bg-white/95 border border-white/40 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8A557] to-[#A6873E] text-[#0B1623] flex items-center justify-center font-black shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[#0B1623] font-bold text-sm truncate">{userName}</div>
            <div className="text-[10px] text-[#C8A557] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">shield_person</span>
              {tr("Quản trị hệ thống", "System admin")}
            </div>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/90 border border-white/40 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition text-sm font-bold">
          <span className="material-symbols-outlined text-[18px]">logout</span>
          {tr("Đăng xuất", "Sign out")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex bg-[#eef5fb]">
      {/* ── Sidebar desktop ── */}
      <aside className="admin-sidebar hidden lg:flex w-64 shrink-0 flex-col sticky top-0 h-screen shadow-[2px_0_10px_rgba(0,0,0,0.05)]" style={{ background: '#1F6FEB' }}>
        {SidebarInner}
      </aside>

      {/* ── Sidebar mobile (drawer) ── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="admin-sidebar relative w-64 max-w-[80vw] border-r border-white/20 h-full animate-in slide-in-from-left duration-200" style={{ background: '#1F6FEB' }}>
            {SidebarInner}
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 h-[68px] shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-black/10" style={{ background: '#1F6FEB' }}>
          <button onClick={() => setOpen(true)} className="lg:hidden w-10 h-10 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center text-white">
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="flex-1" />

          {/* Language toggle */}
          <div className="flex items-center rounded-full bg-white/15 border border-white/30 p-0.5">
            {(["vi", "en"] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  lang === l ? "bg-white text-[#1F6FEB]" : "text-white/80 hover:text-white"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <NotificationBell />

          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8A557] to-[#A6873E] text-[#0B1623] flex items-center justify-center font-black shrink-0">
            {initials}
          </div>
        </header>

        {/* Content */}
        <main className="admin-content flex-1 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
