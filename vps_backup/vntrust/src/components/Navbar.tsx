"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChat } from "@/contexts/ChatContext";
import NotificationBell from "@/components/NotificationBell";


// ─── Shared AI Engine ─────────────────────────────────────────────────────────
const getAI_RESPONSES = (t: any): Array<{ match: RegExp; replies: string[] }> => [
  {
    match: /^(xin chào|hello|hi|chào|hey|alo)[\s!]*/i, replies: [
      t("ai_resp_0"),
      t("ai_resp_1"),
    ]
  },
  {
    match: /cảm ơn|thanks|thank you|ngon|tốt lắm|hay quá|giỏi/i, replies: [
      t("ai_resp_2"),
      t("ai_resp_3"),
    ]
  },
  {
    match: /serial|mã|uid|qr|tem|quét|scan|số sê/i, replies: [
      t("ai_resp_4"),
      t("ai_resp_5"),
    ]
  },
  {
    match: /hàng giả|làm giả|giả mạo|fake|đáng ngờ|không chính hãng/i, replies: [
      t("ai_resp_6"),
    ]
  },
  {
    match: /sản phẩm|kho|lô hàng|inventory|thêm|đăng ký/i, replies: [
      t("ai_resp_7"),
    ]
  },
  {
    match: /giá|chi phí|bao nhiêu|gói|plan|pricing|mất tiền/i, replies: [
      t("ai_resp_8"),
    ]
  },
  {
    match: /chuỗi cung ứng|supply chain|phân phối|bản đồ|logistics/i, replies: [
      t("ai_resp_9"),
    ]
  },
  {
    match: /bảo mật|hack|xâm nhập|lộ data|an toàn/i, replies: [
      t("ai_resp_10"),
    ]
  },
  {
    match: /app|ứng dụng|mobile|điện thoại|ios|android/i, replies: [
      t("ai_resp_11"),
    ]
  },
  {
    match: /xuất|báo cáo|report|pdf|csv|export/i, replies: [
      t("ai_resp_12"),
    ]
  },
  {
    match: /liên hệ|support|hỗ trợ|hotline|điện thoại|gọi|email/i, replies: [
      t("ai_resp_13"),
    ]
  },
];
export const getAI_FALLBACK = (t: any) => [
  t("ai_resp_14"),
  t("ai_resp_15"),
  t("ai_resp_16"),
];
export function getSharedAIReply(q: string, t: any): string {
  for (const rule of getAI_RESPONSES(t)) {
    if (rule.replies.length > 0 && rule.match.test(q))
      return rule.replies[Math.floor(Math.random() * rule.replies.length)];
  }
  const fallback = getAI_FALLBACK(t);
  return fallback[Math.floor(Math.random() * fallback.length)];
}

const MAX_CHAT_LEN = 500;

