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
  const hideNav = HIDE_NAV_ROUTES.some(r => pathname.startsWith(r));

  return (
    <LanguageProvider>
      <ChatProvider>
        {/* Geolocation permission prompt — appears once on first visit */}
        <GeolocationPrompt />

        {/* Desktop navbar — hidden on mobile */}
        {!hideNav && (
          <div className="hidden lg:block">
            <Navbar />
          </div>
        )}

        {/* Main content */}
        <main className={`flex-1 ${hideNav ? "" : "lg:pt-20"} pb-20 lg:pb-0`}>
          {children}
        </main>

        {/* Mobile bottom navigation — only on mobile, hidden on desktop */}
        {!hideNav && (
          <div className="block lg:hidden">
            <MobileBottomNav />
          </div>
        )}
      </ChatProvider>
    </LanguageProvider>
  );
}
