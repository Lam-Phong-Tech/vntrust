"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import NotificationBell from "@/components/NotificationBell";
import MobileMenuDrawer from "@/components/MobileMenuDrawer";
import { useLanguage } from "@/contexts/LanguageContext";

interface NavItem {
  label: string;
  href?: string;
  icon: string;
  roles?: string[];
  onClick?: () => void;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    setIsLoggedIn(!!role);
  }, []);

  // ─── Redesign: 4 normal tabs (2 left + 2 right) + 1 floating GOLD center FAB ───
  // Center FAB = "primary action" theo role: Verify (NSX/NNK/Consumer) hoặc Cảnh báo (Admin)
  let leftTabs: NavItem[] = [];
  let rightTabs: NavItem[] = [];
  let centerItem: NavItem;

  if (userRole === "manufacturer" || userRole === "importer") {
    leftTabs = [
      { label: t("mob_nav_home")    || "Trang chủ", href: "/dashboard",           icon: "home" },
      { label: t("mob_nav_product") || "Sản phẩm",  href: "/dashboard/inventory", icon: "inventory_2" },
    ];
    centerItem = { label: t("mob_nav_verify") || "Xác thực", href: "/verify", icon: "qr_code_scanner" };
    rightTabs = [
      { label: t("mob_nav_me")   || "Hồ sơ", href: "/dashboard/profile", icon: "person" },
      { label: t("mob_nav_more") || "Khác",  icon: "apps", onClick: () => setDrawerOpen(true) },
    ];
  } else if (userRole === "admin") {
    leftTabs = [
      { label: t("mob_nav_home") || "Trang chủ",  href: "/dashboard",     icon: "home" },
      { label: t("mob_nav_kyc")  || "Duyệt KYC",  href: "/dashboard/kyc", icon: "verified_user" },
    ];
    centerItem = { label: t("mob_nav_alert") || "Cảnh báo", href: "/dashboard/alerts", icon: "warning" };
    rightTabs = [
      { label: t("mob_nav_me")   || "Hồ sơ", href: "/dashboard/profile", icon: "person" },
      { label: t("mob_nav_more") || "Khác",  icon: "apps", onClick: () => setDrawerOpen(true) },
    ];
  } else {
    // consumer / guest
    leftTabs = [
      { label: t("mob_nav_home")         || "Trang chủ", href: "/dashboard",    icon: "home" },
      { label: t("mob_nav_report")       || "Báo cáo", href: "/dashboard/report", icon: "report" },
    ];
    centerItem = { label: t("mob_nav_verify") || "Xác thực", href: "/verify", icon: "qr_code_scanner" };
    rightTabs = [
      { label: t("mob_nav_more")   || "Khác",    icon: "apps", onClick: () => setDrawerOpen(true) },
    ];
  }

  // Người tiêu dùng + Doanh nghiệp: thanh gọn, chỉ phạm vi bảng điều khiển
  const isSimpleNav = userRole === "consumer" || userRole === "manufacturer" || userRole === "importer";
  const consumerTabs: NavItem[] = [
    { label: t("mob_nav_home") || "Trang chủ", href: "/dashboard",         icon: "home" },
    { label: t("mob_nav_me")   || "Hồ sơ",     href: "/dashboard/profile", icon: "person" },
    { label: t("mob_nav_more") || "Khác",      icon: "apps", onClick: () => setDrawerOpen(true) },
  ];

  const isActive = (href?: string) =>
    !href
      ? false
      : href === "/dashboard"
        ? pathname === "/dashboard" || pathname === "/"
        : pathname.startsWith(href);

  // ─── Tab style cho 4 normal tabs ───
  const tabStyle = (active: boolean): React.CSSProperties => ({
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
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  });

  const renderTabContent = (item: NavItem, active: boolean) => (
    <>
      <div style={{
        width: 40, height: 28, borderRadius: 9,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "rgba(200,165,87,0.15)" : "transparent",
        transition: "background 0.2s, transform 0.2s",
        transform: active ? "scale(1.05)" : "scale(1)",
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 22,
          fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
          color: active ? "#C8A557" : "rgba(246,241,232,0.45)",
        }}>{item.icon}</span>
      </div>
      <span style={{
        fontSize: 9.5, fontWeight: active ? 600 : 400,
        letterSpacing: "0", fontFamily: "'Outfit', sans-serif",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
        textAlign: "center", lineHeight: 1.1, paddingLeft: 1, paddingRight: 1,
      }}>{item.label}</span>
    </>
  );

  const renderTab = (item: NavItem, idx: number, prefix: string) => {
    const active =
      isActive(item.href) ||
      (item.onClick && drawerOpen && item.icon === "apps");
    if (item.onClick) {
      return (
        <button
          key={`${prefix}-btn-${idx}`}
          onClick={item.onClick}
          style={tabStyle(!!active)}
          aria-label={item.label}
        >
          {renderTabContent(item, !!active)}
        </button>
      );
    }
    return (
      <Link key={`${prefix}-${item.href}`} href={item.href!} style={tabStyle(!!active)}>
        {renderTabContent(item, !!active)}
      </Link>
    );
  };

  const centerActive = isActive(centerItem.href);

  return (
    <>
      {isSimpleNav ? (
      <nav
        className="mobile-bottom-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(11, 22, 35, 0.92)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(200, 165, 87, 0.15)",
          display: "flex", justifyContent: "space-around", alignItems: "stretch",
          paddingBottom: "env(safe-area-inset-bottom, 0px)", minHeight: "64px",
        }}
      >
        {consumerTabs.map((item, idx) => renderTab(item, idx, "C"))}
      </nav>
      ) : (
      <nav
        className="mobile-bottom-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(11, 22, 35, 0.92)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(200, 165, 87, 0.15)",
          display: "flex", justifyContent: "space-around", alignItems: "stretch",
          paddingBottom: "env(safe-area-inset-bottom, 0px)", minHeight: "64px",
        }}
      >
        {/* Left 2 tabs */}
        {leftTabs.map((item, idx) => renderTab(item, idx, "L"))}

        {/* Center spacer to leave room for floating FAB */}
        <div style={{
          flex: 1, position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Floating gold Verify FAB */}
          <Link
            href={centerItem.href!}
            aria-label={centerItem.label}
            style={{
              position: "absolute",
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
              left: "50%",
              transform: "translateX(-50%)",
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: centerActive
                ? "linear-gradient(135deg, #F2DC97 0%, #C8A557 50%, #9A7F3F 100%)"
                : "linear-gradient(135deg, #E4D2A1 0%, #C8A557 60%, #A68638 100%)",
              boxShadow: centerActive
                ? "0 0 0 4px rgba(200,165,87,0.18), 0 10px 28px rgba(200,165,87,0.55), 0 2px 6px rgba(0,0,0,0.4)"
                : "0 0 0 3px rgba(11,22,35,1), 0 8px 22px rgba(200,165,87,0.45), 0 2px 6px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0B1623",
              textDecoration: "none",
              transition: "transform 0.18s ease, box-shadow 0.2s ease",
              zIndex: 2,
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(-50%) scale(0.94)"; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(-50%) scale(1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(-50%) scale(1)"; }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: 30,
              fontVariationSettings: "'FILL' 1, 'wght' 600",
              color: "#0B1623",
              filter: "drop-shadow(0 1px 1px rgba(255,255,255,0.25))",
            }}>{centerItem.icon}</span>
          </Link>
          {/* Label under FAB */}
          <span style={{
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 0px)",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 9.5,
            fontWeight: centerActive ? 700 : 600,
            color: centerActive ? "#C8A557" : "rgba(246,241,232,0.7)",
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: 0.2,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}>{centerItem.label}</span>
        </div>

        {/* Right 2 tabs */}
        {rightTabs.map((item, idx) => renderTab(item, idx, "R"))}
      </nav>
      )}
      <MobileMenuDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} userRole={userRole} />
    </>
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
  const [theme, setTheme] = useState("light");
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [geoToast, setGeoToast] = useState<string | null>(null);
  const geoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore state from localStorage on mount
  useEffect(() => {
    // v2: bỏ qua giá trị "dark" cũ đã lưu từ code mặc-định-tối trước đây → mặc định sáng
    const savedTheme = localStorage.getItem("vntrust_theme_v2") || "light";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light-mode");
    } else {
      document.documentElement.classList.remove("light-mode");
    }
    const savedGeo = localStorage.getItem("geo_enabled");
    if (savedGeo === "0") setGeoEnabled(false);
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const savedTheme = localStorage.getItem("vntrust_theme_v2") || "light";
      setTheme(savedTheme);
    };
    window.addEventListener("storage", syncTheme);
    window.addEventListener("vntrust_theme_change", syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("vntrust_theme_change", syncTheme);
    };
  }, []);

  // Sync theme class to <html>
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light-mode");
    } else {
      document.documentElement.classList.remove("light-mode");
    }
    localStorage.setItem("vntrust_theme_v2", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("vntrust_theme_v2", next);
      window.dispatchEvent(new Event("vntrust_theme_change"));
      return next;
    });
  };

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
      <div className="mobile-top-bar" style={{
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
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", minWidth: 0, maxWidth: 170, overflow: "hidden" }}>
          <span style={{ background: "#ffffff", borderRadius: 9, padding: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.14)" }}>
            <Image
              src="/logo-icon.png"
              alt="AI VeriGoods"
              width={28}
              height={28}
              style={{ objectFit: "contain", display: "block" }}
              priority
            />
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/verigoods-wordmark.png" alt="VeriGoods" style={{ height: 14, width: "auto", maxWidth: 118, objectFit: "contain", display: "block", flexShrink: 1 }} />
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
