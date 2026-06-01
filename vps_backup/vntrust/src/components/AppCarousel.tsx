"use client";
import Link from 'next/link';

export default function AppCarousel() {
  const apps = [
    { name: "Bảng điều khiển", icon: "dashboard", url: "/dashboard", color: "bg-blue-600" },
    { name: "Quản lý Tài sản", icon: "inventory_2", url: "/dashboard/inventory", color: "bg-emerald-600" },
    { name: "Mã QR", icon: "qr_code_scanner", url: "/verify", color: "bg-violet-600" },
    { name: "Chuỗi cung ứng", icon: "insights", url: "/supply-chain", color: "bg-amber-500" },
    { name: "Hậu kiểm", icon: "biotech", url: "/dashboard/haukiem", color: "bg-rose-500" },
    { name: "Nhật ký", icon: "history", url: "/dashboard/history", color: "bg-slate-700" },
    { name: "Bảo mật", icon: "verified_user", url: "/dashboard/security", color: "bg-indigo-600" },
    { name: "Báo cáo Mobile", icon: "monitoring", url: "#", color: "bg-teal-500" },
    { name: "Cảnh báo SMS", icon: "sms", url: "#", color: "bg-orange-500" },
    { name: "Trạm Quét Mobile", icon: "smartphone", url: "#", color: "bg-pink-500" },
  ];

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-200/50 py-5 sticky top-[72px] md:top-[80px] z-30 shadow-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <style jsx>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        <div className="flex gap-6 overflow-x-auto snap-x hide-scrollbar">
          {apps.map((app, idx) => (
            <Link key={idx} href={app.url} className="snap-start shrink-0 flex flex-col items-center gap-3 w-20 md:w-24 group transition-all">
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] ${app.color} text-white flex items-center justify-center shadow-lg shadow-current/20 group-hover:scale-105 group-active:scale-95 transition-transform duration-200 ease-out`}>
                <span className="material-symbols-outlined text-3xl font-light">{app.icon}</span>
              </div>
              <span className="text-[11px] md:text-xs font-bold text-center text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors tracking-tight line-clamp-2 leading-tight px-1">
                {app.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
