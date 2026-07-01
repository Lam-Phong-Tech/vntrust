"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function Toast({
  msg,
  ok,
  onClose,
}: {
  msg: string;
  ok: boolean;
  onClose?: () => void;
}) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cleanMsg = msg.replace(/^[✅❌⚠️🔔✓✗×\s]+/u, "").trim();

  const node = (
    <div
      className={[
        "fixed left-1/2 top-[calc(env(safe-area-inset-top)+14px)] z-[2147483647] -translate-x-1/2 sm:left-auto sm:right-6 sm:top-6 sm:translate-x-0",
        "flex items-start gap-3",
        "w-[min(340px,calc(100vw-24px))] overflow-hidden",
        "rounded-2xl border bg-white/95 px-4 py-3.5 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur-xl",
        "transition-all duration-300",
        ok ? "border-emerald-200 ring-1 ring-emerald-100" : "border-red-200 ring-1 ring-red-100",
      ].join(" ")}
      role="alert"
    >
      <span
        className={`material-symbols-outlined mt-0.5 shrink-0 text-[22px] ${
          ok ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {ok ? "check_circle" : "error"}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold leading-tight ${ok ? "text-emerald-900" : "text-red-900"}`}>
          {ok ? t("toast_success") || "Thành công" : t("toast_error") || "Có lỗi xảy ra"}
        </p>
        {cleanMsg && <p className="mt-1 text-xs leading-snug text-slate-600">{cleanMsg}</p>}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="-mt-0.5 shrink-0 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );

  if (!mounted) return null;
  return createPortal(node, document.body);
}
