"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  roles: string[]; // ["*"] = mọi role
  group: keyof typeof GROUP_LABELS;
}

const GROUP_LABELS = {
  common:    "Chung",
  product:   "Sản phẩm & Phân phối",
  quality:   "Chất lượng & Cảnh báo",
  analytics: "Phân tích & Báo cáo",
  admin:     "Quản trị hệ thống",
  docs:      "Tài liệu",
  me:        "Cá nhân",
} as const;

const ALL_PAGES: MenuItem[] = [
  // Chung — mọi role
  { label: "Trang chủ",       href: "/dashboard",                   icon: "home",                       roles: ["*"], group: "common" },
  { label: "Xác thực",        href: "/verify",                      icon: "qr_code_scanner",            roles: ["*"], group: "common" },
  { label: "Chuỗi cung ứng",  href: "/supply-chain",                icon: "route",                      roles: ["*"], group: "common" },

  // Sản phẩm — DN
  { label: "Sản phẩm",        href: "/dashboard/inventory",         icon: "inventory_2",                roles: ["manufacturer","importer","admin"], group: "product" },
  { label: "Phân phối",       href: "/dashboard/distribution",      icon: "local_shipping",             roles: ["manufacturer","importer","admin"], group: "product" },
  { label: "Kho hàng",        href: "/dashboard/warehouse",         icon: "warehouse",                  roles: ["manufacturer","importer","admin"], group: "product" },
  { label: "Chứng nhận",      href: "/dashboard/certificates",      icon: "workspace_premium",          roles: ["manufacturer","importer","admin"], group: "product" },

  // Chất lượng
  { label: "Hậu kiểm",        href: "/dashboard/haukiem",           icon: "science",                    roles: ["manufacturer","importer","admin"], group: "quality" },
  { label: "Cảnh báo",        href: "/dashboard/alerts",            icon: "warning",                    roles: ["*"], group: "quality" },
  { label: "Tuân thủ",        href: "/dashboard/compliance",        icon: "rule",                       roles: ["manufacturer","importer","admin","consultant","authority"], group: "quality" },

  // Phân tích
  { label: "Phân tích",       href: "/dashboard/analytics",         icon: "analytics",                  roles: ["manufacturer","importer","admin","consultant","authority"], group: "analytics" },
  { label: "Báo cáo",         href: "/dashboard/report",            icon: "description",                roles: ["manufacturer","importer","admin","consultant","authority"], group: "analytics" },
  { label: "Lịch sử",         href: "/dashboard/history",           icon: "history",                    roles: ["manufacturer","importer","admin","authority"], group: "analytics" },
  { label: "Tích hợp",        href: "/dashboard/integration",       icon: "integration_instructions",   roles: ["manufacturer","importer","admin"], group: "analytics" },

  // Manufacturer + Importer
  { label: "Nhân viên DN",    href: "/dashboard/team",              icon: "groups",                     roles: ["manufacturer","importer"], group: "product" },
  { label: "Webhook ERP",     href: "/dashboard/webhook",           icon: "webhook",                    roles: ["manufacturer","importer","admin"], group: "product" },
  { label: "Cấu hình vòng đời", href: "/dashboard/lifecycle-config", icon: "schedule",                  roles: ["manufacturer","importer","admin"], group: "quality" },

  // Admin only
  { label: "Duyệt KYC",       href: "/dashboard/kyc",               icon: "verified_user",              roles: ["admin"], group: "admin" },
  { label: "Quản lý người dùng", href: "/dashboard/users",          icon: "manage_accounts",            roles: ["admin"], group: "admin" },
  { label: "Geocoding DN",    href: "/dashboard/geocoding",         icon: "my_location",                roles: ["admin"], group: "admin" },
  { label: "Cấu hình hệ thống", href: "/dashboard/system-config",   icon: "tune",                       roles: ["admin"], group: "admin" },
  { label: "Bảo mật",         href: "/dashboard/security",          icon: "shield_lock",                roles: ["admin"], group: "admin" },
  { label: "Sẵn sàng",        href: "/dashboard/readiness",         icon: "checklist",                  roles: ["admin"], group: "admin" },
  { label: "Rủi ro",          href: "/dashboard/risks",             icon: "priority_high",              roles: ["admin"], group: "admin" },
  { label: "Lộ trình",        href: "/dashboard/roadmap",           icon: "route",                      roles: ["admin"], group: "admin" },

  // Docs
  { label: "Thuật ngữ",       href: "/dashboard/glossary",          icon: "menu_book",                  roles: ["*"], group: "docs" },

  // Cá nhân
  { label: "Hồ sơ",           href: "/dashboard/profile",           icon: "person",                     roles: ["*"], group: "me" },
];

