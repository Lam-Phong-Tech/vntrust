"use client";

import { ReactNode, useEffect } from "react";

/**
 * BottomSheetModal
 * - Mobile (< md): slides up from bottom, 85dvh max height, scrollable content, sticky footer
 * - Desktop (≥ md): centered dialog, max-w-{size}, same sticky footer
 *
 * Usage:
 *   <BottomSheetModal open={modal} onClose={() => setModal(false)} title="Thêm SP" size="md">
 *     <div className="bsm-content">...form fields...</div>
 *     <div className="bsm-footer">...buttons...</div>
 *   </BottomSheetModal>
 *
 * Wrap scrollable form content in <div className="bsm-content"> and
 * buttons in <div className="bsm-footer"> for correct sticky behavior.
 */
export function BottomSheetModal({
  open,
  onClose,
  title,
  icon,
  iconBg = "bg-cyan-500/20",
  iconColor = "text-cyan-400",
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;            // material-symbols-outlined name
  iconBg?: string;
  iconColor?: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const maxW = { sm: "md:max-w-sm", md: "md:max-w-md", lg: "md:max-w-lg" }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={[
          // shared
          "bg-[#0f1e33] border border-white/10 shadow-2xl",
          "w-full flex flex-col",
          // mobile: full-width bottom sheet, limited height
          "rounded-t-3xl max-h-[88dvh]",
          // desktop: centered dialog, limited width, fully rounded
          `md:rounded-3xl ${maxW}`,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-4 pb-3 border-b border-white/10 shrink-0">
          {icon && (
            <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{icon}</span>
            </div>
          )}
          <h2 className="text-lg font-bold text-white font-display flex-1">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain bsm-body">
          {children}
        </div>
      </div>
    </div>
  );
}
