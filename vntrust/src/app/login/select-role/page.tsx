"use client";
import Link from "next/link";

const roles = [
  {
    id: "consumer",
    title: "Người tiêu dùng",
    desc: "Quét mã, xác thực, báo cáo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "manufacturer",
    title: "Nhà sản xuất",
    desc: "Quản lý sản phẩm & mã QR",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 21h18M5 21V7l8-4 8 4v14" />
      </svg>
    ),
  },
  {
    id: "importer",
    title: "Nhà phân phối",
    desc: "Chuỗi cung ứng & nhập khẩu",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: "admin",
    title: "Quản trị viên",
    desc: "Duyệt KYC & giám sát",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="10" r="2.5" />
        <path d="M8 17a4 4 0 0 1 8 0" />
      </svg>
    ),
  },
];

export default function LoginPortal() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .s-role {
          background: #0B1623;
          color: #F6F1E8;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          padding-bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', -apple-system, sans-serif;
        }

        .s-role::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200, 165, 87, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 50% 100%, rgba(200, 165, 87, 0.08) 0%, transparent 60%);
          pointer-events: none;
        }

        .s-role-content {
          padding: 4px 24px 24px;
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
        }

        .s-role-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding-top: 24px;
          padding-bottom: 28px;
        }

        .s-role-brand-mark {
          width: 56px;
          height: 56px;
          border: 1px solid #C8A557;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          color: #C8A557;
        }

        .s-role-brand-mark::before {
          content: '';
          position: absolute;
          inset: -6px;
          border: 1px solid rgba(200, 165, 87, 0.2);
          border-radius: 19px;
        }

        .s-role-brand-mark svg {
          width: 28px;
          height: 28px;
        }

        .s-role-brand-name {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 24px;
          letter-spacing: -0.015em;
        }

        .s-role-brand-name span {
          color: #C8A557;
        }

        .s-role-brand-tag {
          font-size: 10px;
          color: rgba(246, 241, 232, 0.5);
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .s-role-hero {
          text-align: center;
          padding: 0 4px 28px;
        }

        .s-role-hero-title {
          font-family: 'Fraunces', serif;
          font-weight: 400;
          font-size: 28px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin-bottom: 10px;
        }

        .s-role-hero-title em {
          font-style: italic;
          color: #C8A557;
          font-weight: 300;
        }

        .s-role-hero-sub {
          font-size: 12px;
          color: rgba(246, 241, 232, 0.55);
          line-height: 1.5;
          max-width: 240px;
          margin: 0 auto;
        }

        .s-role-cards {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .s-role-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border: 1px solid rgba(200, 165, 87, 0.15);
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(246, 241, 232, 0.03), rgba(246, 241, 232, 0.01));
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
          color: inherit;
        }

        .s-role-card:hover {
          border-color: #C8A557;
          transform: translateX(2px);
        }

        .s-role-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(200, 165, 87, 0.1);
          border: 1px solid rgba(200, 165, 87, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #C8A557;
          flex-shrink: 0;
        }

        .s-role-card-icon svg {
          width: 18px;
          height: 18px;
        }

        .s-role-card-info {
          flex: 1;
          min-width: 0;
        }

        .s-role-card-name {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 15px;
          letter-spacing: -0.01em;
          margin-bottom: 2px;
        }

        .s-role-card-desc {
          font-size: 10px;
          color: rgba(246, 241, 232, 0.5);
          line-height: 1.4;
        }

        .s-role-card-arrow {
          color: #C8A557;
          opacity: 0.6;
        }

        .s-role-card-arrow svg {
          width: 14px;
          height: 14px;
        }
      `}} />

      <div className="s-role">
        <div className="s-role-content">
          {/* Brand */}
          <div className="s-role-brand">
            <div className="s-role-brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="s-role-brand-name">VN<span>Trust</span></div>
            <div className="s-role-brand-tag">Bảo chứng niềm tin</div>
          </div>

          {/* Hero */}
          <div className="s-role-hero">
            <h1 className="s-role-hero-title">Bảo vệ <em>di sản</em><br />thương hiệu Việt</h1>
            <p className="s-role-hero-sub">Chọn vai trò để bắt đầu</p>
          </div>

          {/* Roles */}
          <div className="s-role-cards">
            {roles.map(role => (
              <Link key={role.id} href={`/login/${role.id}`} className="s-role-card">
                <div className="s-role-card-icon">
                  {role.icon}
                </div>
                <div className="s-role-card-info">
                  <div className="s-role-card-name">{role.title}</div>
                  <div className="s-role-card-desc">{role.desc}</div>
                </div>
                <div className="s-role-card-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* VNeID Divider */}
          <div style={{ position:'relative', margin:'20px 0 16px', textAlign:'center' }}>
            <span style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'rgba(246,241,232,0.1)' }} />
            <span style={{ position:'relative', zIndex:1, background:'transparent', padding:'0 12px', fontSize:10, color:'rgba(246,241,232,0.4)', letterSpacing:'0.14em', textTransform:'uppercase' }}>Hoặc đăng nhập bằng</span>
          </div>

          <button
            onClick={() => alert('Tính năng VNeID đang được tích hợp')}
            style={{ width:'100%', padding:'14px 18px', background:'transparent', color:'#F6F1E8', border:'1px solid rgba(246,241,232,0.2)', borderRadius:16, fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:12, transition:'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(246,241,232,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="10" fill="#DA251D"/>
              <polygon points="24,8 27.5,18.5 38.5,18.5 29.5,25 33,35.5 24,29 15,35.5 18.5,25 9.5,18.5 20.5,18.5" fill="#FFCD00"/>
            </svg>
            Đăng nhập bằng VNeID
          </button>

        </div>
      </div>
    </>
  );
}
