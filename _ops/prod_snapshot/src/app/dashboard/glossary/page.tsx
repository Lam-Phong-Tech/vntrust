"use client";
import { useState } from "react";
import Link from "next/link";

// Phần 13.2: Chú giải (Glossary) — TABLE 21
const GLOSSARY = [
  {
    term: "QR Code động",
    abbr: "Dynamic QR",
    category: "Kỹ thuật",
    definition: "Mã QR có nội dung thay đổi được theo thời gian hoặc theo lần quét, khác với QR tĩnh (dễ bị sao chép). Mỗi lần quét ghi nhận lại vào hệ thống.",
  },
  {
    term: "Serial Number",
    abbr: "S/N",
    category: "Kỹ thuật",
    definition: "Mã số duy nhất toàn cầu gắn với từng đơn vị sản phẩm, không trùng lặp. Có thể là hash, random UUID, hoặc sequential với checksum.",
  },
  {
    term: "KYC",
    abbr: "Know Your Customer",
    category: "Nghiệp vụ",
    definition: "Quy trình xác thực danh tính và tính pháp lý của doanh nghiệp: kiểm tra MST, GPKD, email miền riêng, người đại diện pháp luật.",
  },
  {
    term: "SKU",
    abbr: "Stock Keeping Unit",
    category: "Nghiệp vụ",
    definition: "Mã định danh nội bộ của sản phẩm trong kho hàng, do doanh nghiệp tự quy định. Mỗi sản phẩm có SKU riêng biệt.",
  },
  {
    term: "GTIN",
    abbr: "Global Trade Item Number",
    category: "Nghiệp vụ",
    definition: "Mã định danh thương phẩm quốc tế (EAN-13, UPC). Là chuẩn quốc tế để định danh sản phẩm trong thương mại toàn cầu.",
  },
  {
    term: "HS Code",
    abbr: "Harmonized System",
    category: "Hải quan",
    definition: "Mã phân loại hàng hóa quốc tế theo hệ thống HS của WCO. Dùng để khai báo hải quan, tính thuế nhập khẩu.",
  },
  {
    term: "RBAC",
    abbr: "Role-Based Access Control",
    category: "Bảo mật",
    definition: "Phân quyền theo vai trò người dùng. Mỗi role (Admin, NSX, NNK, NTD) chỉ truy cập đúng phạm vi dữ liệu, không xem chéo dữ liệu công ty khác.",
  },
  {
    term: "Computer Vision",
    abbr: "CV",
    category: "AI",
    definition: "Công nghệ AI phân tích hình ảnh. Trong VNTrust: so sánh bao bì thực tế với mẫu chuẩn để phát hiện hàng giả (YOLOv8).",
  },
  {
    term: "OCR",
    abbr: "Optical Character Recognition",
    category: "AI",
    definition: "Công nghệ nhận dạng ký tự quang học — trích xuất text từ ảnh bao bì để kiểm tra thông tin in ấn (PaddleOCR). CER ≤10%.",
  },
  {
    term: "Anomaly Detection",
    abbr: "AD",
    category: "AI",
    definition: "Phát hiện hành vi quét bất thường: cùng mã quét ở 2 thành phố cách 1000km; >100 lần/ngày từ 1 thiết bị; scan từ ngoài vùng phân phối.",
  },
  {
    term: "Lô hàng",
    abbr: "Batch",
    category: "Nghiệp vụ",
    definition: "Một đợt sản xuất hoặc nhập khẩu cụ thể, có mã lô, ngày sản xuất, hạn sử dụng, và danh sách sản phẩm thuộc lô.",
  },
  {
    term: "Tờ khai hải quan",
    abbr: "TKHQ",
    category: "Hải quan",
    definition: "Văn bản khai báo hàng hóa nhập khẩu với cơ quan hải quan. Bao gồm: số tờ khai, ngày thông quan, cửa khẩu, HS code, số lượng.",
  },
  {
    term: "Supply Chain",
    abbr: "SC",
    category: "Nghiệp vụ",
    definition: "Chuỗi cung ứng — toàn bộ hành trình sản phẩm từ nhà sản xuất → nhà phân phối → bán lẻ → người tiêu dùng.",
  },
  {
    term: "Audit Log",
    abbr: "NhatKy",
    category: "Bảo mật",
    definition: "Nhật ký kiểm toán — ghi lại mọi hành động người dùng: thời gian, actor, action, IP, kết quả. Lưu ≥1 năm (NFR-SC-05).",
  },
  {
    term: "SLA",
    abbr: "Service Level Agreement",
    category: "Vận hành",
    definition: "Thỏa thuận mức độ dịch vụ: Uptime ≥99.5%, P95 response ≤200ms, fix critical bug ≤24h.",
  },
  {
    term: "P95 / P99",
    abbr: "Percentile",
    category: "Kỹ thuật",
    definition: "Phần trăm phân vị hiệu năng: P95 = 95% request có response time ≤ ngưỡng. Đây là chỉ số thực tế hơn average.",
  },
  {
    term: "MQTT",
    abbr: "Message Queuing Telemetry Transport",
    category: "Kỹ thuật",
    definition: "Giao thức nhắn tin nhẹ cho IoT. VNTrust dùng để kết nối Camera AI (Edge Gateway) với backend cloud.",
  },
  {
    term: "mTLS",
    abbr: "Mutual TLS",
    category: "Bảo mật",
    definition: "Xác thực hai chiều qua TLS certificate — cả client và server đều phải cung cấp certificate. Dùng cho API chính phủ (BR-07).",
  },
  {
    term: "NSX",
    abbr: "Nhà sản xuất",
    category: "Actor",
    definition: "Doanh nghiệp sản xuất sản phẩm trong nước. Có quyền tạo sản phẩm, lô hàng, quản lý QR code, xem báo cáo.",
  },
  {
    term: "NNK / NPP",
    abbr: "Nhà nhập khẩu / Nhà phân phối",
    category: "Actor",
    definition: "Doanh nghiệp nhập khẩu hàng hoặc phân phối sản phẩm. Quản lý lô nhận từ NSX, nhập/xuất kho, không tạo sản phẩm mới.",
  },
];

