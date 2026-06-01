"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ChatProvider } from "@/contexts/ChatContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav, { MobileTopBar } from "@/components/MobileBottomNav";
import { GeolocationPrompt } from "@/hooks/useGeolocation";

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
export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideDesktopNav    = HIDE_NAV_ROUTES.some(r => pathname.startsWith(r));
  const isVerifySubpath   = pathname.startsWith("/verify/") && pathname !== "/verify";
  const hideMobileBottomNav = HIDE_NAV_ROUTES.some(r => pathname.startsWith(r)) || isVerifySubpath;

  // Only activate session guard on protected routes
  const isDashboard = pathname.startsWith("/dashboard");
  useSessionGuard(isDashboard, pathname);

  return (
    <LanguageProvider>
      <ChatProvider>
        {/* Geolocation permission prompt — appears once on first visit */}
        <GeolocationPrompt />

        {/* Mobile global top bar — only on mobile */}
        {!hideDesktopNav && (
          <div className="block lg:hidden">
            <MobileTopBar />
          </div>
        )}

        {/* Desktop navbar — hidden on mobile */}
        {!hideDesktopNav && (
          <div className="hidden lg:block">
            <Navbar />
          </div>
        )}

        {/* Main content — dynamic padding depending on navbar and bottom menu visibility */}
        {/* pt-14 = 52px top bar height on mobile; lg:pt-0 resets for desktop which uses Navbar */}
        <main className={`flex-1 ${hideDesktopNav ? "" : "lg:pt-20"} ${hideMobileBottomNav ? "pb-0" : "pb-20"} lg:pb-0 ${hideDesktopNav ? "" : "pt-[52px] lg:pt-0"}`}>
          {children}
        </main>

        {/* Mobile bottom navigation — only on mobile, hidden on desktop */}
        {!hideMobileBottomNav && (
          <div className="block lg:hidden">
            <MobileBottomNav />
          </div>
        )}
      </ChatProvider>
    </LanguageProvider>
  );
}
