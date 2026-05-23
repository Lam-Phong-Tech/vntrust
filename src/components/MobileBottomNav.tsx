"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import NotificationBell from "@/components/NotificationBell";
import { useLanguage } from "@/contexts/LanguageContext";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Trang chủ", href: "/dashboard", icon: "home" },
  { label: "Xác thực", href: "/verify", icon: "qr_code_scanner" },
  { label: "Chuỗi CC", href: "/supply-chain", icon: "route" },
  { label: "Kho hàng", href: "/dashboard/warehouse", icon: "warehouse" },
  { label: "Phân phối", href: "/dashboard/distribution", icon: "local_shipping" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    setIsLoggedIn(!!role);
  }, []);

  // Filter nav items based on role
  let navItems: NavItem[] = [];

  if (userRole === "manufacturer") {
    navItems = [
      { label: t("mob_nav_home"),    href: "/dashboard",           icon: "home"           },
      { label: t("mob_nav_product"), href: "/dashboard/inventory",  icon: "inventory_2"    },
      { label: t("mob_nav_create"),  href: "/dashboard/create",     icon: "add_circle"     },
      { label: t("mob_nav_verify"),  href: "/verify",               icon: "qr_code_scanner" },
      { label: t("mob_nav_me"),      href: "/dashboard/profile",    icon: "person"         },
    ];
  } else {
    navItems = [
      { label: t("mob_nav_home"),      href: "/dashboard",               icon: "home"           },
      { label: t("mob_nav_verify"),    href: "/verify",                  icon: "qr_code_scanner" },
      { label: t("mob_nav_supply"),    href: "/supply-chain",            icon: "route"          },
      { label: t("mob_nav_warehouse"), href: "/dashboard/warehouse",     icon: "warehouse"      },
      { label: t("mob_nav_distrib"),   href: "/dashboard/distribution",  icon: "local_shipping" },
    ].slice(0, 5);
  }

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/"
      : pathname.startsWith(href);

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(11, 22, 35, 0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(200, 165, 87, 0.15)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "stretch",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        minHeight: "64px",
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "8px 4px",
              textDecoration: "none",
              color: active ? "#C8A557" : "rgba(246,241,232,0.45)",
              transition: "color 0.2s",
              minWidth: 0,
            }}
          >
            {/* Icon wrap */}
            <div style={{
              width: 40,
              height: 28,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: active ? "rgba(200,165,87,0.15)" : "transparent",
              transition: "background 0.2s, transform 0.2s",
              transform: active ? "scale(1.05)" : "scale(1)",
            }}>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 22,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                  color: active ? "#C8A557" : "rgba(246,241,232,0.45)",
                }}
              >
                {item.icon}
              </span>
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              letterSpacing: "0.02em",
              fontFamily: "'Outfit', sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Mobile Top Header (dùng trong từng page) ── */
export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  rightContent,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(11, 22, 35, 0.95)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(200, 165, 87, 0.12)",
      padding: "12px 16px 10px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
    }}>
      {showBack && (
        <button
          onClick={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(246,241,232,0.08)",
            border: "1px solid rgba(246,241,232,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F6F1E8",
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back_ios_new</span>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: "-0.02em",
          color: "#F6F1E8",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 11,
            color: "rgba(246,241,232,0.45)",
            marginTop: 1,
            fontFamily: "'Outfit', sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {subtitle}
          </div>
        )}
      </div>
      {rightContent && (
        <div style={{ flexShrink: 0 }}>{rightContent}</div>
      )}
    </div>
  );
}

/* ── Mobile Global Top Bar (logo + utility icons) ── */
export function MobileTopBar() {
  const { lang, setLang } = useLanguage();
  const [theme, setTheme] = useState("dark");
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [geoToast, setGeoToast] = useState<string | null>(null);
  const geoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore state from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("vntrust_theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light-mode");
    }
    const savedGeo = localStorage.getItem("geo_enabled");
    if (savedGeo === "0") setGeoEnabled(false);
  }, []);

  // Sync theme class to <html>
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light-mode");
    } else {
      document.documentElement.classList.remove("light-mode");
    }
    localStorage.setItem("vntrust_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const toggleGeo = () => {
    const next = !geoEnabled;
    setGeoEnabled(next);
    localStorage.setItem("geo_enabled", next ? "1" : "0");
    sessionStorage.removeItem("vntrust_geo");
    if (next) {
      localStorage.removeItem("geo_asked");
      // Get actual coordinates to show in toast
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(5);
          const lng = pos.coords.longitude.toFixed(5);
          showGeoToast(`📍 ${lat}, ${lng}`);
        },
        () => showGeoToast("📍 GPS đang bật"),
        { timeout: 5000 }
      );
    } else {
      showGeoToast("🚫 GPS đã tắt");
    }
    window.dispatchEvent(new CustomEvent("vntrust_geo_toggle", { detail: { enabled: next } }));
  };

  const showGeoToast = (msg: string) => {
    if (geoToastTimer.current) clearTimeout(geoToastTimer.current);
    setGeoToast(msg);
    geoToastTimer.current = setTimeout(() => setGeoToast(null), 3000);
  };

  // Shared icon button style
  const iconBtn = (active?: boolean): React.CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: active ? "rgba(200,165,87,0.15)" : "rgba(246,241,232,0.06)",
    border: `1px solid ${active ? "rgba(200,165,87,0.35)" : "rgba(246,241,232,0.10)"}`,
    color: active ? "#C8A557" : "rgba(246,241,232,0.65)",
    cursor: "pointer",
    transition: "all 0.2s",
    flexShrink: 0,
  });

  return (
    <>
      {/* Top bar */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 110,
        height: 52,
        background: "rgba(11, 22, 35, 0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(200, 165, 87, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 16,
        paddingRight: 12,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}>
        {/* Left: Logo */}
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #22d3ee, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(0,221,221,0.4)",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#fff", fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
          </div>
          <span style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: "0.08em",
            color: "#F6F1E8",
          }}>
            VN<span style={{ color: "#22d3ee" }}>TRUST</span>
          </span>
        </Link>

        {/* Right: utility icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            style={{
              ...iconBtn(),
              width: "auto",
              borderRadius: 20,
              padding: "0 10px",
              gap: 4,
              display: "flex",
              alignItems: "center",
              fontSize: 11,
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              color: "rgba(246,241,232,0.8)",
            }}
            title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>translate</span>
            {lang === "vi" ? "VI" : "EN"}
          </button>

          {/* GPS toggle */}
          <button
            onClick={toggleGeo}
            style={iconBtn(geoEnabled)}
            title={geoEnabled ? "Tắt GPS" : "Bật GPS"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {geoEnabled ? "gps_fixed" : "gps_off"}
            </span>
          </button>

          {/* Dark / Light mode */}
          <button
            onClick={toggleTheme}
            style={iconBtn()}
            title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>

          {/* Notification bell */}
          <NotificationBell />
        </div>
      </div>

      {/* GPS coordinate toast */}
      {geoToast && (
        <div style={{
          position: "fixed",
          top: 60,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 200,
          background: "rgba(11,22,35,0.96)",
          border: "1px solid rgba(200,165,87,0.3)",
          borderRadius: 12,
          padding: "8px 16px",
          color: "#C8A557",
          fontSize: 12,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 600,
          whiteSpace: "nowrap",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          animation: "fadeIn 0.2s ease",
        }}>
          {geoToast}
        </div>
      )}
    </>
  );
}
