"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChat } from "@/contexts/ChatContext";
import { useLogs } from "@/hooks/useLogs";

// Shared marker type (synced with VietnamMap)
type MapMarker = { id: number; name: string; country: string; lat: number; lon: number; scans: number; fake: number; type: string; color?: string; };
const SHOW_INTEGRATION_AND_STANDARDS_CARDS = false;

// ─── Live Clock (locale-aware, device local time) ──────────────────────────
const LANG_LOCALE: Record<string, string> = {
  vi: "vi-VN", en: "en-US", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", fr: "fr-FR",
};
function LiveClock({ lang }: { lang: string }) {
  const [time, setTime] = useState("");
  const locale = LANG_LOCALE[lang] || "en-US";
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, [locale]);
  return (
    <div style={{
      fontFamily: "'Outfit', monospace",
      fontWeight: 700,
      fontSize: 20,
      letterSpacing: "0.05em",
      color: "rgba(246,241,232,0.7)",
      minWidth: 54,
      textAlign: "right",
    }}>
      {time}
    </div>
  );
}

// ─── Smart Greeting (time-aware + i18n) ───────────────────────────────────────
function smartGreeting(lang: string): string {
  const h = new Date().getHours();
  if (lang === "en") {
    if (h < 12) return "Good morning,";
    if (h < 18) return "Good afternoon,";
    return "Good evening,";
  }
  if (lang === "zh") {
    if (h < 12) return "早上好，";
    if (h < 18) return "下午好，";
    return "晚上好，";
  }
  if (lang === "ja") {
    if (h < 12) return "おはようございます，";
    if (h < 18) return "こんにちは，";
    return "こんばんは，";
  }
  if (lang === "ko") {
    if (h < 12) return "안녕하세요 (아침)，";
    if (h < 18) return "안녕하세요 (오후)，";
    return "안녕하세요 (저녁)，";
  }
  if (lang === "fr") {
    if (h < 12) return "Bonjour,";
    if (h < 18) return "Bon après-midi,";
    return "Bonsoir,";
  }
  // vi (default)
  if (h < 12) return "Chào buổi sáng,";
  if (h < 18) return "Chào buổi chiều,";
  return "Chào buổi tối,";
}

