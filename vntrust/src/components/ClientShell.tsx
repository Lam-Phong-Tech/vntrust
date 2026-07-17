"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ChatProvider } from "@/contexts/ChatContext";
import Navbar, { AiNavModal } from "@/components/Navbar";
import MobileBottomNav, { MobileTopBar } from "@/components/MobileBottomNav";
import { GeolocationPrompt } from "@/hooks/useGeolocation";
import Footer from "@/components/Footer";

// Quy tắc layout (revision sau feedback):
// TẤT CẢ role + anonymous → full responsive (Navbar desktop ≥lg, MobileTop+Bottom <lg)
// Trang web tự fit cả desktop và mobile. KHÔNG có mobile-frame 430px nữa.
function isMobileFrameRole(): boolean {
  return false; // disable mobile-frame globally — đáp ứng yêu cầu consumer cũng fit laptop
}

const HIDE_NAV_ROUTES = ["/login", "/forgot-password"];
const POLL_INTERVAL_MS = 30_000; // 30 seconds

// ── Utility: clear all session data and force redirect ────────────────────────
function forceLogout(reason = "suspended") {
  // 1. Clear localStorage
  const keysToRemove = ["userRole", "userName", "doanhNghiepId", "vntrust_chat_web"];
  keysToRemove.forEach(k => {
    try { localStorage.removeItem(k); } catch {}
  });
  // Also clear any chat history keys
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith("vntrust_chat_"))
      .forEach(k => localStorage.removeItem(k));
  } catch {}

  // 2. Clear cookies via document.cookie (client-side readable ones)
  ["userRole", "userName", "doanhNghiepId"].forEach(name => {
    document.cookie = `${name}=; Max-Age=0; path=/`;
  });

  // 3. Hard redirect (not router.push — clears React state fully)
  window.location.href = `/login?reason=${reason}`;
}

// ── Session Guard Hook ────────────────────────────────────────────────────────
function useSessionGuard(isDashboard: boolean, pathname: string) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({}));
        const reason = data?.reason || "suspended";
        forceLogout(reason);
      }
    } catch {
      // Network error — don't kick out, wait for next poll
    }
  };

  useEffect(() => {
    if (!isDashboard) return;

    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (!role) return;

    // ① Check immediately on mount or route change
    checkSession();

    // ② Poll every 30s as safety net
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(checkSession, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // pathname in deps → re-check on every navigation
  }, [isDashboard, pathname]);
}

// ── ClientShell ───────────────────────────────────────────────────────────────
export default function ClientShell({ children, initialRole = "" }: { children: React.ReactNode; initialRole?: string }) {
  const pathname = usePathname();
  const [aiOpen, setAiOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(initialRole);

  const isVerifySubpath     = pathname.startsWith("/verify/") && pathname !== "/verify";
  const isVerifyToolPage    = /^\/verify\/(manual|wizard|history|rewards|profile|scan|camera|ai-doc)(?:\/|$)/.test(pathname);
  const isVerifyResultPage  = isVerifySubpath && !isVerifyToolPage;
  // Khu /admin có shell riêng (sidebar + topbar) → ẩn nav toàn cục để tránh trùng
  const isAdminArea         = pathname === "/admin" || pathname.startsWith("/admin/");
  const isEnterpriseManage  = pathname === "/enterprise/manage" || pathname.startsWith("/enterprise/manage/");
  // Hide top bar trên login/forgot VÀ trên trang kết quả xác thực /verify/[uid]
  // (vì trang này có header riêng + thanh ngoài làm trùng lặp)
  const hideDesktopNav      = HIDE_NAV_ROUTES.some(r => pathname.startsWith(r)) || isVerifyResultPage || isAdminArea || isEnterpriseManage;
  const hideMobileBottomNav = HIDE_NAV_ROUTES.some(r => pathname.startsWith(r)) || isVerifyResultPage || isAdminArea || isEnterpriseManage;
  const hideFloatingAi      = HIDE_NAV_ROUTES.some(r => pathname.startsWith(r)) || isVerifyResultPage || isAdminArea;
  const hideFooter          = isAdminArea || isEnterpriseManage || currentRole === "admin";

  // Layout mode: mobile-frame chỉ cho consumer + anonymous; role khác → responsive
  // SSR khởi tạo từ cookie (initialRole), CSR có thể re-check on role change
  const [mobileFrameMode, setMobileFrameMode] = useState(() => isMobileFrameRole());

  useEffect(() => {
    // Re-check role on path change (user vừa login/logout)
    setMobileFrameMode(isMobileFrameRole());
    try {
      setCurrentRole(localStorage.getItem("userRole") || initialRole || "");
    } catch {
      setCurrentRole(initialRole || "");
    }
  }, [pathname, initialRole]);

  // Only activate session guard on protected routes
  const isDashboard = pathname.startsWith("/dashboard");
  useSessionGuard(isDashboard, pathname);

  // Padding main theo mode + nav presence
  const mainTopPad    = hideDesktopNav      ? "" : (mobileFrameMode ? "pt-[52px]" : "pt-[52px] lg:pt-20");
  const mainBottomPad = hideMobileBottomNav ? "pb-0" : (mobileFrameMode ? "pb-[80px]" : "pb-[80px] lg:pb-0");
  const wrapperCls    = mobileFrameMode ? "vntrust-mobile-frame" : "vntrust-responsive-app";

  return (
    <LanguageProvider>
      <ChatProvider>
        <GeolocationPrompt />

        <div className={wrapperCls} data-frame-mode={mobileFrameMode ? "mobile" : "responsive"}>
          {/* Top bar — mobile-frame: luôn hiện; responsive: chỉ mobile viewport (<lg) */}
          {!hideDesktopNav && (
            mobileFrameMode
              ? <MobileTopBar />
              : <div className="block lg:hidden"><MobileTopBar /></div>
          )}

          {/* Desktop Navbar — chỉ trong responsive mode, ≥lg */}
          {!hideDesktopNav && !mobileFrameMode && (
            <div className="hidden lg:block"><Navbar /></div>
          )}

          <main className={`flex-1 ${mainTopPad} ${mainBottomPad}`}>
            {children}
          </main>

          {!hideFooter && <Footer />}

          {!hideFloatingAi && (
            <>
              {aiOpen && <AiNavModal onClose={() => setAiOpen(false)} />}
              {!aiOpen && (
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="floating-ai-button fixed right-4 lg:right-6 bottom-[calc(92px+env(safe-area-inset-bottom,0px))] lg:bottom-6 z-[70] h-[52px] w-[52px] lg:h-14 lg:w-14 rounded-full bg-gradient-to-br from-[#2f7df4] to-[#C8A557] text-white shadow-[0_14px_40px_rgba(47,125,244,0.35)] border border-white/30 flex items-center justify-center transition hover:scale-105 active:scale-95"
                  aria-label="Ask AI"
                  title="Ask AI"
                >
                  <span className="material-symbols-outlined text-[25px] lg:text-[27px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                    smart_toy
                  </span>
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#6FB585] border-2 border-white shadow" />
                </button>
              )}
            </>
          )}

          {/* Bottom nav — mobile-frame: luôn hiện; responsive: chỉ mobile viewport */}
          {!hideMobileBottomNav && (
            mobileFrameMode
              ? <MobileBottomNav />
              : <div className="block lg:hidden"><MobileBottomNav /></div>
          )}
        </div>
      </ChatProvider>
    </LanguageProvider>
  );
}
