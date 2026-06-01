"use client";
import Link from "next/link";

const roles = [
  {
    id: "admin",
    title: "Quản trị viên",
    desc: "Duyệt KYC & giám sát hệ thống",
    icon: "admin_panel_settings",
    accent: "#C8893A",
    accentBg: "rgba(200,137,58,0.12)",
    accentBorder: "rgba(200,137,58,0.25)",
  },
  {
    id: "manufacturer",
    title: "Nhà sản xuất",
    desc: "Quản lý sản phẩm & mã QR",
    icon: "factory",
    accent: "#C8A557",
    accentBg: "rgba(200,165,87,0.12)",
    accentBorder: "rgba(200,165,87,0.25)",
  },
  {
    id: "importer",
    title: "Nhà phân phối",
    desc: "Chuỗi cung ứng & nhập khẩu",
    icon: "local_shipping",
    accent: "#6FB585",
    accentBg: "rgba(74,124,92,0.12)",
    accentBorder: "rgba(74,124,92,0.25)",
  },
  {
    id: "consumer",
    title: "Người tiêu dùng",
    desc: "Quét mã, xác thực, báo cáo",
    icon: "qr_code_scanner",
    accent: "#52c2c2",
    accentBg: "rgba(82,194,194,0.12)",
    accentBorder: "rgba(82,194,194,0.25)",
  },
];

export default function LoginPortal() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0B1623",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background radial glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,165,87,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(200,165,87,0.08) 0%, transparent 60%)",
      }} />
      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(200,165,87,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(200,165,87,0.025) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 80%)",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 420,
        padding: "40px 24px 32px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            border: "1px solid #C8A557",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            color: "#C8A557",
          }}>
            <div style={{
              position: "absolute", inset: -6,
              border: "1px solid rgba(200,165,87,0.2)",
              borderRadius: 19,
            }} />
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>shield</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 600, fontSize: 26,
              letterSpacing: "-0.015em",
              color: "#F6F1E8",
            }}>
              VN<span style={{ color: "#C8A557" }}>Trust</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(246,241,232,0.45)", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 3 }}>
              Anti-Counterfeit · Vietnam
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ textAlign: "center", marginBottom: 32, padding: "0 8px" }}>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 400, fontSize: 26,
            lineHeight: 1.15, letterSpacing: "-0.02em",
            color: "#F6F1E8", marginBottom: 10,
          }}>
            Bảo vệ <em style={{ fontStyle: "italic", color: "#C8A557", fontWeight: 300 }}>di sản</em><br />thương hiệu Việt
          </h1>
          <p style={{ fontSize: 12, color: "rgba(246,241,232,0.5)", lineHeight: 1.6 }}>
            Chọn vai trò để bắt đầu
          </p>
        </div>

        {/* Role cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          {roles.map(role => (
            <Link key={role.id} href={`/login/${role.id}`} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px",
              border: `1px solid ${role.accentBorder}`,
              borderRadius: 14,
              background: "linear-gradient(180deg, rgba(246,241,232,0.03), rgba(246,241,232,0.01))",
              cursor: "pointer",
              textDecoration: "none",
              color: "#F6F1E8",
              transition: "border-color 0.2s, transform 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = role.accent; (e.currentTarget as HTMLElement).style.transform = "translateX(2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = role.accentBorder; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: role.accentBg,
                border: `1px solid ${role.accentBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: role.accent, flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{role.icon}</span>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontWeight: 500, fontSize: 15,
                  letterSpacing: "-0.01em", marginBottom: 2,
                  color: "#F6F1E8",
                }}>
                  {role.title}
                </div>
                <div style={{ fontSize: 10, color: "rgba(246,241,232,0.5)", lineHeight: 1.4 }}>
                  {role.desc}
                </div>
              </div>
              {/* Arrow */}
              <div style={{ color: "#C8A557", opacity: 0.6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Back to home */}
        <div style={{ marginTop: 28 }}>
          <Link href="/" style={{
            fontSize: 12, color: "rgba(246,241,232,0.4)",
            display: "flex", alignItems: "center", gap: 5,
            textDecoration: "none", transition: "color 0.2s",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>home</span>
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
