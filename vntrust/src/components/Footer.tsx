"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full border-t border-[#1F6FEB]/15 bg-gradient-to-br from-[#eef7ff] via-white to-[#eef7ff] text-[#0b1623] dark:border-white/10 dark:from-[#08111d] dark:via-[#0b1623] dark:to-[#102033] dark:text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1F6FEB] text-white shadow-lg shadow-[#1F6FEB]/20">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </span>
              <span className="font-display text-xl font-black tracking-wide">AI VERIGOODS</span>
            </div>
            <p className="text-sm font-semibold leading-relaxed text-[#3b6386] dark:text-slate-300">
              © 2026 AI VeriGoods. {t("footer_sub")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Link className="rounded-full border border-[#1F6FEB]/15 bg-white/70 px-4 py-2 text-xs font-black text-[#24557e] transition hover:border-[#1F6FEB]/35 hover:text-[#1F6FEB] dark:bg-white/5 dark:text-slate-300" href="/dashboard/security">{t("footer_link1")}</Link>
            <Link className="rounded-full border border-[#1F6FEB]/15 bg-white/70 px-4 py-2 text-xs font-black text-[#24557e] transition hover:border-[#1F6FEB]/35 hover:text-[#1F6FEB] dark:bg-white/5 dark:text-slate-300" href="/supply-chain">{t("footer_link2")}</Link>
            <Link className="rounded-full border border-[#1F6FEB]/15 bg-white/70 px-4 py-2 text-xs font-black text-[#24557e] transition hover:border-[#1F6FEB]/35 hover:text-[#1F6FEB] dark:bg-white/5 dark:text-slate-300" href="/verify">{t("footer_link3")}</Link>
            <Link className="rounded-full border border-[#1F6FEB]/15 bg-white/70 px-4 py-2 text-xs font-black text-[#24557e] transition hover:border-[#1F6FEB]/35 hover:text-[#1F6FEB] dark:bg-white/5 dark:text-slate-300" href="/portal">{t("footer_link4")}</Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#1F6FEB]/10 pt-5 text-xs font-bold text-[#5b7d9b] dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#1F6FEB]/10 px-3 py-1 text-[#1F6FEB] dark:bg-white/10 dark:text-blue-200">ISO 27001</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">Zero-trust</span>
            <span className="rounded-full bg-[#C8A557]/15 px-3 py-1 text-[#8a6a18] dark:text-[#e6ca77]">AI Traceability</span>
          </div>
          <span>{t("footer_tagline")}</span>
        </div>
      </div>
    </footer>
  );
}
