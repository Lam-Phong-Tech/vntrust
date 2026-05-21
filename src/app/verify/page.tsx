"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyPage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] pb-12 flex items-center justify-center px-4 md:px-12 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-tertiary/5 blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
      </div>
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
        <header className="md:col-span-12 text-center mb-8">
          <span className="inline-block px-4 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-4">{t("verify_badge")}</span>
          <h1 className="text-4xl md:text-6xl font-black font-headline text-on-surface tracking-tighter mb-4">{t("verify_title")}</h1>
          <p className="text-on-surface-variant max-w-2xl mx-auto font-medium">{t("verify_sub")}</p>
        </header>
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/verify/scan" className="group flex flex-col h-full bg-surface-container-lowest/50 backdrop-blur-xl border border-outline-variant/20 hover:border-primary/50 hover:bg-surface-container-lowest transition-all hover:-translate-y-2 rounded-3xl p-8 overflow-hidden relative shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
            </div>
            <h3 className="text-2xl font-black font-headline mb-3 text-on-surface">{t("verify_card1_title")}</h3>
            <p className="text-on-surface-variant text-sm mb-8 flex-1">{t("verify_card1_desc")}</p>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mt-auto">
              <span>{t("verify_card1_cta")}</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
          <Link href="/verify/manual" className="group flex flex-col h-full bg-surface-container-lowest/50 backdrop-blur-xl border border-outline-variant/20 hover:border-tertiary/50 hover:bg-surface-container-lowest transition-all hover:-translate-y-2 rounded-3xl p-8 overflow-hidden relative shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-tertiary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-16 h-16 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary mb-6 transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-3xl">pin</span>
            </div>
            <h3 className="text-2xl font-black font-headline mb-3 text-on-surface">{t("verify_card2_title")}</h3>
            <p className="text-on-surface-variant text-sm mb-8 flex-1">{t("verify_card2_desc")}</p>
            <div className="flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-widest mt-auto">
              <span>{t("verify_card2_cta")}</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
          <Link href="/verify/ai-doc" className="group flex flex-col h-full bg-surface-container-lowest/50 backdrop-blur-xl border border-outline-variant/20 hover:border-cyan-500/50 hover:bg-surface-container-lowest transition-all hover:-translate-y-2 rounded-3xl p-8 overflow-hidden relative shadow-lg">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-cyan-500/20 text-cyan-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">auto_awesome</span>{t("verify_new")}
              </span>
            </div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 mb-6 transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-3xl">document_scanner</span>
            </div>
            <h3 className="text-2xl font-black font-headline mb-3 text-on-surface">{t("verify_card3_title")}</h3>
            <p className="text-on-surface-variant text-sm mb-8 flex-1">{t("verify_card3_desc")}</p>
            <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-widest mt-auto">
              <span>{t("verify_card3_cta")}</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
        </div>
        <div className="md:col-span-12 flex flex-wrap justify-center gap-x-10 gap-y-4 mt-8 opacity-60">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">verified</span><span className="font-headline text-xs font-bold uppercase tracking-widest">ISO 27001 Certified</span></div>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">hub</span><span className="font-headline text-xs font-bold uppercase tracking-widest">Ethereum Mainnet</span></div>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">api</span><span className="font-headline text-xs font-bold uppercase tracking-widest">AI Vision Processing</span></div>
        </div>
      </div>
    </div>
  );
}
