"use client";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="w-full border-t border-slate-200/30 dark:border-slate-800/30 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col md:flex-row justify-between items-center px-12 py-8 gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-display font-bold text-slate-900 dark:text-white text-lg">VNTRUST</span>
          <p className="font-body text-xs uppercase tracking-widest text-slate-500">© 2026 VNTrust. {t("footer_sub")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <a className="font-body text-xs uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-opacity" href="#">{t("footer_link1")}</a>
          <a className="font-body text-xs uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-opacity" href="#">{t("footer_link2")}</a>
          <a className="font-body text-xs uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-opacity" href="#">{t("footer_link3")}</a>
          <a className="font-body text-xs uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-opacity" href="#">{t("footer_link4")}</a>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:opacity-75">
            <span className="material-symbols-outlined text-sm">language</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:opacity-75">
            <span className="material-symbols-outlined text-sm">share</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
