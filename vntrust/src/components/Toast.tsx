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
        "fixed right-4 top-20 z-[2147483647] sm:right-6",
        "flex items-start gap-3",
        "rounded-2xl border bg-white px-4 py-3.5 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.18)]",
        "w-[calc(100vw-2rem)] overflow-hidden",
        "transition-all duration-300",
        ok
          ? "border-emerald-200"
          : "border-red-200",
      ].join(" ")}
      style={{ maxWidth: 360 }}
      role="alert"
    >
      {/* Icon */}
      <span
        className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 ${
          ok ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {ok ? "check_circle" : "error"}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm leading-tight ${ok ? "text-emerald-900" : "text-red-900"}`}>
          {ok ? t("toast_success") || "Thành công" : t("toast_error") || "Có lỗi xảy ra"}
        </p>
        {cleanMsg && (
          <p className="text-xs mt-1 leading-snug text-slate-600">{cleanMsg}</p>
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
