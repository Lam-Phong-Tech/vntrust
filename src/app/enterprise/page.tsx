"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EnterprisePage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] w-full relative overflow-hidden flex flex-col p-6 md:p-12 xl:p-16 max-w-[1600px] mx-auto">
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(60,200,200,0.15) 0%, transparent 60%)', filter: 'blur(60px)' }}></div>
      <div className="relative z-10 w-full h-full flex flex-col gap-16 max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mt-4">
          <span className="px-4 py-1.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-full border border-cyan-500/30 uppercase tracking-[0.2em] mb-6 inline-block">{t("ent_badge")}</span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-headline text-white mb-8 tracking-tight drop-shadow-lg">
            {t("ent_title")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">VNTrust Enterprise</span>
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-4xl mx-auto leading-relaxed border-l-4 border-cyan-500 pl-6 text-left md:text-center md:border-l-0 md:pl-0">{t("ent_sub")}</p>
        </div>

        {/* Features */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-md">
          <h2 className="text-2xl md:text-3xl font-black font-headline text-white mb-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center"><span className="material-symbols-outlined text-cyan-400">verified</span></div>
            {t("ent_features_title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: "account_tree", color: "cyan", key: "ent_f1" },
              { icon: "qr_code_scanner", color: "emerald", key: "ent_f2" },
              { icon: "insights", color: "amber", key: "ent_f3" },
              { icon: "api", color: "violet", key: "ent_f4" },
            ].map(({ icon, color, key }) => (
              <div key={key} className="glass-card p-8 rounded-3xl group">
                <div className={`w-14 h-14 rounded-2xl bg-${color}-500/20 flex items-center justify-center text-${color}-400 mb-6 group-hover:scale-110 group-hover:bg-${color}-500 group-hover:text-white transition-all`}>
                  <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t(`${key}_title`)}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{t(`${key}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Process */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-black font-headline text-white mb-12 flex items-center justify-center gap-3">
            <span className="material-symbols-outlined text-cyan-400 text-4xl">sync</span>
            {t("ent_process_title")}
          </h2>
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute left-8 md:left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-cyan-500/50 via-blue-500/50 to-emerald-500/50 -translate-x-1/2 rounded-full"></div>
            <div className="flex flex-col gap-16 relative z-10">
              {[
                { icon: "qr_code", color: "cyan", step: "1", key: "ent_s1" },
                { icon: "local_shipping", color: "blue", step: "2", key: "ent_s2" },
                { icon: "verified_user", color: "emerald", step: "3", key: "ent_s3" },
              ].map(({ icon, color, step, key }, i) => (
                <div key={key} className="flex flex-row items-center gap-4 md:gap-8">
                  {/* Left side: text for even, spacer for odd */}
                  {i % 2 === 0 ? (
                    <div className="hidden md:flex flex-1 text-right flex-col justify-center">
                      <h4 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-l from-white to-slate-400">{step}. {t(`${key}_title`)}</h4>
                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{t(`${key}_desc`)}</p>
                    </div>
                  ) : (
                    <div className="hidden md:block flex-1"></div>
                  )}

                  {/* Icon always on center line */}
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center shrink-0 relative z-10 group hover:scale-110 transition border-[3px] ${
                    color === "cyan"
                      ? "bg-[#0a2238] border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]"
                      : color === "blue"
                      ? "bg-[#0a1f38] border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                      : "bg-[#082a1e] border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)]"
                  }`}>
                    <span className={`material-symbols-outlined text-3xl group-hover:animate-bounce ${
                      color === "cyan" ? "text-cyan-400" : color === "blue" ? "text-blue-400" : "text-emerald-400"
                    }`}>{icon}</span>
                  </div>

                  {/* Right side: spacer for even, text for odd */}
                  {i % 2 === 1 ? (
                    <div className="hidden md:flex flex-1 flex-col justify-center">
                      <h4 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{step}. {t(`${key}_title`)}</h4>
                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{t(`${key}_desc`)}</p>
                    </div>
                  ) : (
                    <div className="hidden md:block flex-1"></div>
                  )}

                  {/* Mobile: always full width card */}
                  <div className="md:hidden flex-1 bg-white/5 p-6 rounded-2xl glass-panel w-full">
                    <h4 className="text-lg font-black text-white">{step}. {t(`${key}_title`)}</h4>
                    <p className="text-sm text-slate-400 mt-2">{t(`${key}_desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
