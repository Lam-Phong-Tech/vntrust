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

// ─── Toast Notification ───────────────────────────────────────────────────────
type ToastType = "error" | "warning" | "success" | "info";
interface ToastItem { id: number; msg: string; type: ToastType; }

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const iconMap = { error: "error", warning: "warning", success: "check_circle", info: "info" };
  const colorMap = {
    error:   "bg-red-500/15 border-red-500/40 text-red-300",
    warning: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    success: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    info:    "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
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
const VietnamMap = dynamic(() => import("@/components/VietnamMap"), { ssr: false });

// ─── AI Engine ────────────────────────────────────────────────────────────────
const RESPONSES: Array<{ match: RegExp; replies: string[] }> = [
  {
    match: /^(xin chào|hello|hi|chào|hey|alo)[\s!]*/i,
    replies: [
      "Chào bạn! 😊 Rất vui được gặp bạn hôm nay. Mình là AI của VNTrust nha — bạn cần tra serial, kiểm tra lô hàng, hay hỏi gì khác không?",
      "Hey! 👋 Mình đây. Có gì cần giúp không bạn? Nhập số serial để mình check ngay, hoặc hỏi thoải mái nhé!",
      "Chào bạn nhé, mình là AI VNTrust 🤖 Hôm nay bạn muốn mình hỗ trợ gì không?",
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
      "Chuỗi cung ứng của VNTrust hiện đang theo dõi **4,821 điểm** trên toàn quốc 🗺️\n\nBạn có thể xem realtime:\n• Luồng hàng từ nhà máy → kho → điểm bán\n• Bản đồ nhiệt cảnh báo vùng hàng giả\n• Thống kê quét theo tỉnh thành\n\nVào **Chuỗi Cung ứng** trên menu để xem nhé! Hoặc bấm vào bản đồ bên phải để chọn tỉnh 😊",
    ],
  },
  {
    match: /bảo mật|hack|xâm nhập|lộ data|an toàn/i,
    replies: [
      "Bảo mật là ưu tiên số 1 của VNTrust đó bạn! 🔐\n• Mã hóa AES-256 toàn bộ data\n• 2FA bắt buộc cho tài khoản doanh nghiệp\n• Blockchain không thể giả mạo\n• AI giám sát 24/7, phát hiện xâm nhập < 10 giây\n• Tuân thủ ISO/IEC 27001\n\nBạn muốn biết về chính sách bảo mật cụ thể nào không?",
    ],
  },
  {
    match: /app|ứng dụng|mobile|điện thoại|ios|android/i,
    replies: [
      "À, app VNTrust Mobile thì xịn lắm đó! 📱\n• Quét QR bằng camera mà không cần nhập tay\n• Nhận thông báo ngay khi phát hiện hàng giả\n• Offline mode: cache data để dùng khi mất mạng\n\n**iOS**: App Store → 'VNTrust'\n**Android**: Google Play → 'VNTrust'\n\nHoặc bấm **APP DOWNLOAD** trên thanh đầu, mình sẽ mở link tải cho bạn!",
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
    return `⚠️ Ồ, mã **${s}** không có trong hệ thống đó bạn!\n\nCó thể là:\n• Sản phẩm chưa được đăng ký với VNTrust\n• Mã bị nhập sai hoặc tem hỏng\n• **Nguy hiểm: Đây có thể là hàng giả!**\n\nBạn muốn mình báo cáo sản phẩm này không? Mình kết nối với đội bảo mật ngay!`;
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md glass-panel border border-white/20 rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-white">{icon}</span>
            </div>
            <h2 className="text-lg font-black text-white font-headline">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
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
          reply = `⚠️ Mã **${serial.toUpperCase()}** không có trong hệ thống!\n\nCó thể là:\n• Sản phẩm chưa đăng ký VNTrust\n• Mã bị nhập sai hoặc tem hỏng\n• **Nguy hiểm: Có thể là hàng giả!**`;
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
    <ModalWrapper onClose={onClose} title="Trợ lý AI VNTrust" icon="smart_toy" iconColor="bg-cyan-500">
      <div className="flex flex-col h-[480px]">
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
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
          {quickBtns.map(q => (
            <button key={q} onClick={() => setInput(q)}
              className="text-[10px] font-bold px-3 py-1.5 bg-white/8 rounded-full text-slate-300 hover:bg-white/15 hover:text-white transition border border-white/10">
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none focus:border-cyan-400 transition"
            placeholder="Chat với AI VNTrust..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()} />
          <button onClick={send} disabled={typing}
            className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center hover:bg-cyan-400 transition shrink-0 disabled:opacity-40">
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
        `BÁO CÁO VNTRUST - AI SUMMARY`,
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
        download: `VNTrust_BaoCao_${periodLabel.replace(/ /g, "_")}_${now.replace(/\//g, "-")}.csv`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setState("done");
    } catch {
      setState("idle");
    }
  };

  return (
    <ModalWrapper onClose={onClose} title="Xuất Báo cáo AI" icon="summarize" iconColor="bg-violet-500">
      <div className="space-y-3 mb-5">
        {["Tóm tắt hoạt động theo kỳ", "Thống kê lượt quét thực tế", "Top sản phẩm được quét", "Xu hướng 7 ngày"].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
            <span className="text-sm text-slate-200">{i}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {(["week", "month", "quarter"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
              period === p ? "bg-violet-500 text-white border-violet-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}>
            {p === "week" ? "7 ngày" : p === "month" ? "30 ngày" : "3 tháng"}
          </button>
        ))}
      </div>
      {state === "done" ? (
        <div className="text-center p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl">
          <span className="material-symbols-outlined text-4xl text-emerald-400">task_alt</span>
          <p className="text-emerald-400 font-bold mt-1">File CSV đã được tải về máy!</p>
          <button onClick={doExport} className="mt-2 text-xs text-cyan-400 underline">Tải lại</button>
        </div>
      ) : (
        <button onClick={doExport} disabled={state === "loading"}
          className="w-full flex items-center justify-center gap-2 py-3 bg-violet-500 hover:bg-violet-400 rounded-xl text-white font-bold text-sm transition disabled:opacity-70">
          {state === "loading" ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang tạo báo cáo...</> : <><span className="material-symbols-outlined text-[18px]">download</span> Xuất CSV thực tế</>}
        </button>
      )}
    </ModalWrapper>
  );
}

function SecurityModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalWrapper onClose={onClose} title="Chuyên gia Bảo mật" icon="shield_person" iconColor="bg-emerald-500">
      <div className="space-y-3 mb-5">
        {[{ name: "Nguyễn Văn An", role: "Chuyên gia chống giả cấp cao", status: "online" }, { name: "Trần Thị Bình", role: "Phân tích chuỗi cung ứng", status: "online" }, { name: "Lê Minh Cường", role: "Kỹ thuật xác thực AI", status: "busy" }].map((ex, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
            <div className="flex-1"><p className="font-bold text-white text-sm">{ex.name}</p><p className="text-[10px] text-slate-400">{ex.role}</p></div>
            <span className={`w-2.5 h-2.5 rounded-full ${ex.status === "online" ? "bg-emerald-400" : "bg-amber-400"}`}></span>
          </div>
        ))}
      </div>
      <Link href="/dashboard/security" onClick={onClose} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-sm hover:bg-emerald-500/30 transition">
        <span className="material-symbols-outlined text-[18px]">security</span> Mở trang Bảo mật
      </Link>
    </ModalWrapper>
  );
}

function HotlineModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalWrapper onClose={onClose} title="Đường dây Nóng 24/7" icon="call" iconColor="bg-cyan-500">
      <div className="space-y-3 mb-4">
        {[{ area: "TP. Hồ Chí Minh", number: "1800 6789", online: true }, { area: "Hà Nội", number: "1800 1234", online: true }, { area: "Đà Nẵng & Miền Trung", number: "1800 4567", online: false }, { area: "Cần Thơ & Tây Nam Bộ", number: "1900 8888", online: true }].map((h, i) => (
          <a key={i} href={`tel:${h.number.replace(/\s/g, "")}`} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-cyan-400/40 transition group">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500 transition shrink-0">
              <span className="material-symbols-outlined text-cyan-400 group-hover:text-white text-[18px]">phone_in_talk</span>
            </div>
            <div className="flex-1"><p className="text-[10px] text-slate-400">{h.area}</p><p className="font-black text-white font-headline">{h.number}</p></div>
            <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${h.online ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/20" : "text-slate-400 bg-white/5 border-white/10"}`}>{h.online ? "ONLINE" : "Offline"}</span>
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
  const typeColor = marker.type === "hot" ? "text-amber-400" : marker.type === "warning" ? "text-orange-400" : "text-emerald-400";
  const typeBg = marker.type === "hot" ? "bg-amber-500/10 border-amber-500/30" : marker.type === "warning" ? "bg-orange-500/10 border-orange-500/30" : "bg-emerald-500/10 border-emerald-500/30";
  return (
    <ModalWrapper onClose={onClose} title={marker.name} icon="language" iconColor={marker.type === 'hot' ? 'bg-amber-500' : marker.type === 'warning' ? 'bg-orange-500' : 'bg-emerald-500'}>
      <p className="text-slate-400 text-xs mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[14px]">location_on</span> {marker.country}
        <span className={`ml-auto font-bold text-[10px] px-2 py-0.5 rounded-full border ${typeBg} ${typeColor}`}>{typeLabel}</span>
      </p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <p className="text-xl font-black text-cyan-400">{marker.scans.toLocaleString()}</p>
          <p className="text-[9px] text-slate-400 mt-1">Lượt quét</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <p className={`text-xl font-black ${marker.fake > 0 ? "text-amber-400" : "text-emerald-400"}`}>{marker.fake}</p>
          <p className="text-[9px] text-slate-400 mt-1">Hàng giả</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <p className="text-xl font-black text-blue-300">{((marker.scans - marker.fake) / marker.scans * 100).toFixed(1)}%</p>
          <p className="text-[9px] text-slate-400 mt-1">Toàn vẹn</p>
        </div>
      </div>
      {marker.fake > 0 && (
        <div className={`p-4 ${typeBg} border rounded-2xl mb-4`}>
          <p className={`${typeColor} font-bold text-sm flex items-center gap-2`}>
            <span className="material-symbols-outlined text-[18px]">warning</span> Cảnh báo hàng giả
          </p>
          <p className="text-slate-300 text-xs mt-1">Phát hiện {marker.fake} sản phẩm nghi vấn tại <strong>{marker.name}</strong> trong 30 ngày qua.</p>
        </div>
      )}
      <Link href="/supply-chain" onClick={onClose} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-sm hover:bg-emerald-500/30 transition">
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
  const [modal, setModal] = useState<ModalType>(null);
  const [globeMarker, setGlobeMarker] = useState<MapMarker | null>(null);
  const [searchVal, setSearchVal] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [ipInfo, setIpInfo] = useState<{ ip: string; city: string; country: string; lat?: number; lon?: number; source?: string } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle'|'loading'|'ok'|'denied'|'unavailable'>('idle');
  const { msgs: chatMsgs, addMsg: addChatMsg } = useChat();
  const { t } = useLanguage();
  const router = useRouter();
  const { logs } = useLogs();
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) {
      router.replace("/login");
    } else {
      setUserRole(role);
      setMounted(true);
    }
  }, [router]);

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

  const roleLabel = userRole === "admin" ? t("role_admin") : userRole === "manufacturer" ? t("role_mfr") : userRole === "importer" ? t("role_imp") : t("role_consumer");

  return (
    <div className="mobile-page pb-24 bg-[#F6F1E8] dark:bg-[#0B1623] min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {modal === "ai"       && <AiChatModal      msgs={chatMsgs} addMsg={addChatMsg} onClose={() => setModal(null)} />}
      {modal === "report"   && <ExportReportModal onClose={() => setModal(null)} />}
      {modal === "security" && <SecurityModal     onClose={() => setModal(null)} />}
      {modal === "hotline"  && <HotlineModal      onClose={() => setModal(null)} />}
      {globeMarker          && <MapDetailModal    marker={globeMarker} onClose={() => setGlobeMarker(null)} />}

      {/* Top Header */}
      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[11px] bg-gradient-to-br from-[#0B1623] to-[#1a2235] text-[#C8A557] flex items-center justify-center font-headline font-bold text-sm relative border border-[#C8A557]/20 shadow-sm">
            {localStorage.getItem('userName')?.charAt(0).toUpperCase() || 'U'}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#6FB585] border-2 border-[#F6F1E8] dark:border-[#0B1623] rounded-full"></div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">{roleLabel}</div>
            <div className="font-headline font-bold text-[14px] text-[#0B1623] dark:text-[#F6F1E8] leading-none">
              {localStorage.getItem('userName') || 'Người dùng'}
            </div>
          </div>
        </div>
        <button onClick={() => setModal("hotline")} className="w-9 h-9 rounded-xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-[#0B1623] dark:text-white relative shadow-sm hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined text-[18px]">notifications</span>
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-[#131b2c] rounded-full"></div>
        </button>
      </div>

      <div className="px-4 mt-2 space-y-4">
        {/* Search Bar - matching iOS style */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input 
            value={searchVal} onChange={e => setSearchVal(e.target.value)}
            placeholder="Tìm mã QR, Serial..." 
            className="flex-1 bg-transparent text-xs outline-none text-[#0B1623] dark:text-white placeholder:text-slate-400"
          />
          <button type="button" onClick={() => setModal("ai")} className="w-6 h-6 rounded-md bg-[#C8A557]/10 text-[#C8A557] flex items-center justify-center shrink-0">
             <span className="material-symbols-outlined text-[14px]">smart_toy</span>
          </button>
        </form>

        {/* Hero Card - Lượt quét */}
        <div className="mobile-hero-card">
          <div className="flex justify-between items-start relative z-10 mb-3">
            <div>
              <div className="text-[10px] text-[#F6F1E8]/60 uppercase tracking-widest mb-1">Lượt quét hôm nay</div>
              <div className="font-headline font-medium text-[32px] text-white leading-none tracking-tight">
                7,842<span className="text-[12px] text-[#F6F1E8]/50 ml-1 font-normal tracking-normal">lần</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#6FB585]/20 rounded-full text-[10px] font-bold text-[#6FB585] font-mono">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>
              +24%
            </div>
          </div>
          {/* Faux Sparkline Chart */}
          <div className="relative z-10 h-10 w-full opacity-80 flex items-end justify-between px-1 gap-1">
             {[30, 45, 60, 40, 75, 55, 90, 65, 100, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-[#C8A557] to-[#E4D2A1] rounded-t-sm" style={{ height: `${h}%` }}></div>
             ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="mobile-card p-3">
            <div className="w-7 h-7 rounded-lg bg-[#6FB585]/15 text-[#6FB585] flex items-center justify-center mb-2.5">
              <span className="material-symbols-outlined text-[14px]">verified</span>
            </div>
            <div className="text-[10px] text-slate-500 mb-1">Chính hãng</div>
            <div className="font-headline text-[20px] leading-none font-medium text-[#0B1623] dark:text-white">98.2%</div>
            <div className="text-[9px] text-slate-400 mt-1.5 font-mono tracking-tighter">↑ 0.4%</div>
          </div>
          <div className="mobile-card p-3">
            <div className="w-7 h-7 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center mb-2.5">
              <span className="material-symbols-outlined text-[14px]">warning</span>
            </div>
            <div className="text-[10px] text-slate-500 mb-1">UID nghi giả</div>
            <div className="font-headline text-[20px] leading-none font-medium text-[#0B1623] dark:text-white">412</div>
            <div className="text-[9px] text-slate-400 mt-1.5 font-mono tracking-tighter">↑ 18% · 7d</div>
          </div>
          <div className="mobile-card p-3">
            <div className="w-7 h-7 rounded-lg bg-[#C8893A]/15 text-[#C8893A] flex items-center justify-center mb-2.5">
              <span className="material-symbols-outlined text-[14px]">report_problem</span>
            </div>
            <div className="text-[10px] text-slate-500 mb-1">Cảnh báo mở</div>
            <div className="font-headline text-[20px] leading-none font-medium text-[#0B1623] dark:text-white">8</div>
            <div className="text-[9px] text-slate-400 mt-1.5 font-mono tracking-tighter">2 cao · 6 TB</div>
          </div>
          <div className="mobile-card p-3">
            <div className="w-7 h-7 rounded-lg bg-[#C8A557]/15 text-[#C8A557] flex items-center justify-center mb-2.5">
              <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
            </div>
            <div className="text-[10px] text-slate-500 mb-1">UID phát hành</div>
            <div className="font-headline text-[20px] leading-none font-medium text-[#0B1623] dark:text-white">42K</div>
            <div className="text-[9px] text-slate-400 mt-1.5 font-mono tracking-tighter">128 lô</div>
          </div>
        </div>

        {/* Quick Actions (Role based) */}
        <div className="mt-5">
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-headline font-bold text-[14px] text-[#0B1623] dark:text-white">Ứng dụng</h2>
            <Link href="/dashboard/history" className="text-[11px] text-[#C8A557] font-medium flex items-center gap-0.5">
              Tất cả <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            {userRole === 'admin' && (
              <>
                <Link href="/dashboard/kyc" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-cyan-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">verified_user</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">KYC</span>
                </Link>
                <Link href="/dashboard/distribution" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-purple-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">local_shipping</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Phân phối</span>
                </Link>
                <Link href="/dashboard/security" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-violet-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">security</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Bảo mật</span>
                </Link>
                <Link href="/dashboard/alerts" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-amber-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">notifications_active</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Cảnh báo</span>
                </Link>
              </>
            )}

            {userRole === 'manufacturer' && (
              <>
                <Link href="/dashboard/inventory" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">inventory_2</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Sản phẩm</span>
                </Link>
                <Link href="/dashboard/warehouse" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">warehouse</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Kho hàng</span>
                </Link>
                <Link href="/dashboard/certificates" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-green-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">workspace_premium</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Chứng nhận</span>
                </Link>
                <Link href="/dashboard/analytics" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">analytics</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Báo cáo</span>
                </Link>
              </>
            )}

            {userRole === 'importer' && (
              <>
                <Link href="/dashboard/distribution" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-purple-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">local_shipping</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Nhập/Xuất</span>
                </Link>
                <Link href="/dashboard/warehouse" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">warehouse</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Kho hàng</span>
                </Link>
                <Link href="/dashboard/integration" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-cyan-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">hub</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Đối tác</span>
                </Link>
                <Link href="/dashboard/analytics" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">analytics</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Báo cáo</span>
                </Link>
              </>
            )}

            {userRole === 'consumer' && (
              <>
                <Link href="/verify" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-[#C8A557]/40 flex items-center justify-center text-[#C8A557] shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">qr_code_scanner</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Quét mã</span>
                </Link>
                <Link href="/dashboard/report" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-red-500 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">report</span></div>
                  <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Báo cáo</span>
                </Link>
              </>
            )}

            {/* Common icons */}
            <Link href="/dashboard/compliance" className="flex flex-col items-center gap-1.5 group">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-emerald-400 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">fact_check</span></div>
              <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Tuân thủ</span>
            </Link>
            
            <button onClick={() => setModal("report")} className="flex flex-col items-center gap-1.5 group">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131b2c] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-violet-400 shadow-sm group-hover:scale-105 transition-transform"><span className="material-symbols-outlined">download</span></div>
              <span className="text-[9px] font-medium text-center text-slate-600 dark:text-slate-400">Xuất file</span>
            </button>
          </div>
        </div>

        {/* Recent Alerts List - similar to s-dash-alert */}
        <div className="mt-5">
           <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-headline font-bold text-[14px] text-[#0B1623] dark:text-white">Cảnh báo gần đây</h2>
          </div>
          <div className="space-y-2">
            <div className="mobile-card flex items-center gap-3 p-3 overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[#0B1623] dark:text-white truncate">Trà ô long 200g · TP.HCM</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">UID...8F3A · 12 lần / 2h</div>
              </div>
              <span className="px-2 py-1 bg-red-500/15 text-red-500 text-[9px] font-bold rounded-lg uppercase tracking-wider shrink-0">Cao</span>
            </div>
            <div className="mobile-card flex items-center gap-3 p-3 overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">location_off</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[#0B1623] dark:text-white truncate">Mật ong Hoa Nhãn · Q.7</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">UID...A2B1 · 3 NTD báo cáo</div>
              </div>
              <span className="px-2 py-1 bg-amber-500/15 text-amber-500 text-[9px] font-bold rounded-lg uppercase tracking-wider shrink-0">TB</span>
            </div>
          </div>
        </div>

        {/* GPS Map card (for completeness of old UI) */}
        {ipInfo && (
          <div className="mobile-card overflow-hidden mt-4 border border-slate-200 dark:border-white/10">
            <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
              <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Vị trí xác thực lần cuối</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${ipInfo.source === 'gps' ? 'bg-[#6FB585]/10 text-[#6FB585] border-[#6FB585]/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                {ipInfo.source === 'gps' ? 'GPS ✓' : 'IP'}
              </span>
            </div>
            {ipInfo.lat && ipInfo.lon && (
              <div className="relative w-full h-32 bg-slate-100 dark:bg-[#131b2c]">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${ipInfo.lon - 0.05},${ipInfo.lat - 0.04},${ipInfo.lon + 0.05},${ipInfo.lat + 0.04}&layer=mapnik&marker=${ipInfo.lat},${ipInfo.lon}`}
                  className="w-full h-full border-0" loading="lazy" title="location-map"
                  style={{ filter: 'hue-rotate(195deg) saturate(0.8) brightness(0.9)' }}
                />
              </div>
            )}
            <div className="px-3 py-2.5 flex items-center gap-2">
              <span className={`material-symbols-outlined text-[18px] ${ipInfo.source === 'gps' ? 'text-[#6FB585]' : 'text-amber-500'}`}>
                {ipInfo.source === 'gps' ? 'gps_fixed' : 'wifi_tethering'}
              </span>
              <div>
                <p className="text-[#0B1623] dark:text-white font-bold text-xs">{ipInfo.city}</p>
                {ipInfo.lat && ipInfo.lon && <p className="text-slate-500 text-[9px] font-mono">{Number(ipInfo.lat).toFixed(5)}, {Number(ipInfo.lon).toFixed(5)}</p>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