const CATEGORIES = ["Tất cả", "Nghiệp vụ", "Kỹ thuật", "AI", "Bảo mật", "Hải quan", "Actor", "Vận hành"];

const CAT_COLORS: Record<string, string> = {
  "Nghiệp vụ": "text-blue-300 bg-blue-500/15 border-blue-500/30",
  "Kỹ thuật":  "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
  "AI":        "text-purple-300 bg-purple-500/15 border-purple-500/30",
  "Bảo mật":   "text-red-300 bg-red-500/15 border-red-500/30",
  "Hải quan":  "text-amber-300 bg-amber-500/15 border-amber-500/30",
  "Actor":     "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  "Vận hành":  "text-slate-300 bg-white/10 border-white/20",
};

export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Tất cả");

  const filtered = GLOSSARY.filter(g =>
    (catFilter === "Tất cả" || g.category === catFilter) &&
    (g.term.toLowerCase().includes(search.toLowerCase()) ||
     g.abbr.toLowerCase().includes(search.toLowerCase()) ||
     g.definition.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span> Bảng điều khiển
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/20 border border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-300">menu_book</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white font-headline">Chú giải Thuật ngữ</h1>
            <p className="text-sm text-slate-400">Phần 13.2: Glossary (TABLE 21) · {GLOSSARY.length} thuật ngữ</p>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm thuật ngữ, viết tắt..."
            className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/40" />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${catFilter === cat ? "bg-white/20 text-white border-white/30" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">{filtered.length} thuật ngữ</p>

      {/* Glossary grid */}
      <div className="space-y-3">
        {filtered.map((g, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-5 hover:border-white/20 transition group">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition">{g.term}</h2>
                <span className="text-xs text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded">{g.abbr}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${CAT_COLORS[g.category] || ""}`}>
                {g.category}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{g.definition}</p>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
            Không tìm thấy thuật ngữ phù hợp
          </div>
        )}
      </div>
    </div>
  );
}
