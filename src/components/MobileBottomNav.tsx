"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";

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
      { label: "Trang chủ", href: "/dashboard", icon: "home" },
      { label: "Sản phẩm", href: "/dashboard/inventory", icon: "inventory_2" },
      { label: "Tạo mới", href: "/dashboard/create", icon: "add_circle" },
      { label: "Kho hàng", href: "/dashboard/warehouse", icon: "warehouse" },
      { label: "Cá nhân", href: "/dashboard/profile", icon: "person" },
    ];
  } else {
    navItems = ALL_NAV_ITEMS.filter(item => {
      if (!item.roles) return true; // visible to all
      if (!userRole) return false;
      return item.roles.includes(userRole);
    }).slice(0, 5); // max 5 tabs
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