export default function MobileMenuDrawer({
  open,
  onClose,
  userRole,
}: {
  open: boolean;
  onClose: () => void;
  userRole: string | null;
}) {
  const pathname = usePathname();

  // Lock body scroll khi drawer mở
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  const visible = ALL_PAGES.filter(
    (it) => it.roles.includes("*") || (userRole && it.roles.includes(userRole))
  );

  // Group items theo group key
  const grouped: Record<string, MenuItem[]> = {};
  for (const it of visible) {
    grouped[it.group] = grouped[it.group] || [];
    grouped[it.group].push(it);
  }
  // Thứ tự nhóm hiển thị
  const groupOrder: (keyof typeof GROUP_LABELS)[] = ["common", "product", "quality", "analytics", "admin", "docs", "me"];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(11, 22, 35, 0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflowY: "auto",
        animation: "fadeIn 0.18s ease",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ minHeight: "100%", padding: "16px 18px 32px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 600, fontSize: 24, letterSpacing: "-0.02em",
              color: "#F6F1E8", lineHeight: 1.1,
            }}>
              Menu <span style={{ color: "#C8A557" }}>đầy đủ</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(246,241,232,0.45)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Outfit', sans-serif" }}>
              {visible.length} chức năng · vai trò {userRole || "khách"}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(246,241,232,0.06)",
              border: "1px solid rgba(246,241,232,0.12)",
              color: "#F6F1E8", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* Groups */}
        {groupOrder.map(g => {
          const items = grouped[g];
          if (!items || items.length === 0) return null;
          return (
            <div key={g} style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "rgba(200,165,87,0.7)", fontWeight: 600,
                marginBottom: 10, paddingLeft: 4, fontFamily: "'Outfit', sans-serif",
              }}>
                {GROUP_LABELS[g]}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {items.map(it => {
                  const active = pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(it.href));
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={onClose}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                        padding: "14px 14px",
                        border: `1px solid ${active ? "#C8A557" : "rgba(200,165,87,0.20)"}`,
                        borderRadius: 14,
                        background: active
                          ? "linear-gradient(180deg, rgba(200,165,87,0.12), rgba(200,165,87,0.04))"
                          : "linear-gradient(180deg, rgba(246,241,232,0.03), rgba(246,241,232,0.01))",
                        color: "#F6F1E8", textDecoration: "none",
                        transition: "border-color 0.2s, transform 0.2s",
                        minHeight: 78,
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: active ? "rgba(200,165,87,0.20)" : "rgba(200,165,87,0.08)",
                        border: `1px solid ${active ? "rgba(200,165,87,0.5)" : "rgba(200,165,87,0.2)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#C8A557", flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{it.icon}</span>
                      </div>
                      <div style={{
                        fontFamily: "'Fraunces', Georgia, serif",
                        fontWeight: 500, fontSize: 13,
                        letterSpacing: "-0.01em", color: "#F6F1E8", lineHeight: 1.3,
                      }}>
                        {it.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Logout */}
        <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid rgba(246,241,232,0.08)" }}>
          <button
            onClick={() => {
              // Clear session + redirect
              try {
                ["userRole", "userName", "doanhNghiepId"].forEach(k => {
                  localStorage.removeItem(k);
                  document.cookie = `${k}=; Max-Age=0; path=/`;
                });
              } catch {}
              window.location.href = "/login";
            }}
            style={{
              width: "100%", padding: "14px",
              background: "transparent",
              border: "1px solid rgba(218,37,29,0.4)",
              borderRadius: 14, color: "#ff8a8a",
              fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
