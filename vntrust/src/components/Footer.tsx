"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { lang, t } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const linkGroups = [
    {
      title: tr("Xác thực", "Verify"),
      links: [
        { label: tr("Quét mã", "Scan code"), href: "/verify/scan" },
        { label: tr("Tra cứu thủ công", "Manual lookup"), href: "/verify/manual" },
        { label: tr("Xác thực AI", "AI verification"), href: "/verify/ai-doc" },
        { label: tr("Lịch sử", "History"), href: "/verify/history" },
      ],
    },
    {
      title: tr("Dịch vụ", "Services"),
      links: [
        { label: tr("Bảng điều khiển", "Dashboard"), href: "/dashboard" },
        { label: tr("Quản lý sản phẩm", "Inventory"), href: "/dashboard/inventory" },
        { label: tr("Chuỗi cung ứng", "Supply chain"), href: "/supply-chain" },
        { label: tr("Báo cáo phản ánh", "Report issue"), href: "/dashboard/report" },
      ],
    },
    {
      title: tr("Pháp lý", "Legal"),
      links: [
        { label: t("footer_link1"), href: "/dashboard/security" },
        { label: t("footer_link3"), href: "/verify" },
        { label: t("footer_link4"), href: "/portal" },
      ],
    },
  ];

  return (
    <footer className="w-full border-t border-[#1F6FEB]/12 bg-white text-[#0b1623] dark:border-white/10 dark:bg-[#08111d] dark:text-white">
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.25fr_2fr] lg:gap-16">
          <div className="max-w-md">
            <div className="font-display text-3xl font-black tracking-wide text-[#0B1623] dark:text-white">
              AI VeriGoods
            </div>
            <div className="mt-2 text-xs font-black uppercase tracking-[0.28em] text-[#1F6FEB] dark:text-[#8db7ff]">
              Anti-Counterfeit Platform
            </div>
            <p className="mt-6 text-sm font-semibold leading-7 text-[#53677d] dark:text-slate-300">
              {t("footer_tagline")}
            </p>
            <p className="mt-4 text-sm leading-7 text-[#7a8794] dark:text-slate-400">
              {t("footer_sub")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:gap-12">
            {linkGroups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="text-xs font-black uppercase tracking-[0.24em] text-[#1F6FEB] dark:text-[#8db7ff]">
                  {group.title}
                </h2>
                <ul className="mt-5 space-y-4">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link
                        className="text-sm font-semibold text-[#40566f] transition hover:text-[#1F6FEB] dark:text-slate-300 dark:hover:text-white"
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[#1F6FEB]/12 pt-6 text-sm font-semibold text-[#7a8794] dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 AI VeriGoods. {tr("Bảo lưu mọi quyền.", "All rights reserved.")}</span>
          <span>{tr("Tem, mã QR và trạng thái sản phẩm được xác minh bởi hệ thống.", "Product codes and status are verified by the system.")}</span>
        </div>
      </div>
    </footer>
  );
}