// ─── AI Chat Modal — dùng ChatContext (real-time sync với Dashboard) ──────────
function AiNavModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { msgs, addMsg } = useChat();
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [warning, setWarning] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const QUICK_BTNS = [t("chat_q_qr"), t("chat_q_fake"), t("chat_q_price"), t("chat_q_support"), t("chat_q_app")];

  const handleInput = (val: string) => {
    setWarning(val.length > MAX_CHAT_LEN ? `⚠️ ${t("nav_chat_limit")} ${MAX_CHAT_LEN} ${t("nav_chat_chars")}.` : "");
    setInput(val);
  };

  const send = async () => {
    const q = input.trim();
    if (!q || typing) return;
    if (q.length > MAX_CHAT_LEN) { setWarning(`⚠️ ${t("nav_chat_limit")} ${MAX_CHAT_LEN} ${t("nav_chat_chars")}.`); return; }
    setWarning("");
    addMsg({ from: "user", text: q });
    setInput("");
    setTyping(true);

    const serial = q.replace(/<[^>]*>/g, " ").match(/\b([A-Z0-9]{6,})\b/i)?.[1];
    let reply = "";
    if (serial) {
      try {
        const res = await fetch(`/api/verify/${serial.toUpperCase()}`);
        const data = await res.json();
        if (data.status === "genuine" || data.status === "suspect" || data.status === "expired") {
          const sp = data.data?.loHang?.sanPham;
          const lo = data.data?.loHang;
          const statusText = data.status === "genuine" ? t("vuid_5") : data.status === "expired" ? t("vuid_9") : t("vuid_8");
          reply = `🔍 Xong rồi! Mình tìm thấy mã **${serial.toUpperCase()}**\n${statusText}\n📦 Sản phẩm: ${sp?.tenSanPham ?? "N/A"}\n🏭 NSX: ${sp?.doanhNghiep?.tenDoanhNghiep ?? "N/A"}\n📅 SX: ${lo?.ngaySanXuat ? new Date(lo.ngaySanXuat).toLocaleDateString("vi-VN") : "N/A"} · HSD: ${lo?.hanDung ? new Date(lo.hanDung).toLocaleDateString("vi-VN") : "N/A"}\n\nXem chi tiết tại /verify/${serial.toUpperCase()}`;
        } else {
          reply = `⚠️ Mã **${serial.toUpperCase()}** không có trong hệ thống!\n\nCó thể là:\n• Sản phẩm chưa đăng ký VNTrust\n• Mã bị nhập sai hoặc tem hỏng\n• **Nguy hiểm: Có thể là hàng giả!**`;
        }
      } catch { reply = "⚠️ " + t("nav_chat_connfail"); }
    } else {
      let matched = false;
      for (const rule of getAI_RESPONSES(t)) {
        if (rule.replies.length > 0 && rule.match.test(q)) {
          reply = rule.replies[Math.floor(Math.random() * rule.replies.length)];
          matched = true;
          break;
        }
      }
      if (!matched) {
        const fallback = getAI_FALLBACK(t);
        reply = fallback[Math.floor(Math.random() * fallback.length)];
      }
    }

    setTimeout(() => { addMsg({ from: "ai", text: reply }); setTyping(false); }, 700 + Math.random() * 500);
  };

  const charCount = input.length;
  const isOverLimit = charCount > MAX_CHAT_LEN;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md glass-panel border border-white/20 rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header — giống Dashboard */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white">smart_toy</span>
            </div>
            <h2 className="text-lg font-black text-white font-headline">{t("nav_chat_title")}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
            <span className="material-symbols-outlined text-white text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col h-[480px]">
          {/* Messages — giống hệt Dashboard */}
          <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-1">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 ${m.from === "ai" ? "bg-cyan-500" : "bg-slate-600"}`}>
                  <span className="material-symbols-outlined text-white text-[13px]">{m.from === "ai" ? "smart_toy" : "person"}</span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[82%] whitespace-pre-wrap break-words leading-relaxed overflow-hidden min-w-0 ${m.from === "ai" ? "bg-white/10 text-white rounded-tl-none" : "bg-cyan-500 text-white rounded-tr-none"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[13px]">smart_toy</span>
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white/10 flex gap-1.5 items-center">
                  {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick buttons — giống Dashboard */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
            {QUICK_BTNS.map(q => (
              <button key={q} onClick={() => setInput(q)}
                className="text-[10px] font-bold px-3 py-1.5 bg-white/8 rounded-full text-slate-300 hover:bg-white/15 hover:text-white transition border border-white/10">
                {q}
              </button>
            ))}
          </div>

          {/* Warning */}
          {warning && (
            <div className="mt-2 px-3 py-1.5 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-[11px] font-medium">
              {warning}
            </div>
          )}

          {/* Input — giống Dashboard */}
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <input
                className={`flex-1 bg-white/10 border rounded-full px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition w-full ${isOverLimit ? "border-red-500/70 focus:border-red-500" : "border-white/20 focus:border-cyan-400"}`}
                placeholder={t("nav_chat_placeholder")}
                value={input}
                onChange={e => handleInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
              />
              {charCount >= 400 && (
                <span className={`absolute -bottom-4 right-2 text-[10px] font-bold ${isOverLimit ? "text-red-400" : "text-slate-400"}`}>
                  {charCount}/{MAX_CHAT_LEN}
                </span>
              )}
            </div>
            <button onClick={send} disabled={isOverLimit || !input.trim() || typing}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${isOverLimit || !input.trim() || typing ? "bg-white/20 cursor-not-allowed opacity-40" : "bg-cyan-500 hover:bg-cyan-400"}`}>
              <span className="material-symbols-outlined text-white text-[18px]">send</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function AppDownloadModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-[420px] rounded-[24px] p-6 shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(26, 45, 69, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ff9800] shadow-[0_0_15px_rgba(255,152,0,0.4)] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
            </div>
            <span className="font-bold text-white text-[19px] tracking-wide font-headline">{t("nav_app_title")}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <span className="material-symbols-outlined text-white text-[18px]">close</span>
          </button>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <a href="#" className="flex flex-col items-center justify-center h-[130px] rounded-[18px] bg-[#24384e] border border-transparent hover:border-white/20 transition-colors cursor-not-allowed">
            <svg viewBox="0 0 384 512" fill="white" className="w-9 h-9 mb-3 opacity-95">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            <p className="text-[11px] text-slate-300 font-medium mb-1">{t("nav_app_platform")}</p>
            <p className="font-bold text-white text-[16px]">App Store</p>
          </a>

          <a href="/downloads/vntrust-mobile-alpha.apk" download className="flex flex-col items-center justify-center h-[130px] rounded-[18px] bg-[#24384e] border border-transparent hover:border-[#4ade80]/40 hover:bg-[#2a4059] transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            <span className="material-symbols-outlined text-[#4ade80] text-[40px] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>android</span>
            <p className="text-[11px] text-slate-300 font-medium mb-1">Tải trên</p>
            <p className="font-bold text-white text-[16px]">Google Play</p>
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-[12.5px] text-slate-400 font-medium tracking-wide">
          {t("nav_app_version")}
        </p>
      </div>
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLanguage();
  const [modal, setModal] = useState<"ai" | "app" | null>(null);
  const [theme, setTheme] = useState("dark");
  const [scrollOpacity, setScrollOpacity] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(true);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("userRole"));
    // Restore geo preference
    const savedGeo = localStorage.getItem("geo_enabled");
    if (savedGeo === "0") setGeoEnabled(false);
  }, []);

  const toggleGeo = () => {
    const next = !geoEnabled;
    setGeoEnabled(next);
    localStorage.setItem("geo_enabled", next ? "1" : "0");
    if (next) {
      // Remove cached geo so dashboard re-fetches
      sessionStorage.removeItem("vntrust_geo");
      localStorage.removeItem("geo_asked");
      // Dispatch custom event so dashboard picks up the change
      window.dispatchEvent(new CustomEvent("vntrust_geo_toggle", { detail: { enabled: true } }));
    } else {
      sessionStorage.removeItem("vntrust_geo");
      window.dispatchEvent(new CustomEvent("vntrust_geo_toggle", { detail: { enabled: false } }));
    }
  };

  useEffect(() => {
    const onScroll = () => {
      // Opacity tăng dần từ 0 → 0.65 trong 150px đầu
      const opacity = Math.min(window.scrollY / 150, 0.65);
      setScrollOpacity(opacity);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light-mode");
    } else {
      document.documentElement.classList.remove("light-mode");
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const navLinks = [
    { key: "nav_verify", href: "/verify" },
    { key: "nav_supply", href: "/supply-chain" },
    { key: "nav_dashboard", href: "/dashboard" },
    { key: "nav_enterprise", href: "/enterprise" },
  ];

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname.startsWith("/dashboard") || pathname === "/"
      : pathname.startsWith(href);

  return (
    <>
      {modal === "ai" && <AiNavModal onClose={() => setModal(null)} />}
      {modal === "app" && <AppDownloadModal onClose={() => setModal(null)} />}

      <nav
        className="fixed top-0 w-full z-50 py-3 px-6"
        style={{
          backgroundColor: scrollOpacity < 0.02 ? 'transparent' : `rgba(11,19,32,${scrollOpacity})`,
          backdropFilter: scrollOpacity > 0.15 ? `blur(${Math.min(scrollOpacity * 16, 12)}px)` : 'none',
          WebkitBackdropFilter: scrollOpacity > 0.15 ? `blur(${Math.min(scrollOpacity * 16, 12)}px)` : 'none',
          borderBottom: scrollOpacity > 0.15 ? `1px solid rgba(255,255,255,${scrollOpacity * 0.08})` : 'none',
          boxShadow: scrollOpacity > 0.35 ? `0 4px 24px rgba(0,0,0,${scrollOpacity * 0.25})` : 'none',
          transition: 'background-color 0.1s, box-shadow 0.2s',
        }}
      >
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">

          {/* Left: Logo + nav */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,221,221,0.5)]">
                <span className="material-symbols-outlined text-white">shield</span>
              </div>
              <span className="text-xl font-black tracking-tight text-white font-headline">
                VN<span className="text-cyan-400">TRUST</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-7 pt-0.5">
              {navLinks.map(({ key, href }) => (
                <Link key={href} href={href}
                  className={`text-[13px] font-bold font-headline tracking-widest transition-all uppercase pb-1 ${isActive(href) ? "text-white border-b-2 border-cyan-400 glow-text" : "text-blue-100/70 hover:text-white"}`}>
                  {t(key)}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Language toggle */}
            <button
              id="lang-toggle-btn"
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-xs font-black text-slate-200 hover:text-white hover:bg-white/20 transition border border-white/10 active:scale-95"
              title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
            >
              <span className="material-symbols-outlined text-[14px]">translate</span>
              {lang === "vi" ? "VI" : "EN"}
            </button>

            {/* Location toggle */}
            {isLoggedIn && (
              <button
                id="geo-toggle-btn"
                onClick={toggleGeo}
                title={geoEnabled ? "Tắt chia sẻ vị trí" : "Bật chia sẻ vị trí"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition border active:scale-95 ${
                  geoEnabled
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
                    : "bg-white/10 text-slate-400 border-white/10 hover:bg-white/20"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {geoEnabled ? "gps_fixed" : "gps_off"}
                </span>
                {geoEnabled ? "GPS" : "OFF"}
              </button>
            )}

            <button onClick={toggleTheme} title="Toggle Theme"
              className="w-9 h-9 flex items-center justify-center bg-white/10 rounded-full text-slate-200 hover:text-white hover:bg-white/20 transition border border-white/10 active:scale-95">
              <span className="material-symbols-outlined text-[16px] no-invert">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>

            {/* Notification bell — only shown when logged in */}
            {isLoggedIn && <NotificationBell />}

            <button onClick={() => setModal("ai")}
              className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold text-slate-200 hover:text-white hover:bg-white/15 transition border border-white/10 active:scale-95">
              <span className="material-symbols-outlined text-[15px] text-cyan-300">smart_toy</span>
              ASK AI
            </button>


            <button onClick={() => setModal("app")}
              className="flex items-center gap-2 bg-gradient-to-r from-[#e7d188] to-[#ceb059] text-[#2c2003] px-5 py-2 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(231,209,136,0.3)] hover:brightness-110 transition active:scale-95">
              APP DOWNLOAD
              <div className="flex gap-1 items-center ml-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" className="w-[13px] h-[13px]">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>android</span>
              </div>
            </button>
          </div>

          <button className="lg:hidden text-white" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>

        <style jsx>{`
          .glow-text { text-shadow: 0 0 10px rgba(0,255,255,0.6); }
        `}</style>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 pt-16" onClick={() => setMobileOpen(false)}>
          <div className="bg-[rgba(10,20,38,0.98)] backdrop-blur-xl border-b border-white/10 p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            {navLinks.map(({ key, href }) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)}
                className={`text-base font-bold tracking-widest uppercase py-2 border-b border-white/10 ${isActive(href) ? 'text-cyan-400' : 'text-slate-300 hover:text-white'
                  }`}>
                {t(key)}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModal('ai'); setMobileOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 bg-cyan-500/20 px-4 py-2.5 rounded-full text-sm font-bold text-cyan-300 border border-cyan-500/30">
                <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                AI Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
