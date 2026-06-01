"use client";

import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Toast — top-right notification component
 * Replaces the old bottom-8 right-8 inline divs across dashboard pages.
 *
 * Usage:
 *   {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
 */
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

  // Strip leading emoji from msg (the old code often prepended ✅ / ❌)
  const cleanMsg = msg.replace(/^[✅❌⚠️🔔✓×\s]+/, "").trim();

  return (
    <div
      className={[
        "fixed top-4 right-4 z-[9999]",
        "flex items-start gap-3",
        "px-4 py-3.5 rounded-2xl shadow-2xl",
        "max-w-xs w-full sm:max-w-sm",
        "border backdrop-blur-md",
        "transition-all duration-300",
        ok
          ? "bg-emerald-950/90 border-[#4A7C5C]/40 text-emerald-50"
          : "bg-red-950/90 border-red-500/40 text-red-50",
      ].join(" ")}
      role="alert"
    >
      {/* Icon */}
      <span
        className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 ${
          ok ? "text-[#6FB585]" : "text-red-400"
        }`}
      >
        {ok ? "check_circle" : "error"}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">
          {ok ? t("toast_success") || "Thành công" : t("toast_error") || "Có lỗi xảy ra"}
        </p>
        {cleanMsg && (
          <p className="text-xs mt-1 opacity-80 leading-snug">{cleanMsg}</p>
        )}
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="shrink-0 opacity-50 hover:opacity-100 transition -mt-0.5"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}
