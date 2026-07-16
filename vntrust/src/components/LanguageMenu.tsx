"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const LANG_OPTIONS = [
  { code: "vi", label: "Tiếng Việt", short: "VI", flag: "🇻🇳" },
  { code: "en", label: "English", short: "EN", flag: "🇺🇸" },
  { code: "zh", label: "中文", short: "ZH", flag: "🇨🇳" },
  { code: "ja", label: "日本語", short: "JA", flag: "🇯🇵" },
  { code: "ko", label: "한국어", short: "KO", flag: "🇰🇷" },
  { code: "fr", label: "Français", short: "FR", flag: "🇫🇷" },
];

export default function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANG_OPTIONS.find(item => item.code === lang) || LANG_OPTIONS[0];

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        id={compact ? "mobile-lang-menu-btn" : "lang-menu-btn"}
        onClick={() => setOpen(value => !value)}
        className={`flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 text-slate-100 hover:bg-white/20 hover:text-white transition active:scale-95 ${
          compact ? "h-[34px] min-w-[58px] px-2 text-[11px] font-black" : "h-9 min-w-[76px] px-3 text-xs font-black"
        }`}
        title="Chọn ngôn ngữ"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={compact ? "text-[15px]" : "text-[16px]"}>{current.flag}</span>
        <span>{current.short}</span>
        <span className="material-symbols-outlined text-[16px] leading-none">expand_more</span>
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-white/12 bg-[#0d1b2e]/98 shadow-2xl backdrop-blur-xl z-[9999] ${
            compact ? "top-full" : ""
          }`}
          role="listbox"
        >
          {LANG_OPTIONS.map(item => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setLang(item.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm transition ${
                item.code === current.code
                  ? "bg-[#2f7df4]/25 text-white"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
              }`}
              role="option"
              aria-selected={item.code === current.code}
            >
              <span className="text-lg">{item.flag}</span>
              <span className="flex-1 font-semibold">{item.label}</span>
              <span className="text-[10px] font-black text-slate-500">{item.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