// ─── Toast Notification ───────────────────────────────────────────────────────
type ToastType = "error" | "warning" | "success" | "info";
interface ToastItem { id: number; msg: string; type: ToastType; }

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const iconMap = { error: "error", warning: "warning", success: "check_circle", info: "info" };
  const colorMap = {
    error:   "bg-red-500/15 border-red-500/40 text-red-300",
    warning: "bg-[#C8A557]/15 border-[#C8A557]/40 text-amber-300",
    success: "bg-[#4A7C5C]/15 border-[#4A7C5C]/40 text-emerald-300",
    info:    "bg-[#C8A557]/15 border-[#C8A557]/40 text-cyan-300",
  };
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-xl text-sm font-semibold pointer-events-auto animate-in slide-in-from-bottom-4 duration-300 ${colorMap[t.type]}`}
        >
          <span className="material-symbols-outlined text-[18px]">{iconMap[t.type]}</span>
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 transition">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}

let _toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((msg: string, type: ToastType = "info") => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, show, dismiss };
}

// VietnamMap is client-only (react-simple-maps needs browser)
// Phase 1: switch to VietMapView (MapLibre GL + VietMap tiles)
const VietnamMap = dynamic(() => import("@/components/VietMapView"), { ssr: false });

// ─── AI Engine ────────────────────────────────────────────────────────────────
const RESPONSES: Array<{ match: RegExp; replies: string[] }> = [
  {
    match: /^(xin chào|hello|hi|chào|hey|alo)[\s!]*/i,
    replies: [
      "Chào bạn! 😊 Rất vui được gặp bạn hôm nay. Mình là AI của AI VeriGoods nha — bạn cần tra serial, kiểm tra lô hàng, hay hỏi gì khác không?",
      "Hey! 👋 Mình đây. Có gì cần giúp không bạn? Nhập số serial để mình check ngay, hoặc hỏi thoải mái nhé!",
      "Chào bạn nhé, mình là AI AI VeriGoods 🤖 Hôm nay bạn muốn mình hỗ trợ gì không?",
    ],
  },
  {
    match: /cảm ơn|thanks|thank you|ngon|tốt lắm|hay quá|giỏi/i,
    replies: [
      "Không có gì bạn ơi 😄 Giúp được bạn là mình vui rồi. Cần gì thêm cứ hỏi nha!",
      "Hehe, tất nhiên thôi! Đó là việc của mình mà 😎 Còn gì cần không?",
      "Oki! Lúc nào cũng sẵn sàng hỗ trợ bạn nhé 🙌",
    ],
  },
  {
    match: /\b([A-Z0-9]{6,})\b/i,
    replies: [], // handled separately
  },
  {
    match: /serial|mã|uid|qr|tem|quét|scan|số sê/i,
    replies: [
      "Bạn nhập thẳng số serial vào đây mình tra ngay nha! Ví dụ: EDG123456 hay gì đó tương tự 🔎",
      "Để mình giúp! Bạn gõ mã serial hoặc UID từ tem QR vào đây nhé, mình xử lý trong vài giây thôi 😊",
    ],
  },
  {
    match: /hàng giả|làm giả|giả mạo|fake|đáng ngờ|không chính hãng/i,
    replies: [
      "🚨 Ôi, nghe có vẻ nghiêm trọng đó! Bạn cho mình biết mã serial của sản phẩm được không? Mình kiểm tra ngay.\n\nHoặc nếu cần báo cáo khẩn, có thể:\n• Gọi: **1800 6789** (miễn phí 24/7)\n• Email: report@vntrust.vn\n• Bấm nút 113 trên Dashboard để báo nhanh",
      "Hmm, đáng lo đó! 😟 Bạn đang nghi ngờ sản phẩm nào? Cho mình mã serial, mình check xem có đăng ký trong hệ thống không nhé.",
    ],
  },
  {
    match: /sản phẩm|kho|lô hàng|inventory|thêm|đăng ký/i,
    replies: [
      "Để quản lý sản phẩm, bạn vào **Tài sản & Lô hàng** nhé 📦\n• Thêm sản phẩm → Hệ thống tạo mã QR ngay\n• Tạo lô hàng → Phân phối tem theo lô\n• Xem báo cáo quét realtime\n\nBạn đang cần làm bước nào?",
      "Thêm sản phẩm mới à? Dễ lắm! 😊 Vào **Kho hàng** → **Thêm sản phẩm** → Điền thông tin → Hệ thống tự sinh mã UID duy nhất. Bạn muốn mình hướng dẫn chi tiết hơn không?",
    ],
  },
  {
    match: /giá|chi phí|bao nhiêu|gói|plan|pricing|mất tiền/i,
    replies: [
      "Bạn hỏi về giá à? Mình mà tiết lộ hết thì ông chủ cho mình nghỉ mất 😄\n\nNhưng thực ra là:\n🟢 **Starter** — Miễn phí (100 SP, 500 QR/tháng)\n🔵 **Business** — 2.990.000₫/tháng (không giới hạn + AI reports)\n🟡 **Enterprise** — Liên hệ để được báo giá riêng\n\nBạn đang ở quy mô nào, mình tư vấn gói phù hợp cho?",
    ],
  },
  {
    match: /chuỗi cung ứng|supply chain|phân phối|bản đồ|logistics/i,
    replies: [
      "Chuỗi cung ứng của AI VeriGoods hiện đang theo dõi **4,821 điểm** trên toàn quốc 🗺️\n\nBạn có thể xem realtime:\n• Luồng hàng từ nhà máy → kho → điểm bán\n• Bản đồ nhiệt cảnh báo vùng hàng giả\n• Thống kê quét theo tỉnh thành\n\nVào **Chuỗi Cung ứng** trên menu để xem nhé! Hoặc bấm vào bản đồ bên phải để chọn tỉnh 😊",
    ],
  },
  {
    match: /bảo mật|hack|xâm nhập|lộ data|an toàn/i,
    replies: [
      "Bảo mật là ưu tiên số 1 của AI VeriGoods đó bạn! 🔐\n• Mã hóa AES-256 toàn bộ data\n• 2FA bắt buộc cho tài khoản doanh nghiệp\n• Blockchain không thể giả mạo\n• AI giám sát 24/7, phát hiện xâm nhập < 10 giây\n• Tuân thủ ISO/IEC 27001\n\nBạn muốn biết về chính sách bảo mật cụ thể nào không?",
    ],
  },
  {
    match: /app|ứng dụng|mobile|điện thoại|ios|android/i,
    replies: [
      "À, app AI VeriGoods Mobile thì xịn lắm đó! 📱\n• Quét QR bằng camera mà không cần nhập tay\n• Nhận thông báo ngay khi phát hiện hàng giả\n• Offline mode: cache data để dùng khi mất mạng\n\n**iOS**: App Store → 'AI VeriGoods'\n**Android**: Google Play → 'AI VeriGoods'\n\nHoặc bấm **APP DOWNLOAD** trên thanh đầu, mình sẽ mở link tải cho bạn!",
    ],
  },
  {
    match: /xuất|báo cáo|report|pdf|csv|export/i,
    replies: [
      "Xuất báo cáo thì dễ bạn ơi! 📊 Bấm nút **EXPORT OFFLINE REPORT** ở góc phải phía trên bản đồ, AI sẽ tổng hợp và tải file CSV về máy trong vài giây.\n\nFile bao gồm:\n• Thống kê quét 30 ngày\n• Danh sách cảnh báo hàng giả\n• Phân tích theo vùng\n\nBạn cần thêm thông tin gì trong báo cáo không?",
    ],
  },
  {
    match: /liên hệ|support|hỗ trợ|hotline|điện thoại|gọi|email/i,
    replies: [
      "Bạn cần liên hệ thì mình kết nối ngay nha! 📞\n• **Hotline**: 1800 6789 (miễn phí, 24/7)\n• **Email**: support@vntrust.vn\n• **Zalo**: zalo.me/vntrust\n• **Địa chỉ**: 123 Nguyễn Huệ, Q1, TP.HCM\n\nHoặc bấm **ĐƯỜNG DÂY NÓNG 24/7** ở góc phải Dashboard, mình hiện số điện thoại theo khu vực của bạn 😊",
    ],
  },
];

const FALLBACK = [
  "Hmm, mình chưa hiểu câu đó lắm 🤔 Bạn có thể nói rõ hơn không? Hoặc nhập số serial để mình tra cứu ngay nha!",
  "Câu hỏi thú vị đó! Nhưng mình cần thêm thông tin xíu. Bạn đang hỏi về: sản phẩm cụ thể, hay về cách dùng hệ thống, hay về giá cả?",
  "Haha, mình AI thôi nên đôi khi không hiểu hết 😄 Bạn thử hỏi theo cách khác, hoặc nhập thẳng số serial để mình check nhanh nhé!",
  "Ừm... mình nghĩ bạn đang hỏi về điều gì đó rất hay, nhưng mình cần thêm context xíu. Bạn có thể nói cụ thể hơn không? 😊",
];

function getAIReply(q: string): string {
  const serialMatch = q.match(/\b([A-Z0-9]{6,})\b/i);
  if (serialMatch) {
    const s = serialMatch[1].toUpperCase();
    const found = Math.random() > 0.25;
    if (found) return `🔍 Xong rồi! Mình tìm thấy mã **${s}** trong database nhé!\n\n✅ Kết quả: **Chính hãng**\n📦 Sản phẩm: Nước mắm Phú Quốc 35N\n🏭 NSX: Công ty Thực phẩm Phú Quốc\n📅 SX: 01/03/2026 · HSD: 01/03/2028\n📍 Phân phối: Khu vực Miền Nam\n\nBạn muốn xem trang xác thực đầy đủ tại **/verify/${s}** không?`;
    return `⚠️ Ồ, mã **${s}** không có trong hệ thống đó bạn!\n\nCó thể là:\n• Sản phẩm chưa được đăng ký với AI VeriGoods\n• Mã bị nhập sai hoặc tem hỏng\n• **Nguy hiểm: Đây có thể là hàng giả!**\n\nBạn muốn mình báo cáo sản phẩm này không? Mình kết nối với đội bảo mật ngay!`;
  }

  for (const rule of RESPONSES) {
    if (rule.replies.length > 0 && rule.match.test(q)) {
      return rule.replies[Math.floor(Math.random() * rule.replies.length)];
    }
  }
  return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
function ModalWrapper({ onClose, title, icon, iconColor, children }: {
  onClose: () => void; title: string; icon: string; iconColor: string; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] glass-panel border border-white/20 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconColor} flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-white">{icon}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white font-display truncate">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition shrink-0">
            <span className="material-symbols-outlined text-white text-[18px]">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── AI Chat Modal (full) ─────────────────────────────────────────────────────
function AiChatModal({ msgs, addMsg, onClose }: {
  msgs: {from: string, text: string}[];
  addMsg: (msg: {from: string, text: string}) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const send = async () => {
    const q = input.trim();
    if (!q || typing) return;
    if (q.length > 500) { return; } // handled by char counter in UI
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
          const statusText = data.status === "genuine" ? "✅ Chính hãng" : data.status === "expired" ? "⏰ Đã hết hạn" : "⚠️ Nghi ngờ làm giả";
          reply = `🔍 Xong rồi! Mình tìm thấy mã **${serial.toUpperCase()}**\n${statusText}\n📦 Sản phẩm: ${sp?.tenSanPham ?? "N/A"}\n🏭 NSX: ${sp?.doanhNghiep?.tenDoanhNghiep ?? "N/A"}\n📅 SX: ${lo?.ngaySanXuat ? new Date(lo.ngaySanXuat).toLocaleDateString("vi-VN") : "N/A"} · HSD: ${lo?.hanDung ? new Date(lo.hanDung).toLocaleDateString("vi-VN") : "N/A"}\n\nXem chi tiết tại /verify/${serial.toUpperCase()}`;
        } else {
          reply = `⚠️ Mã **${serial.toUpperCase()}** không có trong hệ thống!\n\nCó thể là:\n• Sản phẩm chưa đăng ký AI VeriGoods\n• Mã bị nhập sai hoặc tem hỏng\n• **Nguy hiểm: Có thể là hàng giả!**`;
        }
      } catch {
        reply = "⚠️ Không thể kết nối hệ thống xác thực. Vui lòng thử lại sau.";
      }
    } else {
      reply = getAIReply(q);
    }

    setTimeout(() => { addMsg({ from: "ai", text: reply }); setTyping(false); }, 700 + Math.random() * 500);
  };


  const quickBtns = ["Cách tra mã QR?", "Báo cáo hàng giả", "Giá dịch vụ", "Liên hệ hỗ trợ", "Hướng dẫn dùng app"];

  return (
    <ModalWrapper onClose={onClose} title="Trợ lý AI AI VeriGoods" icon="smart_toy" iconColor="bg-[#C8A557]">
      <div className="flex flex-col h-[calc(100dvh-9rem)] min-h-[320px] max-h-[480px] sm:h-[480px]">
        <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-1">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 ${m.from === "ai" ? "bg-[#C8A557]" : "bg-slate-600"}`}>
                <span className="material-symbols-outlined text-white text-[13px]">{m.from === "ai" ? "smart_toy" : "person"}</span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[82%] whitespace-pre-wrap break-words leading-relaxed overflow-hidden min-w-0 ${m.from === "ai" ? "bg-white/10 text-white rounded-tl-none" : "bg-[#C8A557] text-white rounded-tr-none"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-[#C8A557] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-[13px]">smart_toy</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/10 flex gap-1.5 items-center">
                {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-white/10 overflow-x-auto pb-1 shrink-0">
          {quickBtns.map(q => (
            <button key={q} onClick={() => setInput(q)}
              className="text-[10px] font-bold px-3 py-1.5 bg-white/8 rounded-full text-slate-300 hover:bg-white/15 hover:text-white transition border border-white/10 whitespace-nowrap shrink-0">
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2 shrink-0">
          <input
            className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none focus:border-[#C8A557] transition"
            placeholder="Chat với AI AI VeriGoods..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()} />
          <button onClick={send} disabled={typing}
            className="w-10 h-10 rounded-full bg-[#C8A557] flex items-center justify-center hover:bg-[#C8A557] transition shrink-0 disabled:opacity-40">
            <span className="material-symbols-outlined text-white text-[18px]">send</span>
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ─── Other Modals ─────────────────────────────────────────────────────────────
function ExportReportModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  const doExport = async () => {
    setState("loading");
    try {
      const [ovRes, scanRes] = await Promise.all([
        fetch(`/api/analytics?type=overview&period=${period}`),
        fetch(`/api/analytics?type=scan_stats&period=${period}`),
      ]);
      const [ov, sc] = await Promise.all([ovRes.json(), scanRes.json()]);
      const now = new Date().toLocaleDateString("vi-VN");
      const periodLabel = period === "week" ? "7 ngày" : period === "month" ? "30 ngày" : "3 tháng";
      const genuine = ov.totalScans - ov.totalFake;
      const integrity = ov.totalScans > 0 ? (100 - parseFloat(ov.fakeRate)).toFixed(1) : "100.0";

      const rows = [
        `BÁO CÁO AI VERIGOODS - AI SUMMARY`,
        `Ngày xuất: ${now} · Kỳ báo cáo: ${periodLabel}`,
        ``,
        `Chỉ số,Giá trị`,
        `Tổng lượt quét,${ov.totalScans.toLocaleString()}`,
        `Chính hãng,${genuine.toLocaleString()}`,
        `Nghi ngờ/Giả,${ov.totalFake.toLocaleString()}`,
        `Tỷ lệ hàng giả,${ov.fakeRate}%`,
        `Cảnh báo mở,${ov.openAlerts}`,
        `Toàn vẹn chuỗi,${integrity}%`,
        `Tổng sản phẩm,${ov.totalProducts}`,
        `Tổng lô hàng,${ov.totalBatches}`,
        `Tổng tem QR,${ov.totalQR.toLocaleString()}`,
        `Lô sắp hết hạn (30 ngày),${ov.expiringSoon}`,
        ``,
        `Top sản phẩm được quét nhiều nhất,Lượt quét`,
        ...(sc.topProducts || []).slice(0, 10).map((p: any) =>
          `"${p.loHang?.sanPham?.ten ?? "N/A"} (${p.loHang?.sanPham?.maSKU ?? "-"})",${p.soLanQuet}`
        ),
        ``,
        `Xu hướng quét 7 ngày,Số lượt`,
        ...(sc.scanTrend || []).map((d: any) => `${d.date},${d.count}`),
      ];

      const csv = rows.join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: `AIVeriGoods_BaoCao_${periodLabel.replace(/ /g, "_")}_${now.replace(/\//g, "-")}.csv`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setState("done");
    } catch {
      setState("idle");
    }
  };

  return (
    <ModalWrapper onClose={onClose} title="Xuất Báo cáo AI" icon="summarize" iconColor="bg-[#C8A557]">
      <div className="space-y-3 mb-5">
        {["Tóm tắt hoạt động theo kỳ", "Thống kê lượt quét thực tế", "Top sản phẩm được quét", "Xu hướng 7 ngày"].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="material-symbols-outlined text-[#6FB585] text-[18px]">check_circle</span>
            <span className="text-sm text-slate-200">{i}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {(["week", "month", "quarter"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
              period === p ? "bg-[#C8A557] text-white border-[#C8A557]" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}>
            {p === "week" ? "7 ngày" : p === "month" ? "30 ngày" : "3 tháng"}
          </button>
        ))}
      </div>
      {state === "done" ? (
        <div className="text-center p-4 bg-[#4A7C5C]/15 border border-[#4A7C5C]/30 rounded-2xl">
          <span className="material-symbols-outlined text-4xl text-[#6FB585]">task_alt</span>
          <p className="text-[#6FB585] font-bold mt-1">File CSV đã được tải về máy!</p>
          <button onClick={doExport} className="mt-2 text-xs text-[#C8A557] underline">Tải lại</button>
        </div>
      ) : (
        <button onClick={doExport} disabled={state === "loading"}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#C8A557] hover:bg-[#C8A557] rounded-xl text-white font-bold text-sm transition disabled:opacity-70">
          {state === "loading" ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang tạo báo cáo...</> : <><span className="material-symbols-outlined text-[18px]">download</span> Xuất CSV thực tế</>}
        </button>
      )}
    </ModalWrapper>
  );
}

function SecurityModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalWrapper onClose={onClose} title="Chuyên gia Bảo mật" icon="shield_person" iconColor="bg-[#4A7C5C]">
      <div className="space-y-3 mb-5">
        {[{ name: "Nguyễn Văn An", role: "Chuyên gia chống giả cấp cao", status: "online" }, { name: "Trần Thị Bình", role: "Phân tích chuỗi cung ứng", status: "online" }, { name: "Lê Minh Cường", role: "Kỹ thuật xác thực AI", status: "busy" }].map((ex, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6FB585] to-[#E4D2A1] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
            <div className="flex-1"><p className="font-bold text-white text-sm">{ex.name}</p><p className="text-[10px] text-slate-400">{ex.role}</p></div>
            <span className={`w-2.5 h-2.5 rounded-full ${ex.status === "online" ? "bg-[#4A7C5C]" : "bg-[#C8A557]"}`}></span>
          </div>
        ))}
      </div>
      <Link href="/dashboard/security" onClick={onClose} className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A7C5C]/20 border border-[#4A7C5C]/30 rounded-xl text-[#6FB585] font-bold text-sm hover:bg-[#4A7C5C]/30 transition">
        <span className="material-symbols-outlined text-[18px]">security</span> Mở trang Bảo mật
      </Link>
    </ModalWrapper>
  );
}

function HotlineModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalWrapper onClose={onClose} title="Đường dây Nóng 24/7" icon="call" iconColor="bg-[#C8A557]">
      <div className="space-y-3 mb-4">
        {[{ area: "TP. Hồ Chí Minh", number: "1800 6789", online: true }, { area: "Hà Nội", number: "1800 1234", online: true }, { area: "Đà Nẵng & Miền Trung", number: "1800 4567", online: false }, { area: "Cần Thơ & Tây Nam Bộ", number: "1900 8888", online: true }].map((h, i) => (
          <a key={i} href={`tel:${h.number.replace(/\s/g, "")}`} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#C8A557]/40 transition group">
            <div className="w-10 h-10 rounded-full bg-[#C8A557]/20 flex items-center justify-center group-hover:bg-[#C8A557] transition shrink-0">
              <span className="material-symbols-outlined text-[#C8A557] group-hover:text-white text-[18px]">phone_in_talk</span>
            </div>
            <div className="flex-1"><p className="text-[10px] text-slate-400">{h.area}</p><p className="font-black text-white font-display">{h.number}</p></div>
            <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${h.online ? "text-[#6FB585] bg-[#4A7C5C]/15 border-[#4A7C5C]/20" : "text-slate-400 bg-white/5 border-white/10"}`}>{h.online ? "ONLINE" : "Offline"}</span>
          </a>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">Miễn phí · 24 giờ · 7 ngày / tuần</p>
    </ModalWrapper>
  );
}

function MapDetailModal({ marker, onClose }: { marker: MapMarker; onClose: () => void }) {
  const { t } = useLanguage();
  const typeLabel = marker.type === "hot" ? t("sc_hotspot") : marker.type === "warning" ? t("sc_tracking") : t("sc_normal");
  const typeColor = marker.type === "hot" ? "text-[#C8A557]" : marker.type === "warning" ? "text-orange-400" : "text-[#6FB585]";
  const typeBg = marker.type === "hot" ? "bg-[#C8A557]/10 border-[#C8A557]/30" : marker.type === "warning" ? "bg-orange-500/10 border-orange-500/30" : "bg-[#4A7C5C]/10 border-[#4A7C5C]/30";
  return (
    <ModalWrapper onClose={onClose} title={marker.name} icon="language" iconColor={marker.type === 'hot' ? 'bg-[#C8A557]' : marker.type === 'warning' ? 'bg-orange-500' : 'bg-[#4A7C5C]'}>
      <p className="text-slate-400 text-xs mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[14px]">location_on</span> {marker.country}
        <span className={`ml-auto font-bold text-[10px] px-2 py-0.5 rounded-full border ${typeBg} ${typeColor}`}>{typeLabel}</span>
      </p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <p className="text-xl font-black text-[#C8A557]">{marker.scans.toLocaleString()}</p>
          <p className="text-[9px] text-slate-400 mt-1">Lượt quét</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <p className={`text-xl font-black ${marker.fake > 0 ? "text-[#C8A557]" : "text-[#6FB585]"}`}>{marker.fake}</p>
          <p className="text-[9px] text-slate-400 mt-1">Hàng giả</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <p className="text-xl font-black text-blue-300">
            {marker.scans > 0
              ? `${((marker.scans - marker.fake) / marker.scans * 100).toFixed(1)}%`
              : '—'}
          </p>
          <p className="text-[9px] text-slate-400 mt-1">Toàn vẹn</p>
        </div>
      </div>
      {/* Hint khi chưa có scan data thực tế tại tỉnh này */}
      {marker.scans === 0 && marker.fake === 0 && (
        <div className="p-4 bg-[#C8A557]/5 border border-[#C8A557]/20 rounded-2xl mb-4">
          <p className="text-slate-400 text-xs flex items-start gap-2 leading-relaxed">
            <span className="material-symbols-outlined text-[16px] text-[#C8A557] shrink-0 mt-0.5">info</span>
            <span>
              Chưa có dữ liệu quét thực tế tại <strong className="text-slate-300">{marker.name}</strong>.
              Số liệu sẽ cập nhật khi người tiêu dùng quét QR sản phẩm trong khu vực này.
            </span>
          </p>
        </div>
      )}
      {marker.fake > 0 && (
        <div className={`p-4 ${typeBg} border rounded-2xl mb-4`}>
          <p className={`${typeColor} font-bold text-sm flex items-center gap-2`}>
            <span className="material-symbols-outlined text-[18px]">warning</span> Cảnh báo hàng giả
          </p>
          <p className="text-slate-300 text-xs mt-1">Phát hiện {marker.fake} sản phẩm nghi vấn tại <strong>{marker.name}</strong> trong 30 ngày qua.</p>
        </div>
      )}
      <Link href="/supply-chain" onClick={onClose} className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A7C5C]/20 border border-[#4A7C5C]/30 rounded-xl text-[#6FB585] font-bold text-sm hover:bg-[#4A7C5C]/30 transition">
        <span className="material-symbols-outlined text-[18px]">open_in_new</span> Mở bản đồ phân phối
      </Link>
    </ModalWrapper>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
type ModalType = "ai" | "report" | "security" | "hotline" | null;

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [modal, setModal] = useState<ModalType>(null);
  const [globeMarker, setGlobeMarker] = useState<MapMarker | null>(null);
  const [searchVal, setSearchVal] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [ipInfo, setIpInfo] = useState<{ ip: string; city: string; country: string; lat?: number; lon?: number; source?: string } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle'|'loading'|'ok'|'denied'|'unavailable'>('idle');
  // Khung "Vị trí xác thực lần cuối" — default mở (card luôn hiện, đã đặt dưới map nên không đè)
  const [locCardOpen, setLocCardOpen] = useState(true);
  // Live stats cho mobile manufacturer overview (đồng bộ với /api/dashboard/stats)
  const [mfgStats, setMfgStats] = useState<{
    totalScans: number;
    genuineScans: number;
    suspectScans: number;
    fakeAttempts: number;
    totalBatches: number;
    openAlerts: number;
    integrityScore: string;
    recentAlerts: Array<{ id: string; loai: string; moTa: string; mucDo: string; thoiGian: string }>;
  } | null>(null);
  const { msgs: chatMsgs, addMsg: addChatMsg } = useChat();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { logs } = useLogs();
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  useEffect(() => {
    const readCookie = (n: string) =>
      document.cookie.split("; ").find(r => r.startsWith(n + "="))?.split("=")[1];

    let role = localStorage.getItem("userRole");
    let name = localStorage.getItem("userName");

    // Fallback sang cookie (nguồn xác thực thật — khớp middleware) khi localStorage trống
    // nhưng cookie phiên vẫn còn. Nếu thiếu bước này sẽ xảy ra vòng lặp redirect
    // /login ↔ /dashboard gây "nháy màn hình liên tục": trang login điều hướng dựa trên
    // cookie, còn dashboard lại dựa trên localStorage (vd: đăng nhập VNeID chỉ set cookie
    // phía server, hoặc localStorage bị xoá nhưng cookie phiên chưa hết hạn).
    if (!role) {
      const cookieRole = readCookie("userRole");
      if (cookieRole) {
        role = decodeURIComponent(cookieRole);
        const cookieName = readCookie("userName");
        name = cookieName ? decodeURIComponent(cookieName) : name;
        // Hydrate lại localStorage để các trang khác hoạt động bình thường
        localStorage.setItem("userRole", role);
        if (name) localStorage.setItem("userName", name);
        const dnId = readCookie("doanhNghiepId");
        if (dnId) localStorage.setItem("doanhNghiepId", decodeURIComponent(dnId));
      }
    }

    if (!role) {
      router.replace("/login");
    } else if (role === "admin") {
      // Admin dùng Admin Console riêng (/admin)
      router.replace("/admin");
    } else {
      setUserRole(role);
      if (name) setUserName(name);
      setMounted(true);
    }
  }, [router]);

  // Fetch live stats từ /api/dashboard/stats (cho mobile manufacturer overview)
  useEffect(() => {
    if (!mounted || userRole !== "manufacturer") return;
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const r = await fetch("/api/dashboard/stats", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled) setMfgStats(data);
      } catch { /* silent — UI sẽ hiện 0 */ }
    };
    fetchStats();
    // Refresh mỗi 60s để số liệu live
    const interval = setInterval(fetchStats, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [mounted, userRole]);

  // Lấy vị trí: ưu tiên GPS thật, fallback về IP — hỗ trợ nút toggle GPS
  useEffect(() => {
    // Xóa cache cũ (không có version hoặc version cũ)
    const GEO_VER = "v4";
    const cachedRaw = sessionStorage.getItem("vntrust_geo");
    if (cachedRaw) {
      try {
        const p = JSON.parse(cachedRaw);
        if (p._v !== GEO_VER) sessionStorage.removeItem("vntrust_geo");
      } catch { sessionStorage.removeItem("vntrust_geo"); }
    }

    const doFetchGeo = async () => {
      const geoEnabled = localStorage.getItem("geo_enabled") !== "0";
      if (!geoEnabled) { setIpInfo(null); return; }

      // Chỉ dùng cache GPS mới (v4) — không dùng cache IP (IP hay sai vị trí)
      const cached = sessionStorage.getItem("vntrust_geo");
      if (cached) {
        try {
          const p = JSON.parse(cached);
          if (p.source === "gps" && p._v === GEO_VER) { setIpInfo(p); return; }
          else sessionStorage.removeItem("vntrust_geo");
        } catch { sessionStorage.removeItem("vntrust_geo"); }
      }

      const getGpsCity = async (lat: number, lng: number): Promise<string> => {
        try {
          const url = "https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lng + "&format=json";
          const r = await fetch(url, { headers: { "Accept-Language": "vi" } });
          const geo = await r.json();
          const addr = geo.address || {};
          // Ưu tiên địa danh cụ thể nhất: suburb > quarter > city_district > city > town
          return addr.suburb || addr.quarter || addr.city_district || addr.neighbourhood ||
                 addr.city || addr.town || addr.village || addr.county || addr.state || "GPS";
        } catch { return "GPS"; }
      };



      const tryIpFallback = async () => {
        try {
          const r = await fetch("/api/ip");
          const d = await r.json();
          if (d.ip) {
            const info = { ip: d.ip, city: d.city || "Không xác định", country: d.country || "VN", lat: d.lat || null, lon: d.lon || null, source: "ip" as const };
            setIpInfo(info);
            // Không cache IP — mỗi lần load sẽ ưu tiên thử GPS trước
          }
        } catch {}
      };

      // LUÔN thử GPS khi toggle bật
      let permDenied = false;
      let permGranted = false;
      try {
        if (navigator.permissions) {
          const perm = await navigator.permissions.query({ name: "geolocation" });
          permDenied = perm.state === "denied";
          permGranted = perm.state === "granted";
        }
      } catch {}

      if (permDenied) {
        setGpsStatus("denied");
        await tryIpFallback();
        return;
      }

      // Kiểm tra HTTPS — GPS API chỉ hoạt động trên secure context
      const isSecure = typeof window !== "undefined" && (window.location.protocol === "https:" || window.location.hostname === "localhost");
      if (!isSecure) {
        setGpsStatus("unavailable");
        await tryIpFallback();
        return;
      }

      setGpsStatus("loading");
      localStorage.setItem("geo_asked", "1");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const city = await getGpsCity(lat, lng);
          let ip = "GPS";
          try { const r = await fetch("/api/ip"); const d = await r.json(); ip = d.ip || "GPS"; } catch {}
          const info = { ip, city, country: "VN", lat, lon: lng, source: "gps" as const, _v: GEO_VER };
          setIpInfo(info);
          setGpsStatus("ok");
          sessionStorage.setItem("vntrust_geo", JSON.stringify(info));
        },
        async (err) => {
          // PERMISSION_DENIED = 1, POSITION_UNAVAILABLE = 2, TIMEOUT = 3
          if (err.code === 1) setGpsStatus("denied");
          else setGpsStatus("unavailable");
          await tryIpFallback();
        },
        { timeout: 12000, maximumAge: 30000, enableHighAccuracy: true }
      );
    };

    doFetchGeo();

    const onToggle = (e: Event) => {
      const ce = e as CustomEvent<{ enabled: boolean }>;
      sessionStorage.removeItem("vntrust_geo");
      if (ce.detail.enabled) { setGpsStatus("idle"); doFetchGeo(); }
      else { setIpInfo(null); setGpsStatus("idle"); }
    };
    window.addEventListener("vntrust_geo_toggle", onToggle);
    return () => window.removeEventListener("vntrust_geo_toggle", onToggle);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) router.push(`/verify/${searchVal.trim()}`);
  };

  if (!mounted || !userRole) return null;

  const roleLabel = userRole === "admin" ? t("role_admin") : (userRole === "manufacturer" || userRole === "importer") ? t("role_mfr") : userRole === "authority" ? "Cơ quan chức năng" : t("role_consumer");

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {modal === "ai"       && <AiChatModal      msgs={chatMsgs} addMsg={addChatMsg} onClose={() => setModal(null)} />}
      {modal === "report"   && <ExportReportModal onClose={() => setModal(null)} />}
      {modal === "security" && <SecurityModal     onClose={() => setModal(null)} />}
      {modal === "hotline"  && <HotlineModal      onClose={() => setModal(null)} />}
      {globeMarker          && <MapDetailModal    marker={globeMarker} onClose={() => setGlobeMarker(null)} />}

      <div className="min-h-[calc(100vh-80px)] w-full relative overflow-hidden flex flex-col p-3 sm:p-4 md:p-8 xl:p-12 mb-16 max-w-[1600px] mx-auto">
        {/* Gold radial glow — đồng bộ với trang login */}
        <div className="fixed inset-0 pointer-events-none z-0"
             style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,165,87,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(200,165,87,0.08) 0%, transparent 60%)" }} />
        {/* Subtle gold grid overlay — đồng bộ với trang login */}
        <div className="fixed inset-0 pointer-events-none z-0"
             style={{
               backgroundImage: "linear-gradient(rgba(200,165,87,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(200,165,87,0.025) 1px, transparent 1px)",
               backgroundSize: "60px 60px",
               WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 80%)",
               maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 80%)",
             }} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12 relative z-10 w-full h-full flex-1">

          {/* ── LEFT ── */}
          <div className="xl:col-span-6 flex flex-col gap-6">
            {/* ── MANUFACTURER MOBILE OVERRIDE ── */}
            {userRole === 'manufacturer' && (
              <div className="xl:hidden flex flex-col gap-5 mt-2 mb-4 animate-fade-in">
                 {/* Top user bar */}
                 <div className="flex justify-between items-center bg-[#0B1623]/80 rounded-3xl p-4 border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-full bg-[#4A7C5C]/20 text-[#6FB585] flex items-center justify-center font-bold text-xl border border-[#4A7C5C]/30">
                          {userName ? userName.charAt(0).toUpperCase() : 'M'}
                       </div>
                       <div>
                           <div className="text-xs text-slate-400">{smartGreeting(lang)}</div>
                          <div className="text-base font-bold text-white tracking-wide">{userName || 'Nhà sản xuất'}</div>
                       </div>
                    </div>
                     <LiveClock lang={lang} />
                 </div>

                 {/* Hero Card — live data from /api/dashboard/stats */}
                 <div className="relative rounded-[2rem] p-6 border border-[#C8A557]/30 overflow-hidden shadow-xl" style={{ background: 'linear-gradient(145deg, rgba(200,165,87,0.15) 0%, rgba(200,165,87,0.02) 100%)' }}>
                   <div className="relative z-10 flex justify-between items-start mb-8">
                     <div>
                       <div className="text-[11px] text-amber-200/80 mb-2 font-bold tracking-widest uppercase">{lang === 'en' ? 'Total scans' : 'Tổng lượt quét'}</div>
                       <div className="text-5xl font-black text-white font-display">
                         {mfgStats ? mfgStats.totalScans.toLocaleString('vi-VN') : '—'}
                         <span className="text-base text-slate-400 font-normal ml-1 tracking-normal">{lang === 'en' ? 'scans' : 'lần'}</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-1 text-[#6FB585] bg-[#4A7C5C]/20 px-2.5 py-1.5 rounded-full text-xs font-bold border border-[#4A7C5C]/30">
                       <span className="material-symbols-outlined text-[14px]">verified</span>
                       {mfgStats ? `${mfgStats.integrityScore}%` : '—'}
                     </div>
                   </div>
                   {/* Decorative Chart SVG */}
                   <svg className="absolute bottom-0 left-0 w-full h-20 opacity-70" viewBox="0 0 280 50" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C8A557" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#C8A557" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 40 L20 35 L40 38 L60 28 L80 32 L100 22 L120 26 L140 18 L160 24 L180 14 L200 18 L220 10 L240 14 L260 6 L280 12 L280 50 L0 50 Z" fill="url(#goldGrad)" />
                      <path d="M0 40 L20 35 L40 38 L60 28 L80 32 L100 22 L120 26 L140 18 L160 24 L180 14 L200 18 L220 10 L240 14 L260 6 L280 12" stroke="#C8A557" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="280" cy="12" r="3" fill="#C8A557" />
                   </svg>
                 </div>

                 {/* Stats Grid — live data */}
                 <div className="grid grid-cols-2 gap-4">
                   <div className="glass-card rounded-3xl p-5 border border-[#4A7C5C]/20 flex flex-col justify-between">
                     <div className="w-10 h-10 rounded-full bg-[#4A7C5C]/20 text-[#6FB585] flex items-center justify-center mb-4">
                       <span className="material-symbols-outlined text-[20px]">verified</span>
                     </div>
                     <div>
                       <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">{lang === 'en' ? 'Genuine' : 'Chính hãng'}</div>
                       <div className="text-2xl font-bold text-white mb-1">{mfgStats ? `${mfgStats.integrityScore}%` : '—'}</div>
                       <div className="text-[10px] text-[#6FB585] font-bold">{mfgStats ? `${mfgStats.genuineScans.toLocaleString('vi-VN')} ${lang === 'en' ? 'scans' : 'lượt'}` : '—'}</div>
                     </div>
                   </div>
                   <div className="glass-card rounded-3xl p-5 border border-red-500/20 flex flex-col justify-between">
                     <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                       <span className="material-symbols-outlined text-[20px]">gpp_bad</span>
                     </div>
                     <div>
                       <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">{lang === 'en' ? 'Fake attempts' : 'UID nghi giả'}</div>
                       <div className="text-2xl font-bold text-white mb-1">{mfgStats ? mfgStats.fakeAttempts.toLocaleString('vi-VN') : '—'}</div>
                       <div className="text-[10px] text-red-400 font-bold">
                         {mfgStats && mfgStats.suspectScans > 0
                           ? `+${mfgStats.suspectScans} ${lang === 'en' ? 'suspect' : 'nghi vấn'}`
                           : (lang === 'en' ? 'No issues' : 'Chưa có')}
                       </div>
                     </div>
                   </div>
                   <div className="glass-card rounded-3xl p-5 border border-[#C8A557]/20 flex flex-col justify-between">
                     <div className="w-10 h-10 rounded-full bg-[#C8A557]/20 text-[#C8A557] flex items-center justify-center mb-4">
                       <span className="material-symbols-outlined text-[20px]">warning</span>
                     </div>
                     <div>
                       <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">{lang === 'en' ? 'Open alerts' : 'Cảnh báo mở'}</div>
                       <div className="text-2xl font-bold text-white mb-1">{mfgStats ? mfgStats.openAlerts.toLocaleString('vi-VN') : '—'}</div>
                       <div className="text-[10px] text-[#C8A557] font-bold">
                         {mfgStats && mfgStats.openAlerts > 0
                           ? (lang === 'en' ? 'Need review' : 'Cần xử lý')
                           : (lang === 'en' ? 'All clear' : 'Sạch')}
                       </div>
                     </div>
                   </div>
                   <div className="glass-card rounded-3xl p-5 border border-[#C8A557]/20 flex flex-col justify-between">
                     <div className="w-10 h-10 rounded-full bg-[#C8A557]/20 text-[#C8A557] flex items-center justify-center mb-4">
                       <span className="material-symbols-outlined text-[20px]">qr_code</span>
                     </div>
                     <div>
                       <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">{lang === 'en' ? 'Total batches' : 'Tổng số lô'}</div>
                       <div className="text-2xl font-bold text-white mb-1">{mfgStats ? mfgStats.totalBatches.toLocaleString('vi-VN') : '—'}</div>
                       <div className="text-[10px] text-slate-400 font-bold">
                         {mfgStats ? `${mfgStats.totalScans.toLocaleString('vi-VN')} ${lang === 'en' ? 'scans' : 'lượt quét'}` : '—'}
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Recent Alerts — live data */}
                 <div className="mt-4">
                    <div className="flex justify-between items-center mb-4 px-1">
                       <h3 className="text-base font-bold text-white uppercase tracking-widest">{lang === 'en' ? 'Recent alerts' : 'Cảnh báo gần đây'}</h3>
                       <Link href="/dashboard/alerts" className="text-[11px] font-bold text-[#C8A557] flex items-center hover:underline">
                         {lang === 'en' ? 'View all' : 'Xem tất cả'} <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                       </Link>
                    </div>
                    <div className="space-y-3">
                       {!mfgStats && (
                         <div className="glass-panel p-4 rounded-[1.25rem] text-center text-xs text-slate-500">{lang === 'en' ? 'Loading…' : 'Đang tải…'}</div>
                       )}
                       {mfgStats && mfgStats.recentAlerts.length === 0 && (
                         <div className="glass-panel p-4 rounded-[1.25rem] flex items-center gap-3 border-l-4 border-l-[#6FB585] bg-white/5">
                           <div className="w-10 h-10 rounded-full bg-[#4A7C5C]/20 flex items-center justify-center shrink-0">
                             <span className="material-symbols-outlined text-[#6FB585] text-[20px]">check_circle</span>
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="text-sm font-bold text-white mb-0.5">{lang === 'en' ? 'No open alerts' : 'Không có cảnh báo mở'}</div>
                             <div className="text-xs text-slate-400">{lang === 'en' ? 'System running normally' : 'Hệ thống vận hành bình thường'}</div>
                           </div>
                         </div>
                       )}
                       {mfgStats?.recentAlerts.slice(0, 3).map((a) => {
                         const mucDoColor =
                           a.mucDo === 'high' ? { border: 'border-l-red-500', bg: 'bg-red-500/20', text: 'text-red-400' } :
                           a.mucDo === 'medium' ? { border: 'border-l-amber-500', bg: 'bg-[#C8A557]/20', text: 'text-[#C8A557]' } :
                           { border: 'border-l-slate-500', bg: 'bg-slate-500/20', text: 'text-slate-300' };
                         const icon = a.loai?.includes('FAKE') ? 'gpp_bad' :
                                      a.loai?.includes('ANOMALY') ? 'report' :
                                      a.loai?.includes('LOCATION') ? 'location_off' :
                                      a.loai?.includes('EXPIRED') ? 'event_busy' : 'warning';
                         // Format thời gian tương đối
                         const ago = (() => {
                           try {
                             const diff = Date.now() - new Date(a.thoiGian).getTime();
                             const m = Math.floor(diff / 60000);
                             if (m < 1) return lang === 'en' ? 'Just now' : 'Vừa xong';
                             if (m < 60) return lang === 'en' ? `${m}m ago` : `${m}p trước`;
                             const h = Math.floor(m / 60);
                             if (h < 24) return lang === 'en' ? `${h}h ago` : `${h}h trước`;
                             const d = Math.floor(h / 24);
                             return lang === 'en' ? `${d}d ago` : `${d}n trước`;
                           } catch { return ''; }
                         })();
                         return (
                           <Link key={a.id} href="/dashboard/alerts" className={`glass-panel p-4 rounded-[1.25rem] flex items-center gap-4 border-l-4 ${mucDoColor.border} bg-white/5 hover:bg-white/10 transition no-underline`}>
                             <div className={`w-10 h-10 rounded-full ${mucDoColor.bg} flex items-center justify-center shrink-0`}>
                               <span className={`material-symbols-outlined ${mucDoColor.text} text-[20px]`}>{icon}</span>
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="text-sm font-bold text-white truncate mb-0.5">{a.loai?.replace(/_/g, ' ') || 'Cảnh báo'}</div>
                               <div className="text-xs text-slate-400 truncate">{a.moTa}</div>
                             </div>
                             <div className="text-[10px] text-slate-500 shrink-0 font-medium">{ago}</div>
                           </Link>
                         );
                       })}
                    </div>
                 </div>
              </div>
            )}

            <div className="flex flex-col gap-6 mt-6 xl:mt-0">
              {/* Search */}
              <form onSubmit={handleSearch}
              className={`glass-panel rounded-full p-2 pl-6 flex items-center justify-between border shadow-lg bg-white/5 transition-all ${searchActive ? "border-[#C8A557]/60" : "border-white/20"}`}>
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#C8A557]/20 flex items-center justify-center pulse-ai shrink-0">
                  <span className="material-symbols-outlined text-[#C8A557]">robot_2</span>
                </div>
                {searchActive || searchVal ? (
                  <input autoFocus value={searchVal} onChange={e => setSearchVal(e.target.value)}
                    onBlur={() => { if (!searchVal) setSearchActive(false); }}
                    placeholder={t("search_ph")}
                    className="bg-transparent outline-none text-white text-sm w-full placeholder:text-slate-400" />
                ) : (
                  <div onClick={() => setSearchActive(true)} className="cursor-text flex-1">
                    <div className="text-white font-bold text-sm tracking-wide">{t("search_title")}</div>
                    <div className="text-xs text-slate-400">{t("search_sub")}</div>
                  </div>
                )}
              </div>
              <button type="submit" className="w-12 h-12 rounded-full bg-[#C8A557] hover:bg-[#C8A557] flex items-center justify-center transition shrink-0">
                <span className="material-symbols-outlined text-white">search</span>
              </button>
            </form>

            {/* App Grid — phân quyền theo nghiệp vụ */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

              {/* ── Phê duyệt hồ sơ: Admin only ── */}
              {(userRole === 'admin') && (
                <Link href="/dashboard/kyc" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-cyan-300">verified_user</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#1F6FEB]/20 text-blue-300 rounded-full border border-[#1F6FEB]/30">ADMIN</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{t("app_kyc_sub")}</p>
                    <h3 className="text-sm font-bold text-white">{t("app_kyc")}</h3>
                  </div>
                </Link>
              )}

              {/* ── Hồ sơ doanh nghiệp: Manufacturer + Importer (xem hồ sơ của chính DN) ── */}
              {(userRole === 'manufacturer' || userRole === 'importer') && (
                <Link href="/dashboard/ho-so" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-cyan-300">business_center</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#1F6FEB]/20 text-blue-300 rounded-full border border-[#1F6FEB]/30">KYC</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{lang === 'en' ? 'Info · documents · licenses' : 'Thông tin · giấy tờ · giấy phép'}</p>
                    <h3 className="text-sm font-bold text-white">{lang === 'en' ? 'Business profile' : 'Hồ sơ doanh nghiệp'}</h3>
                  </div>
                </Link>
              )}

              {/* ── Quản lý người dùng: Admin only ── */}
              {(userRole === 'admin') && (
                <Link href="/dashboard/users" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-emerald-300">manage_accounts</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#1F6FEB]/20 text-blue-300 rounded-full border border-[#1F6FEB]/30">ADMIN</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">
                      {lang === 'en' ? 'Lock / unlock / delete accounts' : 'Khóa / mở khóa / xóa tài khoản'}
                    </p>
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'en' ? 'User management' : 'Quản lý người dùng'}
                    </h3>
                  </div>
                </Link>
              )}

              {/* ── Phân quyền hệ thống: Admin only ── */}
              {(userRole === 'admin') && (
                <Link href="/dashboard/phan-quyen" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-[#1F6FEB]">key</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#1F6FEB]/20 text-blue-300 rounded-full border border-[#1F6FEB]/30">ADMIN</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">
                      {lang === 'en' ? 'Grant access by role' : 'Cấp quyền theo vai trò'}
                    </p>
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'en' ? 'Role permissions' : 'Phân quyền hệ thống'}
                    </h3>
                  </div>
                </Link>
              )}

              {/* ── Kho hàng: Manufacturer + Admin ── */}
              {(userRole === 'manufacturer') && (
                <Link href="/dashboard/inventory" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex gap-2 mb-2"><span className="material-symbols-outlined text-3xl text-blue-300">inventory_2</span><span className="material-symbols-outlined text-3xl text-cyan-300">qr_code</span></div>
                  <div><p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{t("app_inv_sub")}</p><h3 className="text-sm font-bold text-white">{t("app_inv")}</h3></div>
                </Link>
              )}

              {/* ── Cảnh báo Real-time: CHỈ Admin ── */}
              {userRole === 'admin' && (
                <Link href="/dashboard/alerts" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-[#1F6FEB]">notifications_active</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#1F6FEB]/20 text-blue-300 rounded-full border border-[#1F6FEB]/30 animate-pulse">REAL-TIME</span>
                  </div>
                  <div><p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{t("app_alert_sub")}</p><h3 className="text-sm font-bold text-white">{t("app_alert")}</h3></div>
                </Link>
              )}

              {/* ── Integration Hub: BR-07 — NSX + NNK + Admin ── */}
              {SHOW_INTEGRATION_AND_STANDARDS_CARDS && (userRole === 'admin' || userRole === 'manufacturer' || userRole === 'importer') && (
                <Link href="/dashboard/integration" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-[#1F6FEB]">hub</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#1F6FEB]/20 text-cyan-300 rounded-full border border-[#1F6FEB]/30">BR-07</span>
                  </div>
                  <div><p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{t("app_hub_sub")}</p><h3 className="text-sm font-bold text-white">{lang === 'en' ? 'Integration Hub' : 'Trung tâm Tích hợp'}</h3></div>
                </Link>
              )}

              {(userRole === 'admin' || userRole === 'consumer' || userRole === 'importer' || userRole === 'manufacturer') && (
                <Link href="/verify" className="glass-card rounded-3xl p-5 flex flex-col h-40 group border border-[#1F6FEB]/30 bg-[#1F6FEB]/10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold text-[#1F6FEB]">{t("app_verify_sub")}</span>
                    <div className="bg-gradient-to-b from-[#60A5FA] to-[#1F6FEB] rounded p-1 shadow-lg shadow-blue-500/30"><span className="material-symbols-outlined text-white text-md">star</span></div>
                  </div>
                  <div className="flex gap-[6px]">
                    <div title="QR" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-white text-[20px]">qr_code_scanner</span></div>
                    <div title="Mã vạch" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-white text-[20px]">barcode_reader</span></div>
                    <div title="Serial" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-white text-[20px]">pin</span></div>
                    <div title="AI" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-white text-[20px]">document_scanner</span></div>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-auto text-center">{t("app_verify")}</h3>
                </Link>
              )}

              {/* ── Báo cáo hàng giả bằng Wizard: Consumer + Admin ── */}
              {(userRole === 'admin' || userRole === 'consumer') && (
                <Link href="/verify/wizard" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-red-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-red-400">report</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded-full border border-red-500/30">{lang === 'en' ? 'WIZARD' : 'TỪNG BƯỚC'}</span>
                  </div>
                  <div><p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{lang === 'en' ? 'Step-by-step reporting' : 'Báo cáo từng bước'}</p><h3 className="text-sm font-bold text-white">{lang === 'en' ? 'Report Fake Goods' : 'Báo Cáo Hàng Giả'}</h3></div>
                </Link>
              )}

              {/* ── Lịch sử cá nhân: Consumer + Admin ── */}
              {(userRole === 'admin' || userRole === 'consumer') && (
                <Link href="/verify/history" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-cyan-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-cyan-400">history</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">{lang === 'en' ? 'ACTIVITY' : 'HOẠT ĐỘNG'}</span>
                  </div>
                  <div><p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{lang === 'en' ? 'Scan & report history' : 'Lịch sử quét và báo cáo'}</p><h3 className="text-sm font-bold text-white">{lang === 'en' ? 'My History' : 'Lịch Sử Cá Nhân'}</h3></div>
                </Link>
              )}

              {/* ── Điểm thưởng AI VeriGoods: Consumer + Admin ── */}
              {(userRole === 'admin' || userRole === 'consumer') && (
                <Link href="/verify/rewards" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-emerald-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-emerald-400">redeem</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">{lang === 'en' ? 'VOUCHERS' : 'ĐỔI QUÀ'}</span>
                  </div>
                  <div><p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{lang === 'en' ? 'Earn & spend points' : 'Tích điểm và đổi quà'}</p><h3 className="text-sm font-bold text-white">{lang === 'en' ? 'Rewards' : 'Điểm Thưởng'}</h3></div>
                </Link>
              )}

              {/* ── Hậu kiểm: Admin only ── */}
              {(userRole === 'admin') && (
                <Link href="/dashboard/haukiem" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-32 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="material-symbols-outlined text-4xl text-[#1F6FEB]">biotech</span>
                  <h3 className="text-sm font-bold text-white uppercase text-center border-t border-white/10 pt-2">{t("app_hk")}</h3>
                </Link>
              )}

              {/* ── Thư viện Tiêu chuẩn: Manufacturer + Importer + Admin ── */}
              {SHOW_INTEGRATION_AND_STANDARDS_CARDS && (userRole === 'admin' || userRole === 'manufacturer' || userRole === 'importer') && (
                <Link href="/dashboard/standards" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-40 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-3xl text-[#1F6FEB]">menu_book</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#1F6FEB]/20 text-blue-300 rounded-full border border-[#1F6FEB]/30">QCVN/TCVN</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-300 border-b border-white/10 pb-1 mb-1">{lang === 'en' ? 'Test thresholds by product group' : 'Ngưỡng kiểm nghiệm theo nhóm SP'}</p>
                    <h3 className="text-sm font-bold text-white">{lang === 'en' ? 'Standards Library' : 'Thư viện Tiêu chuẩn'}</h3>
                  </div>
                </Link>
              )}

              {/* ── Báo cáo & Phân tích: Manufacturer + Importer + Admin (FR-RPT-06) ── */}
              {(userRole === 'admin' || userRole === 'manufacturer' || userRole === 'importer') && (
                <Link href="/dashboard/analytics" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-32 group relative overflow-hidden border border-[#1F6FEB]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="material-symbols-outlined text-4xl text-[#1F6FEB]">analytics</span>
                  <h3 className="text-sm font-bold text-white uppercase text-center border-t border-white/10 pt-2">{lang === 'en' ? 'Reports & Analytics' : 'Báo cáo & Phân tích'}</h3>
                </Link>
              )}

              {/* ── Nhật ký: Tất cả ── */}
              <Link href="/dashboard/history" className="glass-card rounded-3xl p-5 flex flex-col justify-between h-32 group">
                <span className="material-symbols-outlined text-4xl text-slate-300">history</span>
                <h3 className="text-sm font-bold text-white uppercase text-center border-t border-white/10 pt-2">{t("app_hist")}</h3>
              </Link>

                <div className="glass-card rounded-3xl p-3 sm:p-4 flex flex-col justify-between h-32 border border-[#1F6FEB]/20 bg-white/85 min-w-0 overflow-hidden shadow-sm dark:bg-red-900/20 dark:border-red-500/30">
                  <div className="flex gap-1.5 sm:gap-2 min-w-0">
                    <a href="tel:113" className="flex-1 min-w-0 rounded-xl border border-red-300/70 bg-red-50 p-1.5 text-center transition hover:bg-red-100 dark:bg-red-500/20 dark:border-red-500/30 dark:hover:bg-red-500/40">
                      <p className="text-[8px] sm:text-[9px] font-black text-red-700 truncate leading-tight dark:text-red-100">{lang === 'en' ? 'ALERTS' : 'CẢNH BÁO'}</p>
                      <p className="text-sm sm:text-base font-black text-slate-950 truncate leading-tight dark:text-white">113</p>
                    </a>
                    <a href="tel:1900" className="flex-1 min-w-0 rounded-xl border border-[#1F6FEB]/35 bg-[#1F6FEB]/10 p-1.5 text-center transition hover:bg-[#1F6FEB]/15 dark:bg-[#1F6FEB]/15 dark:border-[#1F6FEB]/30 dark:hover:bg-[#1F6FEB]/25">
                      <p className="text-[8px] sm:text-[9px] font-black text-[#1557B0] truncate leading-tight dark:text-blue-100">{lang === 'en' ? 'SUPPORT' : 'HỖ TRỢ'}</p>
                      <p className="text-sm sm:text-base font-black text-slate-950 truncate leading-tight dark:text-white">1900</p>
                    </a>
                  </div>
                  <h3 className="text-[11px] sm:text-sm font-black text-slate-800 uppercase text-center border-t border-[#1F6FEB]/15 pt-1.5 sm:pt-2 leading-tight truncate dark:border-red-500/20 dark:text-white">{t("app_emg")}</h3>
                </div>
            </div>


            {/* Recent — ẩn theo yêu cầu */}
            <div className="mt-2 hidden">
              <h2 className="text-lg font-display font-bold text-white mb-4 tracking-widest uppercase">{t("recent")}</h2>
              <div className="flex gap-4 overflow-x-auto snap-x hide-scrollbar pb-4">
                {logs.slice(0, 2).map((log, i) => (
                  <Link href="/dashboard/history" key={i} className="snap-start shrink-0 w-72 glass-card rounded-2xl overflow-hidden group cursor-pointer h-40 flex flex-col justify-end relative">
                    <div className={`absolute inset-0 bg-gradient-to-t ${log.status === 'success' ? 'from-black/80 via-black/30' : log.status === 'warning' ? 'from-black/80 via-amber-900/40' : 'from-red-900/90 via-red-900/40'} to-transparent z-10`} />
                    <img src={log.status === 'success' ? "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80" : "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=600&q=80"} alt="bg" className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${log.status === 'error' ? 'grayscale' : ''}`} />
                    <div className="relative z-20 p-4">
                      <span className={`px-2 py-1 ${log.status === 'success' ? 'bg-[#4A7C5C]' : log.status === 'warning' ? 'bg-[#C8A557]' : 'bg-red-600'} text-white text-[9px] font-black rounded mb-2 inline-block ${log.status === 'error' ? 'animate-pulse' : ''}`}>
                        {log.status === 'success'
                          ? (lang === 'en' ? 'SUCCESS' : 'THÀNH CÔNG')
                          : log.status === 'warning'
                          ? (lang === 'en' ? 'WARNING' : 'CẢNH BÁO')
                          : (lang === 'en' ? 'DANGER' : 'NGUY HIỂM')}
                      </span>
                      <h4 className="text-sm font-bold text-white uppercase line-clamp-1">{log.action}</h4>
                      <p className="text-xs text-slate-300">{log.user} • {log.ip}</p>
                    </div>
                  </Link>
                ))}
                <Link href="/dashboard/history" className="snap-start shrink-0 w-16 glass-card rounded-2xl flex items-center justify-center hover:bg-white/10 transition">
                  <span className="material-symbols-outlined text-white">chevron_right</span>
                </Link>
              </div>
            </div>
            </div>
          </div>

          {/* ── RIGHT — Globe (giờ stack vertical, không overlay) ── */}
          <div className="xl:col-span-6 relative flex flex-col gap-4">
            {/* Header — static flow trên cùng */}
            <div className="static flex gap-2 items-center pt-2 px-2 lg:pt-0 lg:px-0">
              <span className="text-white text-xl font-display font-bold">{t("map_title")}</span>
              <div className="w-12 h-px bg-[#C8A557] mt-0.5 relative"><div className="absolute right-0 -top-1 w-2 h-2 rotate-45 border-r border-t border-[#C8A557]" /></div>
            </div>

            {/* Legend — static flow */}
            <div className="static flex flex-row flex-wrap gap-3 px-2 lg:px-0 -mt-2">
              {[
                { color: "bg-[#C8A557]", label: t("sc_hotspot") },
                { color: "bg-orange-500", label: t("sc_tracking") },
                { color: "bg-[#C8A557]",   label: t("sc_normal") },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${l.color}`} />
                  <span className="text-[9px] text-slate-400">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Map action buttons — flow ngang ở trên map (chỉ desktop). */}
            <div className="hidden lg:flex flex-row flex-wrap gap-2 px-2 lg:px-0">

              <div className="glass-panel px-3 py-2 rounded-xl text-[10px] font-bold text-[#C8A557] border-[#C8A557]/20 flex items-center justify-center gap-1 mb-1">
                <span className="material-symbols-outlined text-[14px]">badge</span>
                {roleLabel}
              </div>

              <button onClick={() => setModal("report")}
                className="glass-panel px-3 py-2 rounded-xl text-[10px] font-bold text-slate-200 hover:bg-white/10 transition text-left cursor-pointer active:scale-95">
                {t("sc_export")}<br /><span className="text-[9px] text-slate-500">(AI Summary)</span>
              </button>

              <button onClick={async () => {
                  // Xóa localStorage
                  localStorage.removeItem("userRole");
                  localStorage.removeItem("userName");
                  // Xóa cookie phía server (middleware dùng cookie để protect route)
                  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                  window.location.href = "/login";
                }}
                className="glass-panel px-3 py-2 rounded-xl text-[10px] font-bold text-rose-400 hover:bg-rose-500/20 border-rose-500/20 transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 mt-2">
                <span className="material-symbols-outlined text-[14px]">logout</span> {lang === 'en' ? 'Logout' : 'Đăng xuất'}
              </button>
            </div>

            {/* Vietnam Map — fixed height, hiện luôn GPS marker user */}
            <div className="relative h-72 sm:h-96 lg:h-[480px] xl:h-[560px] w-full">
              <VietnamMap
                onMarkerClick={(m) => setGlobeMarker(m)}
                userLocation={ipInfo && ipInfo.lat && ipInfo.lon ? {
                  lat: ipInfo.lat,
                  lng: ipInfo.lon,
                  city: ipInfo.city,
                  source: (ipInfo.source === 'gps' || ipInfo.source === 'ip') ? ipInfo.source : undefined,
                } : null}
              />
            </div>

            {/* Divider rõ ràng tách map ↔ section dưới */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C8A557]/30 to-transparent mt-6 mb-2" />

            {/* Bottom section — flow xuống dưới map, KHÔNG overlay (đã fix) */}
            <div className="static flex flex-col lg:flex-row lg:flex-wrap gap-4 w-full pb-4 pt-4">
              <div className="block w-full lg:flex-1 space-y-4">
                <h3 className="text-white font-bold tracking-widest text-sm mb-2">{t("sec_title")}</h3>

                {/* GPS loading state */}
                {gpsStatus === 'loading' && !ipInfo && (
                  <div className="glass-panel rounded-2xl border border-white/10 p-4 flex items-center gap-3">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#C8A557] shrink-0" />
                    <span className="text-[11px] text-slate-300">{lang === 'en' ? 'Getting GPS location...' : 'Đang lấy vị trí GPS...'}</span>
                  </div>
                )}

                {/* GPS denied — show browser instructions */}
                {gpsStatus === 'denied' && (
                  <div className="glass-panel rounded-2xl border border-red-500/30 bg-red-500/10 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-400 text-[18px]">location_disabled</span>
                      <span className="text-[11px] font-bold text-red-300">{lang === 'en' ? 'GPS blocked in browser' : 'GPS bị chặn trong trình duyệt'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {lang === 'en' ? <>Click the <strong className="text-white">🔒 lock icon</strong> in the address bar → select <strong className="text-white">Location</strong> → <strong className="text-[#6FB585]">Allow</strong> → Reload.</> : <>Nhấn vào <strong className="text-white">🔒 biểu tượng ổ khoá</strong> trên thanh địa chỉ → chọn <strong className="text-white">Vị trí</strong> → <strong className="text-[#6FB585]">Cho phép</strong> → Tải lại trang.</>}
                    </p>
                    <button
                      onClick={() => { sessionStorage.removeItem("vntrust_geo"); setGpsStatus("idle"); window.location.reload(); }}
                      className="w-full py-1.5 bg-[#4A7C5C]/20 text-[#6FB585] border border-[#4A7C5C]/30 rounded-xl text-[10px] font-bold hover:bg-[#4A7C5C]/30 transition flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">refresh</span> {lang === 'en' ? 'Permission granted — Reload' : 'Đã cấp quyền — Tải lại'}
                    </button>
                  </div>
                )}

                {/* Placeholder khi chưa có vị trí — luôn show card để user thấy chỗ */}
                {!ipInfo && gpsStatus !== 'loading' && gpsStatus !== 'denied' && (
                  <div className="glass-panel rounded-2xl border border-white/10 p-4 w-full sm:w-72">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#C8A557] text-[18px]">location_searching</span>
                      <span className="text-xs font-bold text-white">{lang === 'en' ? 'Last Auth Location' : 'Vị trí xác thực lần cuối'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">
                      {lang === 'en' ? 'Grant GPS permission to display your verified location on the map.' : 'Cấp quyền GPS để hiển thị vị trí xác thực trên bản đồ.'}
                    </p>
                    <button
                      onClick={() => {
                        setGpsStatus("loading");
                        navigator.geolocation?.getCurrentPosition(
                          async (pos) => {
                            const lat = pos.coords.latitude; const lng = pos.coords.longitude;
                            try {
                              const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "Accept-Language": "vi" } });
                              const geo = await r.json();
                              const addr = geo.address || {};
                              const city = addr.suburb || addr.quarter || addr.city_district || addr.city || addr.town || "GPS";
                              let ip = "GPS";
                              try { const ri = await fetch("/api/ip"); const di = await ri.json(); ip = di.ip || "GPS"; } catch {}
                              const info = { ip, city, country: "VN", lat, lon: lng, source: "gps" as const, _v: "v4" };
                              setIpInfo(info); setGpsStatus("ok");
                              sessionStorage.setItem("vntrust_geo", JSON.stringify(info));
                            } catch { setGpsStatus("unavailable"); }
                          },
                          (err) => { if (err.code === 1) setGpsStatus("denied"); else setGpsStatus("unavailable"); },
                          { timeout: 12000, maximumAge: 0, enableHighAccuracy: true }
                        );
                      }}
                      className="w-full py-2 bg-[#4A7C5C]/20 text-[#6FB585] border border-[#4A7C5C]/30 rounded-xl text-xs font-bold hover:bg-[#4A7C5C]/30 transition flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">gps_fixed</span>
                      {lang === 'en' ? 'Enable GPS' : 'Cấp quyền GPS'}
                    </button>
                  </div>
                )}

                {ipInfo && (
                  <div className="glass-panel rounded-2xl border border-[#22d3ee]/20 bg-[#22d3ee]/5 overflow-hidden w-full sm:w-72">
                    {/* Header — chỉ còn badge + refresh (đã bỏ iframe, vị trí hiện trên VietMap chính) */}
                    <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/10">
                      <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">{lang === 'en' ? 'Last Auth Location' : 'Vị trí xác thực lần cuối'}</span>
                      <div className="flex gap-1 items-center">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${ipInfo.source === 'gps' ? 'bg-[#22d3ee]/20 text-[#22d3ee] border-[#22d3ee]/30' : 'bg-[#C8A557]/20 text-[#C8A557] border-[#C8A557]/30'}`}>
                          {gpsStatus === 'loading' ? '...' : ipInfo.source === 'gps' ? 'GPS ✓' : 'IP'}
                        </span>
                        <button
                          onClick={() => { sessionStorage.removeItem("vntrust_geo"); setGpsStatus("idle"); window.dispatchEvent(new CustomEvent("vntrust_geo_toggle", { detail: { enabled: true } })); }}
                          className={`transition ${gpsStatus === 'loading' ? 'animate-spin text-[#C8A557]' : 'text-slate-500 hover:text-white'}`} title={lang === 'en' ? 'Refresh location' : 'Làm mới vị trí'}>
                          <span className="material-symbols-outlined text-[14px]">refresh</span>
                        </button>
                      </div>
                    </div>
                    {/* IP warning + grant GPS button */}
                    {ipInfo.source === 'ip' && gpsStatus !== 'loading' && (
                      <div className="px-3 py-2 bg-[#C8A557]/10 border-b border-[#C8A557]/20 space-y-1.5">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[#C8A557] text-[11px]">warning</span>
                          <span className="text-[9px] text-amber-300 font-bold">{lang === 'en' ? 'IP Location — inaccurate' : 'Vị trí IP — không chính xác'}</span>
                        </div>
                        {gpsStatus === 'denied' ? (
                          <p className="text-[9px] text-slate-400">{lang === 'en' ? 'Click 🔒 on URL bar → Location → Allow → F5' : 'Nhấn 🔒 trên URL bar → Vị trí → Cho phép → F5'}</p>
                        ) : (
                          <button
                            onClick={() => {
                              sessionStorage.removeItem("vntrust_geo");
                              setGpsStatus("loading");
                              navigator.geolocation?.getCurrentPosition(
                                async (pos) => {
                                  const lat = pos.coords.latitude; const lng = pos.coords.longitude;
                                  try {
                                    const url = "https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lng + "&format=json";
                                    const r = await fetch(url, { headers: { "Accept-Language": "vi" } });
                                    const geo = await r.json();
                                    const addr = geo.address || {};
                                    const city = addr.suburb || addr.quarter || addr.city_district || addr.city || addr.town || "GPS";
                                    let ip = "GPS";
                                    try { const ri = await fetch("/api/ip"); const di = await ri.json(); ip = di.ip || "GPS"; } catch {}
                                    const info = { ip, city, country: "VN", lat, lon: lng, source: "gps" as const, _v: "v4" };
                                    setIpInfo(info); setGpsStatus("ok");
                                    sessionStorage.setItem("vntrust_geo", JSON.stringify(info));
                                  } catch { setGpsStatus("unavailable"); }
                                },
                                (err) => { if (err.code === 1) setGpsStatus("denied"); else setGpsStatus("unavailable"); },
                                { timeout: 12000, maximumAge: 0, enableHighAccuracy: true }
                              );
                            }}
                            className="w-full py-1 bg-[#4A7C5C]/20 text-[#6FB585] border border-[#4A7C5C]/30 rounded-lg text-[9px] font-bold hover:bg-[#4A7C5C]/30 transition flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">gps_fixed</span> {lang === 'en' ? 'Get accurate GPS location' : 'Lấy vị trí GPS chính xác'}
                          </button>
                        )}
                      </div>
                    )}
                    {/* City + coords + hint: chấm xanh trên bản đồ chính = vị trí của bạn */}
                    <div className="px-3 py-2 flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[18px] ${ipInfo.source === 'gps' ? 'text-[#22d3ee]' : 'text-[#C8A557]'}`}>
                        {ipInfo.source === 'gps' ? 'gps_fixed' : 'wifi_tethering'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-black text-sm leading-tight truncate">{ipInfo.city}</p>
                        {ipInfo.lat && ipInfo.lon && (
                          <p className="text-slate-400 text-[10px] font-mono">{Number(ipInfo.lat).toFixed(5)}, {Number(ipInfo.lon).toFixed(5)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <button onClick={() => setModal("security")}
                  className="glass-card rounded-2xl p-4 flex gap-4 cursor-pointer group w-full text-left hover:border-[#4A7C5C]/40 transition">
                  <div className="w-10 h-10 rounded-full bg-[#4A7C5C]/20 flex items-center justify-center text-[#6FB585] group-hover:bg-[#4A7C5C] group-hover:text-white transition shrink-0">
                    <span className="material-symbols-outlined">shield_person</span>
                  </div>
                  <div><h4 className="text-[11px] font-bold text-white">{t("sec_team")}</h4><p className="text-[10px] text-slate-400">{t("sec_team_sub")}</p></div>
                </button>
                <button onClick={() => setModal("hotline")}
                  className="glass-card rounded-2xl p-4 flex gap-4 cursor-pointer group w-full text-left hover:border-[#C8A557]/40 transition">
                  <div className="w-10 h-10 rounded-full bg-[#C8A557]/20 flex items-center justify-center text-[#C8A557] group-hover:bg-[#C8A557] group-hover:text-white transition shrink-0">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div><h4 className="text-[11px] font-bold text-white">{t("sec_hotline")}</h4><p className="text-[10px] text-slate-400">{t("sec_hotline_sub")}</p></div>
                </button>
              </div>

              <button onClick={() => setModal("ai")}
                className="pointer-events-auto glass-panel px-6 py-3 rounded-full flex items-center gap-3 text-sm font-bold text-white hover:bg-white/20 transition hover:scale-105 active:scale-95 z-30">
                <div className="w-6 h-6 rounded-full bg-[#C8A557] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                </div>
                {t("ai_btn")}
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
