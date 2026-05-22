"use client";
import { usePathname } from "next/navigation";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ChatProvider } from "@/contexts/ChatContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { GeolocationPrompt } from "@/hooks/useGeolocation";

const HIDE_NAV_ROUTES = ["/login", "/forgot-password"];

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide desktop navbar only on login/forgot-password pages
  const hideDesktopNav = HIDE_NAV_ROUTES.some(r => pathname.startsWith(r));

  // Hide mobile bottom navigation on login, forgot-password, and verification sub-pages (e.g. results/details, scan, manual)
  // but keep it visible on the main verification options page (/verify)
  const isVerifySubpath = pathname.startsWith("/verify/") && pathname !== "/verify";
  const hideMobileBottomNav = HIDE_NAV_ROUTES.some(r => pathname.startsWith(r)) || isVerifySubpath;

  return (
    <LanguageProvider>
      <ChatProvider>
        {/* Geolocation permission prompt — appears once on first visit */}
        <GeolocationPrompt />

        {/* Desktop navbar — hidden on mobile */}
        {!hideDesktopNav && (
          <div className="hidden lg:block">
            <Navbar />
          </div>
        )}

        {/* Main content — dynamic padding depending on navbar and bottom menu visibility */}
        <main className={`flex-1 ${hideDesktopNav ? "" : "lg:pt-20"} ${hideMobileBottomNav ? "pb-0" : "pb-20"} lg:pb-0`}>
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
