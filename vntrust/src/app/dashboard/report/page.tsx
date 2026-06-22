"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── i18n helper: tr(vi, en) ─────────────────────────────────────────────────
function makeTr(lang: string) {
  return (vi: string, en: string) => (lang === 'en' ? en : vi);
}

type MucDoItem = { label: string; cls: string; icon: string };
const MUC_DO_MAP_FACTORY = (lang: string): Record<string, MucDoItem> => {
  const tr = makeTr(lang);
  return {
    low:    { label: tr("Thấp", "Low"),                cls: "text-blue-300 bg-[#C8A557]/15 border-[#C8A557]/30", icon: "info" },
    medium: { label: tr("Trung bình", "Medium"),       cls: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30", icon: "warning" },
    high:   { label: tr("Nghiêm trọng", "Severe"),     cls: "text-red-400 bg-red-500/15 border-red-500/30",    icon: "report" },
  };
};

const STATUS_MAP_FACTORY = (lang: string): Record<string, string> => {
  const tr = makeTr(lang);
  return {
    open:      tr("Đang xử lý", "Pending"),
    reviewing: tr("Đang điều tra", "Investigating"),
    closed:    tr("Đã đóng", "Closed"),
  };
};

interface Report {
  id: string;
  loai: string;
  mucDo: string;
  moTa: string;
  thoiGian: string;
  trangThai: string;
  uid?: string;
}

const parseReportDetails = (moTa: string) => {
  if (!moTa) return null;

  // Try JSON first
  try {
    if (moTa.trim().startsWith('{')) {
      const meta = JSON.parse(moTa);
      return {
        isJson: true,
        lyDo: meta.lyDo || "Báo cáo từ người dùng",
        loaiPhanAnh: meta.loaiPhanAnh,     // PHÂN HỆ 2 — Bước 1
        tenSanPham: meta.tenSanPham,        // Bước 2
        loaiSanPham: meta.loaiSanPham,
        noiMua: meta.noiMua,
        viTri: meta.viTri,
        giaMua: meta.giaMua,
        donViTien: meta.donViTien || "VND",
        // Bước 3 — người bán
        tenShop: meta.tenShop,
        linkSanPham: meta.linkSanPham,
        sdtNguoiBan: meta.sdtNguoiBan,
        // Bước 4 — liên hệ
        contactInfo: meta.contactInfo,
        anhBangChung: meta.anhBangChung || [],
      };
    }
  } catch (e) {}

  // Try parsing plain text format using regex
  // Format: [loaiSanPham] Serial: serial | Vị trí: viTri\nNgười báo cáo: contactInfo\nMô tả: moTa
  const regex = /^\[(.*?)\]\s*Serial:\s*(.*?)\s*\|\s*Vị trí:\s*(.*?)\nNgười báo cáo:\s*(.*?)\nMô tả:\s*([\s\S]*)$/;
  const match = moTa.trim().match(regex);
  if (match) {
    return {
      isJson: false,
      loaiSanPham: match[1] === "1" ? "Từ quét mã QR" : match[1],
      serial: match[2] === "N/A" ? null : match[2],
      viTri: match[3] === "N/A" ? null : match[3],
      contactInfo: match[4],
      lyDo: match[5],
      anhBangChung: [],
    };
  }

  return null;
};

// PHÂN HỆ 2 — Phản ánh & Báo cáo sản phẩm nghi ngờ
// 4 loại phản ánh theo tài liệu nghiệp vụ — multi-lang
const LOAI_PHAN_ANH_FACTORY = (lang: string) => {
  const tr = makeTr(lang);
  return [
    { key: "san_pham_nghi_ngo",  label: tr("Báo cáo sản phẩm nghi ngờ", "Suspected product report"), desc: tr("Hàng giả, kém chất lượng", "Counterfeit, low quality"),      icon: "inventory_2" },
    { key: "nguoi_ban_gian_lan", label: tr("Báo cáo người bán gian lận", "Fraudulent seller"),       desc: tr("Shop / tài khoản TMĐT", "Shop / e-commerce account"),         icon: "storefront" },
    { key: "quang_cao_sai",      label: tr("Quảng cáo sai sự thật", "Misleading advertisement"),     desc: tr("Cam kết không đúng thực tế", "False promises"),               icon: "campaign" },
    { key: "phan_hoi_xac_thuc",  label: tr("Phản hồi kết quả xác thực", "Feedback on verify result"), desc: tr("Kết quả AI VeriGoods không chính xác", "Inaccurate result"),      icon: "fact_check" },
  ];
};

export default function ReportFakePage() {
  const { lang } = useLanguage();
  const tr = makeTr(lang);
  const MUC_DO_MAP = MUC_DO_MAP_FACTORY(lang);
  const STATUS_MAP = STATUS_MAP_FACTORY(lang);
  const LOAI_PHAN_ANH = LOAI_PHAN_ANH_FACTORY(lang);
  const [tab, setTab] = useState<"report" | "list">("report");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [form, setForm] = useState({
    // Bước 1 — Loại phản ánh
    loaiPhanAnh: "san_pham_nghi_ngo",
    // Bước 2 — Thông tin sản phẩm
    tenSanPham: "",      // Tên SP / thương hiệu (mới)
    serial: "",          // Tem/mã vạch/QR code (nếu có)
    loaiSanPham: "",
    noiMua: "",          // Nơi mua: chợ/Shopee/TikTok/...
    viTri: "",           // Vị trí phát hiện (chi tiết)
    giaMua: "",          // Giá mua (mới, free-text vì chấp nhận số/khoảng giá)
    donViTien: "VND",
    moTa: "",            // Mô tả lý do nghi ngờ
    mucDo: "medium",
    // Bước 3 — Thông tin người bán (nếu có)
    tenShop: "",         // Tên shop / tài khoản (mới)
    linkSanPham: "",     // Link sản phẩm online (mới)
    sdtNguoiBan: "",     // SĐT / địa chỉ người bán (mới)
    // Bước 4 — Liên hệ người báo cáo
    thongTinLienHe: "",
    loaiBaoCao: "an_danh",
    anhBangChung: [] as string[],
  });
  const [uploadingImg, setUploadingImg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin & list: list reports
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [investigateModal, setInvestigateModal] = useState<Report | null>(null);
  const [investigateNote, setInvestigateNote] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    if (role === "admin") setTab("list");
  }, []);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/report?status=${statusFilter}&t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Lỗi tải danh sách");
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setReports([]);
    }
    setLoadingReports(false);
  };

  useEffect(() => {
    if (tab === "list") fetchReports();
  }, [tab, statusFilter]);

  // Reset pagination khi doi bo loc / chuyen tab
  useEffect(() => {
    setPage(1);
  }, [statusFilter, tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Bước 2 — bắt buộc: ảnh sản phẩm + mô tả lý do nghi ngờ
    if (form.anhBangChung.length === 0) { setError("Vui lòng tải lên ít nhất 1 ảnh sản phẩm / bao bì làm bằng chứng"); return; }
    if (!form.moTa.trim()) { setError("Vui lòng mô tả lý do nghi ngờ"); return; }
    setSubmitting(true);
    setError(null);
    try {
      // Đóng gói metadata theo cấu trúc PHÂN HỆ 2
      const metadata = {
        loaiPhanAnh: form.loaiPhanAnh,        // Bước 1
        tenSanPham:  form.tenSanPham,          // Bước 2
        noiMua:      form.noiMua,
        viTri:       form.viTri,
        giaMua:      form.giaMua ? parseFloat(form.giaMua.replace(/[^0-9.]/g, "")) || 0 : 0,
        donViTien:   form.donViTien,
        lyDo:        form.moTa,
        anhBangChung: form.anhBangChung,
        // Bước 3 — thông tin người bán
        tenShop:      form.tenShop,
        linkSanPham:  form.linkSanPham,
        sdtNguoiBan:  form.sdtNguoiBan,
        // Bước 4 — liên hệ người báo cáo
        contactInfo:  form.thongTinLienHe,
      };
      // Map form values → API whitelist
      const loaiPhanAnhMap: Record<string, string> = {
        san_pham_nghi_ngo: "san_pham",
        nguoi_ban_gian_lan: "shop_gian_lan",
        quang_cao_sai: "quang_cao_sai",
        phan_hoi_xac_thuc: "phan_hoi",
      };
      const noiMuaMap: Record<string, string> = {
        cho_truyen_thong: "cho",
        Shopee: "shopee",
        "TikTok Shop": "tiktok",
        Lazada: "lazada",
        Tiki: "tiki",
        Facebook: "facebook",
        Sieu_thi: "khac",
        Khac: "khac",
      };
      const payload = {
        serial: form.serial,
        loaiSanPham: form.loaiSanPham || LOAI_PHAN_ANH.find(o => o.key === form.loaiPhanAnh)?.label,
        viTri: form.viTri,
        moTa: form.moTa,
        mucDo: form.mucDo,
        thongTinLienHe: form.thongTinLienHe,
        loaiBaoCao: form.loaiBaoCao,
        anhBangChung: form.anhBangChung,
        // Top-level fields cho API whitelist
        loaiPhanAnh: loaiPhanAnhMap[form.loaiPhanAnh] || "san_pham",
        noiMua: noiMuaMap[form.noiMua] || null,
        giaMua: metadata.giaMua > 0 ? metadata.giaMua : null,
        metadata,
      };
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Lỗi gửi báo cáo"); }
      else {
        setSuccess(data.reportId);
        setForm({
          loaiPhanAnh: "san_pham_nghi_ngo",
          tenSanPham: "", serial: "", loaiSanPham: "",
          noiMua: "", viTri: "", giaMua: "", donViTien: "VND",
          moTa: "", mucDo: "medium",
          tenShop: "", linkSanPham: "", sdtNguoiBan: "",
          thongTinLienHe: "", loaiBaoCao: "an_danh", anhBangChung: [],
        });
      }
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    }
    setSubmitting(false);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "report");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) {
        setForm(f => ({ ...f, anhBangChung: [...f.anhBangChung, d.url] }));
      } else {
        alert(d.error || "Upload thất bại");
      }
    } catch {
      alert("Lỗi upload");
    }
    setUploadingImg(false);
  };

  const handleRemoveImage = (index: number) => {
    setForm(f => ({
      ...f,
      anhBangChung: f.anhBangChung.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateStatus = async (id: string, trangThai: string, ghiChu?: string) => {
    setUpdatingId(id);
    await fetch("/api/report", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, trangThai, ghiChu }),
    });
    await fetchReports();
    setUpdatingId(null);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full p-3 sm:p-4 md:p-8 xl:p-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5 sm:mb-8">
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-3 sm:mb-4">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {tr("Bảng điều khiển", "Dashboard")}
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-400 text-xl sm:text-2xl">report</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-display leading-tight">{tr("Báo cáo Hàng giả", "Fake Goods Report")}</h1>
              <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5 leading-tight">{tr("Gửi báo cáo ẩn danh — Danh tính được bảo mật", "Anonymous report — Your identity is fully protected")}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {userRole !== null && (
          <div className="flex gap-2 mb-5 sm:mb-8 overflow-x-auto hide-scrollbar -mx-1 px-1">
            <button
              onClick={() => setTab("report")}
              className={`shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                tab === "report" ? "bg-[#C8A557] text-[#0B1623] border-[#C8A557]" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}
            >
              <span className="material-symbols-outlined text-[14px] sm:text-[16px]">add_circle</span>
              {tr("Gửi báo cáo", "Submit Report")}
            </button>
            <button
              onClick={() => setTab("list")}
              className={`shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                tab === "list" ? "bg-[#C8A557] text-[#0B1623] border-[#C8A557]" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}
            >
              <span className="material-symbols-outlined text-[14px] sm:text-[16px]">list</span>
              {tr("Danh sách báo cáo", "Report List")}
            </button>
          </div>
        )}

        {tab === "report" || userRole === null ? (
          /* ── Report Form ──
             User feedback: KHÔNG dùng layout 2 cột — mọi section full-width stacked dọc.
             Dùng flex flex-col với gap đều, KHÔNG có grid hay col-span. */
          <div className="flex flex-col gap-5 sm:gap-6 max-w-3xl mx-auto">
            {/* Form section — full width, stacked dọc */}
            <div className="w-full min-w-0">
              {/* Privacy note */}
              <div className="p-4 sm:p-5 bg-[#C8A557]/10 border border-[#C8A557]/20 rounded-2xl mb-5 sm:mb-6 flex gap-3 sm:gap-4">
                <span className="material-symbols-outlined text-[#C8A557] shrink-0 mt-0.5 text-xl sm:text-2xl">shield</span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#C8A557] mb-1">{tr("Bảo mật danh tính hoàn toàn", "Full identity protection")}</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    {tr(
                      "Báo cáo của bạn sẽ được ẩn danh hoá (IP hash). Chúng tôi không lưu trữ thông tin cá nhân định danh — tuân thủ GDPR & Luật Bảo vệ Dữ liệu cá nhân 2025.",
                      "Your report will be anonymized (IP hash). We do not store personally identifiable information — GDPR & Personal Data Protection Law 2025 compliant."
                    )}
                  </p>
                </div>
              </div>

              {success ? (
                <div className="p-10 bg-[#4A7C5C]/10 border border-[#4A7C5C]/30 rounded-2xl text-center">
                  <span className="material-symbols-outlined text-6xl text-[#6FB585] block mb-4">task_alt</span>
                  <h3 className="text-2xl font-bold text-white mb-2">{tr("Đã gửi báo cáo thành công!", "Report submitted successfully!")}</h3>
                  <p className="text-slate-400 text-sm mb-1">{tr("Mã theo dõi", "Tracking code")}: <span className="font-mono font-bold text-white text-lg">{success}</span></p>
                  <p className="text-slate-400 text-sm mb-8">{tr("Đội ngũ AI VeriGoods sẽ điều tra và phản hồi trong vòng 24 giờ.", "The AI VeriGoods team will investigate and respond within 24 hours.")}</p>
                  <button
                    onClick={() => setSuccess(null)}
                    className="px-8 py-3 bg-[#4A7C5C] text-white rounded-xl font-bold hover:bg-[#4A7C5C] transition"
                  >
                    {tr("Gửi báo cáo khác", "Submit another report")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* ══════ BƯỚC 1 — LOẠI PHẢN ÁNH ══════ */}
                  <section className="p-4 sm:p-5 bg-white/[0.03] border border-[#C8A557]/15 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-[#C8A557] text-[#0B1623] text-xs font-black flex items-center justify-center">1</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{tr("Chọn loại phản ánh", "Choose report type")} <span className="text-red-400">*</span></h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {LOAI_PHAN_ANH.map(opt => (
                        <button type="button" key={opt.key}
                          onClick={() => setForm(f => ({ ...f, loaiPhanAnh: opt.key }))}
                          className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                            form.loaiPhanAnh === opt.key
                              ? "bg-[#C8A557]/15 border-[#C8A557]/60 text-[#F6F1E8]"
                              : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-xl shrink-0 ${form.loaiPhanAnh === opt.key ? "text-[#C8A557]" : "text-slate-400"}`}>{opt.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight">{opt.label}</p>
                            <p className="text-[10px] opacity-70 mt-0.5">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* ══════ BƯỚC 2 — THÔNG TIN SẢN PHẨM ══════ */}
                  <section className="p-4 sm:p-5 bg-white/[0.03] border border-[#C8A557]/15 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#C8A557] text-[#0B1623] text-xs font-black flex items-center justify-center">2</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{tr("Thông tin sản phẩm", "Product information")}</h3>
                    </div>

                    {/* Tên SP / Thương hiệu */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("Tên sản phẩm / Thương hiệu", "Product name / Brand")}</label>
                      <input
                        value={form.tenSanPham}
                        onChange={e => setForm(f => ({ ...f, tenSanPham: e.target.value }))}
                        placeholder={tr("VD: Sữa Vinamilk 100% Organic, Mỹ phẩm Innisfree...", "E.g. Vinamilk 100% Organic milk, Innisfree cosmetics...")}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition"
                      />
                    </div>

                    {/* Mã serial/QR/Barcode */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {tr("Mã Serial / UID / Mã vạch", "Serial / UID / Barcode")} <span className="text-slate-400 font-normal normal-case ml-1 text-[10px] opacity-70">{tr("(nếu có)", "(if any)")}</span>
                      </label>
                      <input
                        value={form.serial}
                        onChange={e => setForm(f => ({ ...f, serial: e.target.value }))}
                        placeholder={tr("VD: EDG123456 hoặc 8934803010023 (barcode)", "E.g. EDG123456 or 8934803010023 (barcode)")}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] font-mono transition"
                      />
                    </div>

                    {/* Loại SP + Nơi mua */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("Loại sản phẩm", "Product type")}</label>
                        <input
                          value={form.loaiSanPham}
                          onChange={e => setForm(f => ({ ...f, loaiSanPham: e.target.value }))}
                          placeholder={tr("VD: Thực phẩm, Dược phẩm, Mỹ phẩm...", "E.g. Food, Pharma, Cosmetics...")}
                          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("Nơi mua", "Purchase channel")}</label>
                        <select
                          value={form.noiMua}
                          onChange={e => setForm(f => ({ ...f, noiMua: e.target.value }))}
                          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A557] transition"
                        >
                          <option value="" className="bg-[#0B1623]">{tr("— Chọn kênh mua —", "— Select channel —")}</option>
                          <option value="cho_truyen_thong" className="bg-[#0B1623]">{tr("Chợ truyền thống", "Traditional market")}</option>
                          <option value="Shopee" className="bg-[#0B1623]">Shopee</option>
                          <option value="TikTok Shop" className="bg-[#0B1623]">TikTok Shop</option>
                          <option value="Lazada" className="bg-[#0B1623]">Lazada</option>
                          <option value="Tiki" className="bg-[#0B1623]">Tiki</option>
                          <option value="Facebook" className="bg-[#0B1623]">Facebook</option>
                          <option value="Sieu_thi" className="bg-[#0B1623]">{tr("Siêu thị / Cửa hàng", "Supermarket / Store")}</option>
                          <option value="Khac" className="bg-[#0B1623]">{tr("Khác", "Other")}</option>
                        </select>
                      </div>
                    </div>

                    {/* Vị trí cụ thể */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("Vị trí phát hiện", "Discovery location")}</label>
                      <input
                        value={form.viTri}
                        onChange={e => setForm(f => ({ ...f, viTri: e.target.value }))}
                        placeholder={tr("VD: Chợ Bến Thành, Q1, TP.HCM...", "E.g. Ben Thanh Market, D1, HCMC...")}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition"
                      />
                    </div>

                    {/* Giá mua */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {tr("Giá mua", "Purchase price")} <span className="text-slate-400 font-normal normal-case ml-1 text-[10px] opacity-70">{tr("(phát hiện giá rẻ bất thường)", "(detect abnormally low price)")}</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={form.giaMua}
                          onChange={e => setForm(f => ({ ...f, giaMua: e.target.value.replace(/[^0-9.]/g, "") }))}
                          inputMode="numeric"
                          placeholder={tr("VD: 150000", "E.g. 150000")}
                          className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition"
                        />
                        <select
                          value={form.donViTien}
                          onChange={e => setForm(f => ({ ...f, donViTien: e.target.value }))}
                          className="bg-white/5 border border-white/20 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#C8A557] cursor-pointer"
                        >
                          <option value="VND" className="bg-[#0B1623]">VNĐ</option>
                          <option value="USD" className="bg-[#0B1623]">USD</option>
                        </select>
                      </div>
                    </div>

                    {/* Mô tả lý do */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {tr("Mô tả lý do nghi ngờ", "Reason for suspicion")} <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={form.moTa}
                        onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))}
                        rows={4}
                        required
                        placeholder={tr(
                          "Mô tả chi tiết: mẫu mã khác thường, giá bán thấp bất thường, tem nhãn bị bóc dán lại, bao bì sai chữ, màu sắc khác so với hàng chính hãng...",
                          "Detailed description: unusual model, abnormally low price, peeled/reglued label, mistyped packaging, color different from genuine product..."
                        )}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] resize-none transition"
                      />
                    </div>
                  </section>
                  {/* Hình ảnh bằng chứng — vẫn trong Bước 2 */}
                  <section className="p-4 sm:p-5 bg-white/[0.03] border border-[#C8A557]/15 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-[#C8A557] text-[#0B1623] text-xs font-black flex items-center justify-center">2.b</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{tr("Hình ảnh bằng chứng", "Evidence photos")} <span className="text-red-400">*</span></h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">{tr("Chụp rõ sản phẩm, bao bì, tem nhãn, mã vạch/QR. Tối đa 4 ảnh, mỗi ảnh ≤ 5MB.", "Take clear photos of product, packaging, label, barcode/QR. Max 4 photos, ≤ 5MB each.")}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {form.anhBangChung.map((img, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-[#C8A557]/40 group bg-white/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="Bằng chứng" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-sm transition shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {form.anhBangChung.length < 4 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-[#C8A557]/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/10 transition">
                          <span className="material-symbols-outlined text-2xl text-[#C8A557]">cloud_upload</span>
                          <span className="text-[10px] text-slate-400">{uploadingImg ? tr("Đang tải...", "Uploading...") : tr("Tải ảnh lên", "Upload photo")}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingImg}
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </section>

                  {/* ══════ BƯỚC 3 — THÔNG TIN NGƯỜI BÁN ══════ */}
                  <section className="p-4 sm:p-5 bg-white/[0.03] border border-[#C8A557]/15 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#C8A557] text-[#0B1623] text-xs font-black flex items-center justify-center">3</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{tr("Thông tin người bán", "Seller information")} <span className="text-slate-400 font-normal normal-case ml-1 text-[10px] opacity-70">{tr("(nếu có)", "(if any)")}</span></h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("Tên shop / Tài khoản", "Shop / Account name")}</label>
                        <input
                          value={form.tenShop}
                          onChange={e => setForm(f => ({ ...f, tenShop: e.target.value }))}
                          placeholder={tr("VD: Shop ABC Official, @username...", "E.g. Shop ABC Official, @username...")}
                          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("SĐT / Địa chỉ người bán", "Phone / Seller address")}</label>
                        <input
                          value={form.sdtNguoiBan}
                          onChange={e => setForm(f => ({ ...f, sdtNguoiBan: e.target.value }))}
                          placeholder={tr("VD: 0987654321 hoặc địa chỉ shop...", "E.g. 0987654321 or shop address...")}
                          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("Link sản phẩm online", "Online product link")}</label>
                      <input
                        type="url"
                        value={form.linkSanPham}
                        onChange={e => setForm(f => ({ ...f, linkSanPham: e.target.value }))}
                        placeholder="VD: https://shopee.vn/product-..."
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition font-mono"
                      />
                    </div>
                  </section>

                  {/* ══════ BƯỚC 4 — XÁC NHẬN & GỬI ══════ */}
                  <section className="p-4 sm:p-5 bg-white/[0.03] border border-[#C8A557]/15 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#C8A557] text-[#0B1623] text-xs font-black flex items-center justify-center">4</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{tr("Xác nhận & gửi", "Confirm & submit")}</h3>
                    </div>

                    {/* Mức độ */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("Mức độ nghiêm trọng", "Severity level")}</label>
                      <div className="flex gap-2 sm:gap-3">
                        {(Object.entries(MUC_DO_MAP) as [string, MucDoItem][]).map(([key, val]) => (
                          <button type="button" key={key}
                            onClick={() => setForm(f => ({ ...f, mucDo: key }))}
                            className={`flex-1 min-w-0 py-2.5 sm:py-3 px-1 rounded-xl text-[11px] sm:text-sm font-bold border transition flex items-center justify-center gap-1 sm:gap-2 ${
                              form.mucDo === key ? val.cls : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px] sm:text-[16px] shrink-0">{val.icon}</span>
                            <span className="truncate">{val.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chế độ chia sẻ */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{tr("Chế độ báo cáo", "Report mode")}</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { key: "an_danh",   label: tr("Ẩn danh",   "Anonymous"),    desc: tr("Không lưu thông tin cá nhân", "Personal info not stored"),         icon: "person_off" },
                          { key: "lien_he",   label: tr("Có liên hệ", "With contact"), desc: tr("Email/SĐT được mã hóa bảo mật", "Email/Phone encrypted"),         icon: "lock_person" },
                          { key: "cong_khai", label: tr("Công khai",  "Public"),       desc: tr("Tên bạn hiển thị trên báo cáo", "Your name shown on the report"), icon: "person" },
                        ].map(opt => (
                          <button type="button" key={opt.key}
                            onClick={() => setForm(f => ({ ...f, loaiBaoCao: opt.key }))}
                            className={`p-3 rounded-xl border text-left transition ${
                              form.loaiBaoCao === opt.key
                                ? "bg-[#C8A557]/20 border-[#C8A557]/50 text-[#F6F1E8]"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                            }`}
                          >
                            <span className={`material-symbols-outlined text-lg block mb-1 ${form.loaiBaoCao === opt.key ? "text-[#C8A557]" : ""}`}>{opt.icon}</span>
                            <p className="text-xs font-bold">{opt.label}</p>
                            <p className="text-[10px] opacity-70">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                      {form.loaiBaoCao !== "an_danh" && (
                        <input
                          value={form.thongTinLienHe}
                          onChange={e => setForm(f => ({ ...f, thongTinLienHe: e.target.value }))}
                          placeholder={form.loaiBaoCao === "lien_he"
                            ? tr("Email hoặc số điện thoại (sẽ được mã hóa)", "Email or phone (will be encrypted)")
                            : tr("Tên hoặc biệt danh của bạn", "Your name or nickname")}
                          className="w-full mt-3 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition"
                        />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <span className="material-symbols-outlined text-[14px] text-[#C8A557]">tag</span>
                      {tr("Hệ thống sẽ tạo mã báo cáo duy nhất để bạn theo dõi tiến trình điều tra.", "The system will generate a unique report code so you can track the investigation.")}
                    </p>
                  </section>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={submitting}
                    style={{ background: 'linear-gradient(135deg,#E4D2A1,#C8A557)' }}
                    className="w-full py-4 text-[#0B1623] rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg shadow-[#C8A557]/25 hover:brightness-105"
                  >
                    {submitting ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#0B1623]" />
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    )}
                    {form.loaiBaoCao === "an_danh"
                      ? tr("Gửi báo cáo ẩn danh", "Submit anonymous report")
                      : tr("Gửi báo cáo", "Submit report")}
                  </button>
                </form>
              )}
            </div>

            {/* Guide panel — full width, stacked DƯỚI form, mỗi card xếp dọc 1 cột duy nhất */}
            <div className="w-full min-w-0 flex flex-col gap-3 sm:gap-4">
              <div className="glass-panel border border-white/10 rounded-2xl p-4 sm:p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#C8A557]">help</span>
                  {tr("Cần báo cáo gì?", "What to report?")}
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: "qr_code",      title: tr("Mã QR lỗi", "Faulty QR code"),         desc: tr("Quét ra kết quả không khớp sản phẩm thực tế", "Scan results don't match actual product") },
                    { icon: "warning",      title: tr("Bao bì khác lạ", "Unusual packaging"), desc: tr("Màu sắc, font chữ, logo khác so với hàng chính hãng", "Color, font, logo differ from genuine") },
                    { icon: "price_change", title: tr("Giá bất thường", "Abnormal price"),    desc: tr("Giá rẻ hơn nhiều so với giá thị trường chính thức", "Much cheaper than official market price") },
                    { icon: "store",        title: tr("Nơi bán đáng ngờ", "Suspicious seller"), desc: tr("Mua tại chỗ không phải đại lý ủy quyền", "Bought from non-authorized dealer") },
                  ].map(item => (
                    <div key={item.icon} className="flex gap-3">
                      <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{item.title}</p>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400">phone</span>
                  {tr("Đường dây khẩn cấp", "Emergency hotline")}
                </h3>
                <div className="space-y-2">
                  <a href="tel:1800" className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition">
                    <span className="material-symbols-outlined text-red-400">call</span>
                    <div>
                      <p className="text-xs font-bold text-white">Hotline: 1800 6789</p>
                      <p className="text-[10px] text-slate-400">{tr("Miễn phí · 24/7", "Free · 24/7")}</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <span className="material-symbols-outlined text-slate-400">mail</span>
                    <div>
                      <p className="text-xs font-bold text-white">report@vntrust.vn</p>
                      <p className="text-[10px] text-slate-400">{tr("Phản hồi trong 24 giờ", "Reply within 24h")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Report List (Admin + Consumer) ── */
          <div>
            <div className="flex gap-2 mb-6 flex-wrap">
              {[["open", "Đang xử lý"], ["reviewing", "Đang điều tra"], ["closed", "Đã đóng"], ["all", "Tất cả"]].map(([k, l]) => (
                <button key={k} onClick={() => setStatusFilter(k)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    statusFilter === k ? "bg-[#C8A557] text-white border-[#C8A557]" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >{l}</button>
              ))}
            </div>

            {loadingReports ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#C8A557]" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-24 text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4 block">check_circle</span>
                <p className="text-lg font-bold text-white mb-2">Không có báo cáo nào</p>
                <p className="text-sm">Chưa có báo cáo nào với trạng thái này</p>
              </div>
            ) : (
              <>
              <div className="space-y-3">
                {reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(r => {
                  const mucDo = MUC_DO_MAP[r.mucDo] || MUC_DO_MAP.medium;
                  return (
                    <div key={r.id} 
                      onClick={() => userRole === "admin" && setInvestigateModal(r)}
                      className={`glass-panel border border-white/10 rounded-2xl p-5 transition ${userRole === "admin" ? "cursor-pointer hover:border-white/30" : "hover:border-white/20"}`}>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${mucDo.cls}`}>
                              <span className="material-symbols-outlined text-[12px]">{mucDo.icon}</span>
                              {mucDo.label}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              r.trangThai === "open" ? "bg-[#C8A557]/15 text-amber-300 border-[#C8A557]/30" :
                              r.trangThai === "reviewing" ? "bg-[#C8A557]/15 text-blue-300 border-[#C8A557]/30" :
                              "bg-[#4A7C5C]/15 text-emerald-300 border-[#4A7C5C]/30"
                            }`}>
                              {STATUS_MAP[r.trangThai] || r.trangThai}
                            </span>
                            {r.uid && (
                              <span className="font-mono text-xs text-cyan-300 bg-[#C8A557]/10 px-2 py-0.5 rounded-lg border border-[#C8A557]/20">
                                UID: {r.uid}
                              </span>
                            )}
                            <span className="text-xs text-slate-500">{new Date(r.thoiGian).toLocaleString("vi-VN")}</span>
                          </div>
                          {(() => {
                            const data = parseReportDetails(r.moTa);
                            if (data) {
                              return (
                                <div className="space-y-2 mt-1">
                                  <p className="text-sm text-white font-bold leading-snug">{data.lyDo || "Báo cáo từ người dùng"}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs bg-white/5 p-3 rounded-xl border border-white/10 mt-1 max-w-2xl">
                                    {data.loaiSanPham && (
                                      <p className="flex items-center gap-1.5">
                                        <span className="text-slate-400">Loại SP:</span>
                                        <span className="text-slate-200 font-medium">{data.loaiSanPham}</span>
                                      </p>
                                    )}
                                    {data.viTri && (
                                      <p className="flex items-center gap-1.5">
                                        <span className="text-slate-400">Vị trí:</span>
                                        <span className="text-slate-200 font-medium">{data.viTri}</span>
                                      </p>
                                    )}
                                    {data.giaMua !== undefined && (
                                      <p className="flex items-center gap-1.5">
                                        <span className="text-slate-400">Giá mua:</span>
                                        <span className="text-[#C8A557] font-bold">
                                          {Number(data.giaMua).toLocaleString("vi-VN")} {data.donViTien || "VND"}
                                        </span>
                                      </p>
                                    )}
                                    {data.serial && (
                                      <p className="flex items-center gap-1.5">
                                        <span className="text-slate-400">Serial:</span>
                                        <span className="text-cyan-300 font-mono">{data.serial}</span>
                                      </p>
                                    )}
                                    {data.contactInfo && (
                                      <p className="flex items-center gap-1.5">
                                        <span className="text-slate-400">Liên hệ:</span>
                                        <span className="text-slate-300 font-medium">{data.contactInfo}</span>
                                      </p>
                                    )}
                                  </div>
                                  {data.anhBangChung && data.anhBangChung.length > 0 && (
                                    <div className="flex gap-2 mt-2">
                                      {data.anhBangChung.map((img: string, i: number) => (
                                        <a
                                          key={i}
                                          href={img}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center border border-white/10 hover:border-[#C8A557] overflow-hidden shrink-0 transition"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={img} alt="Bằng chứng" className="w-full h-full object-cover" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return <p className="text-sm text-slate-200 leading-relaxed break-all whitespace-pre-wrap">{r.moTa}</p>;
                          })()}
                        </div>
                        {userRole === "admin" && (
                          <div className="flex gap-2 shrink-0">
                            {r.trangThai !== "reviewing" && (
                              <button onClick={() => setInvestigateModal(r)} disabled={updatingId === r.id}
                                className="px-3 py-1.5 bg-[#C8A557]/20 text-amber-300 border border-[#C8A557]/30 rounded-lg text-xs font-bold hover:bg-[#C8A557]/30 transition disabled:opacity-50">
                                Điều tra
                              </button>
                            )}
                            {r.trangThai !== "closed" && (
                              <button onClick={() => handleUpdateStatus(r.id, "closed")} disabled={updatingId === r.id}
                                className="px-3 py-1.5 bg-[#4A7C5C]/20 text-emerald-300 border border-[#4A7C5C]/30 rounded-lg text-xs font-bold hover:bg-[#4A7C5C]/30 transition disabled:opacity-50">
                                Đóng
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination — chi hien khi co nhieu hon 1 trang */}
              {Math.ceil(reports.length / PAGE_SIZE) > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    {tr("Trước", "Prev")}
                  </button>
                  <span className="text-xs font-bold text-slate-300">
                    {tr("Trang", "Page")} {page}/{Math.ceil(reports.length / PAGE_SIZE)}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(reports.length / PAGE_SIZE), p + 1))}
                    disabled={page >= Math.ceil(reports.length / PAGE_SIZE)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {tr("Sau", "Next")}
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        )}

      {/* Investigation Modal (2-Column Layout) */}
      {investigateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInvestigateModal(null)}>
          <div className="bg-[#0B1623] border border-[#C8A557]/30 rounded-3xl p-0 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
            
            {/* Left Column: Evidence Details */}
            <div className="flex-1 min-w-0 p-7 bg-white/5 overflow-y-auto custom-scrollbar border-r border-white/10 flex flex-col">
              <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#C8A557]/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#C8A557]">plagiarism</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Chi tiết Bằng chứng</h3>
                  <p className="text-xs text-slate-400">Dữ liệu từ người dùng báo cáo</p>
                </div>
              </div>

              <div className="space-y-4 shrink-0">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-black/20 rounded-xl border border-white/5 min-w-0">
                     <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">UID / Serial</span>
                     <span className="text-sm text-cyan-300 font-mono break-all">{investigateModal.uid || 'N/A'}</span>
                   </div>
                   <div className="p-4 bg-black/20 rounded-xl border border-white/5 min-w-0">
                     <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Thời gian</span>
                     <span className="text-sm text-white break-words">{new Date(investigateModal.thoiGian).toLocaleString('vi-VN')}</span>
                   </div>
                </div>
                
                <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex flex-col min-h-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2 shrink-0">Nội dung báo cáo</span>
                  {(() => {
                    const data = parseReportDetails(investigateModal.moTa);
                    if (data) {
                       return (
                         <div className="space-y-3 text-sm text-slate-200 flex flex-col min-h-0">
                           {data.loaiSanPham && <p className="break-words"><strong className="text-[#C8A557] font-medium">Loại SP:</strong> {data.loaiSanPham}</p>}
                           {data.giaMua !== undefined && <p className="break-words"><strong className="text-[#C8A557] font-medium">Giá mua:</strong> {Number(data.giaMua).toLocaleString('vi-VN')} {data.donViTien || 'VND'}</p>}
                           {data.viTri && <p className="break-words"><strong className="text-[#C8A557] font-medium">Nơi mua:</strong> {data.viTri}</p>}
                           {data.serial && <p className="break-words"><strong className="text-cyan-300 font-mono">Serial:</strong> {data.serial}</p>}
                           {data.contactInfo && <p className="break-words"><strong className="text-[#C8A557] font-medium">Người báo cáo:</strong> {data.contactInfo}</p>}
                           {data.lyDo && (
                             <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg flex flex-col min-h-0 shrink-0">
                               <strong className="block text-[#C8A557] font-medium mb-2 shrink-0">Lý do nghi ngờ:</strong>
                               <div className="whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto custom-scrollbar pr-2 leading-relaxed">
                                 {data.lyDo}
                               </div>
                             </div>
                           )}
                         </div>
                       );
                    }
                    return (
                      <div className="text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                        {investigateModal.moTa}
                      </div>
                    );
                  })()}
                </div>

                <div className="p-4 bg-black/20 rounded-xl border border-white/5 shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-3">Hình ảnh đính kèm</span>
                  {(() => {
                     const data = parseReportDetails(investigateModal.moTa);
                     const images = data?.anhBangChung || [];
                     if (images.length > 0) {
                        return (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                               {images.map((img: string, i: number) => (
                                 <a key={i} href={img} target="_blank" rel="noreferrer" className="aspect-square bg-black/30 rounded-lg flex items-center justify-center border border-white/10 cursor-pointer hover:border-[#C8A557] hover:shadow-lg transition overflow-hidden">
                                   {/* eslint-disable-next-line @next/next/no-img-element */}
                                   <img src={img} alt="Bằng chứng" className="w-full h-full object-cover" />
                                 </a>
                               ))}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 text-center">Click vào ảnh để xem bản gốc</p>
                          </>
                        );
                     }

                     return (
                        <p className="text-xs text-slate-500 italic">Không có hình ảnh đính kèm</p>
                     );
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column: Investigation Form */}
            <div className="w-full md:w-[400px] p-7 bg-[#0B1623] overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#C8A557]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#C8A557]">manage_search</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Xử lý Điều tra</h3>
                  <p className="text-xs text-slate-400">Cập nhật trạng thái và ghi chú</p>
                </div>
              </div>

              <div className="flex-1 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Ghi chú điều tra / Kết quả xử lý
                  </label>
                  <textarea
                    value={investigateNote}
                    onChange={e => setInvestigateNote(e.target.value)}
                    rows={6}
                    placeholder="VD: Đã liên hệ đại lý, xác nhận lỗi in ấn tem nhãn... hoặc phát hiện hàng giả, yêu cầu cơ quan chức năng can thiệp."
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] resize-none custom-scrollbar"
                  />
                </div>

                <div className="flex items-center gap-3 bg-black/20 border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/5 transition" onClick={() => setSendEmail(!sendEmail)}>
                  <input type="checkbox" checked={sendEmail} onChange={() => {}} className="rounded bg-white/10 border-white/20 text-[#C8A557] focus:ring-[#C8A557] w-4 h-4 cursor-pointer" />
                  <div>
                      <span className="text-sm text-slate-200 font-bold block mb-0.5">Gửi Email thông báo</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Gửi kết quả điều tra ẩn danh (nếu người dùng có cung cấp liên hệ)</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-auto">
                <button type="button" onClick={() => { setInvestigateModal(null); setInvestigateNote(""); setSendEmail(false); }}
                  className="px-5 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">Huỷ</button>
                <button type="button" disabled={updatingId === investigateModal.id || !investigateNote.trim()}
                  onClick={async () => {
                     let finalNote = investigateNote;
                     if (sendEmail) finalNote += " [HỆ THỐNG: Đã gửi Email kết quả tới người báo cáo]";
                     await handleUpdateStatus(investigateModal.id, "reviewing", finalNote);
                     setInvestigateModal(null);
                     setInvestigateNote("");
                     setSendEmail(false);
                  }}
                  className="flex-1 py-3 bg-[#C8A557] hover:bg-[#C8A557] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Lưu & Điều tra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
