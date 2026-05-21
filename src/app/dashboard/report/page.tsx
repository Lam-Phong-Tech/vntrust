"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const MUC_DO_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  low:    { label: "Thấp",    cls: "text-blue-300 bg-blue-500/15 border-blue-500/30",     icon: "info" },
  medium: { label: "Trung bình", cls: "text-amber-300 bg-amber-500/15 border-amber-500/30", icon: "warning" },
  high:   { label: "Nghiêm trọng", cls: "text-red-400 bg-red-500/15 border-red-500/30",    icon: "report" },
};

const STATUS_MAP: Record<string, string> = {
  open: "Đang xử lý",
  reviewing: "Đang điều tra",
  closed: "Đã đóng",
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

export default function ReportFakePage() {
  const [tab, setTab] = useState<"report" | "list">("report");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [form, setForm] = useState({
    serial: "",
    loaiSanPham: "",
    viTri: "",
    moTa: "",
    mucDo: "medium",
    thongTinLienHe: "",
    loaiBaoCao: "an_danh",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin & list: list reports
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [investigateModal, setInvestigateModal] = useState<Report | null>(null);
  const [investigateNote, setInvestigateNote] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role || "consumer");
    if (role === "admin") setTab("list");
  }, []);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/report?status=${statusFilter}`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.moTa.trim()) { setError("Vui lòng mô tả vấn đề"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Lỗi gửi báo cáo"); }
      else {
        setSuccess(data.reportId);
        setForm({ serial: "", loaiSanPham: "", viTri: "", moTa: "", mucDo: "medium", thongTinLienHe: "", loaiBaoCao: "an_danh" });
      }
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    }
    setSubmitting(false);
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
    <div className="min-h-[calc(100vh-80px)] w-full p-4 md:p-8 xl:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-4">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> Bảng điều khiển
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-400 text-2xl">report</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white font-headline">Báo cáo Hàng giả</h1>
              <p className="text-sm text-slate-400 mt-0.5">Gửi báo cáo ẩn danh — Danh tính hoàn toàn được bảo mật</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab("report")}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition border flex items-center gap-2 ${
              tab === "report" ? "bg-red-500 text-white border-red-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Gửi báo cáo
          </button>
          <button
            onClick={() => setTab("list")}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition border flex items-center gap-2 ${
              tab === "list" ? "bg-cyan-500 text-white border-cyan-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">list</span>
            Danh sách báo cáo
          </button>
        </div>

        {tab === "report" ? (
          /* ── Report Form ── */
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left: Form */}
            <div className="xl:col-span-2">
              {/* Privacy note */}
              <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-6 flex gap-4">
                <span className="material-symbols-outlined text-blue-400 shrink-0 mt-0.5 text-2xl">shield</span>
                <div>
                  <p className="text-sm font-bold text-blue-300 mb-1">Bảo mật danh tính hoàn toàn</p>
                  <p className="text-xs text-slate-400">
                    Báo cáo của bạn sẽ được ẩn danh hoá (IP hash). Chúng tôi không lưu trữ thông tin cá nhân định danh — tuân thủ GDPR & Luật Bảo vệ Dữ liệu cá nhân 2025.
                  </p>
                </div>
              </div>

              {success ? (
                <div className="p-10 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                  <span className="material-symbols-outlined text-6xl text-emerald-400 block mb-4">task_alt</span>
                  <h3 className="text-2xl font-bold text-white mb-2">Đã gửi báo cáo thành công!</h3>
                  <p className="text-slate-400 text-sm mb-1">Mã theo dõi: <span className="font-mono font-bold text-white text-lg">{success}</span></p>
                  <p className="text-slate-400 text-sm mb-8">Đội ngũ VNTrust sẽ điều tra và phản hồi trong vòng 24 giờ.</p>
                  <button
                    onClick={() => setSuccess(null)}
                    className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-400 transition"
                  >
                    Gửi báo cáo khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Serial */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Mã Serial / UID sản phẩm <span className="text-slate-400 font-normal normal-case ml-1 text-[10px] opacity-70">(không bắt buộc)</span>
                    </label>
                    <input
                      value={form.serial}
                      onChange={e => setForm(f => ({ ...f, serial: e.target.value }))}
                      placeholder="VD: EDG123456 hoặc để trống nếu không có"
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition"
                    />
                  </div>

                  {/* Loại SP + Vị trí */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Loại sản phẩm</label>
                      <input
                        value={form.loaiSanPham}
                        onChange={e => setForm(f => ({ ...f, loaiSanPham: e.target.value }))}
                        placeholder="VD: Thực phẩm, Dược phẩm, Mỹ phẩm..."
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Vị trí phát hiện</label>
                      <input
                        value={form.viTri}
                        onChange={e => setForm(f => ({ ...f, viTri: e.target.value }))}
                        placeholder="VD: Chợ Bến Thành, Hà Nội..."
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>
                  </div>

                  {/* Mô tả */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Mô tả vấn đề <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={form.moTa}
                      onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))}
                      rows={5}
                      required
                      placeholder="Mô tả chi tiết: mẫu mã khác thường, giá bán thấp bất thường, tem nhãn bị bóc dán lại, bao bì sai chữ, màu sắc khác so với hàng chính hãng..."
                      className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 resize-none transition"
                    />
                  </div>

                  {/* Mức độ */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Mức độ nghiêm trọng</label>
                    <div className="flex gap-3">
                      {(Object.entries(MUC_DO_MAP) as [string, typeof MUC_DO_MAP[string]][]).map(([key, val]) => (
                        <button type="button" key={key}
                          onClick={() => setForm(f => ({ ...f, mucDo: key }))}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold border transition flex items-center justify-center gap-2 ${
                            form.mucDo === key ? val.cls : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{val.icon}</span>
                          {val.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chế độ chia sẻ */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Chế độ báo cáo</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { key: "an_danh", label: "Ẩn danh", desc: "Không lưu thông tin cá nhân", icon: "person_off" },
                        { key: "lien_he", label: "Có liên hệ", desc: "Email/SĐT được mã hóa bảo mật", icon: "lock_person" },
                        { key: "cong_khai", label: "Công khai", desc: "Tên bạn hiển thị trên báo cáo", icon: "person" },
                      ].map(opt => (
                        <button type="button" key={opt.key}
                          onClick={() => setForm(f => ({ ...f, loaiBaoCao: opt.key }))}
                          className={`p-3 rounded-xl border text-left transition ${
                            form.loaiBaoCao === opt.key
                              ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg block mb-1">{opt.icon}</span>
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-[10px] opacity-70">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                    {form.loaiBaoCao !== "an_danh" && (
                      <input
                        value={form.thongTinLienHe}
                        onChange={e => setForm(f => ({ ...f, thongTinLienHe: e.target.value }))}
                        placeholder={form.loaiBaoCao === "lien_he" ? "Email hoặc số điện thoại (sẽ được mã hóa)" : "Tên hoặc biệt danh của bạn"}
                        className="w-full mt-3 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition"
                      />
                    )}
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={submitting}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 text-base"
                  >
                    {submitting ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    )}
                    Gửi báo cáo ẩn danh
                  </button>
                </form>
              )}
            </div>

            {/* Right: Guide */}
            <div className="xl:col-span-1 space-y-4">
              <div className="glass-panel border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">help</span>
                  Cần báo cáo gì?
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: "qr_code", title: "Mã QR lỗi", desc: "Quét ra kết quả không khớp sản phẩm thực tế" },
                    { icon: "warning", title: "Bao bì khác lạ", desc: "Màu sắc, font chữ, logo khác so với hàng chính hãng" },
                    { icon: "price_change", title: "Giá bất thường", desc: "Giá rẻ hơn nhiều so với giá thị trường chính thức" },
                    { icon: "store", title: "Nơi bán đáng ngờ", desc: "Mua tại chỗ không phải đại lý ủy quyền" },
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
                  Đường dây khẩn cấp
                </h3>
                <div className="space-y-2">
                  <a href="tel:1800" className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition">
                    <span className="material-symbols-outlined text-red-400">call</span>
                    <div>
                      <p className="text-xs font-bold text-white">Hotline: 1800 6789</p>
                      <p className="text-[10px] text-slate-400">Miễn phí · 24/7</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <span className="material-symbols-outlined text-slate-400">mail</span>
                    <div>
                      <p className="text-xs font-bold text-white">report@vntrust.vn</p>
                      <p className="text-[10px] text-slate-400">Phản hồi trong 24 giờ</p>
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
                    statusFilter === k ? "bg-cyan-500 text-white border-cyan-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >{l}</button>
              ))}
            </div>

            {loadingReports ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-24 text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4 block">check_circle</span>
                <p className="text-lg font-bold text-white mb-2">Không có báo cáo nào</p>
                <p className="text-sm">Chưa có báo cáo nào với trạng thái này</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(r => {
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
                              r.trangThai === "open" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                              r.trangThai === "reviewing" ? "bg-blue-500/15 text-blue-300 border-blue-500/30" :
                              "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            }`}>
                              {STATUS_MAP[r.trangThai] || r.trangThai}
                            </span>
                            {r.uid && (
                              <span className="font-mono text-xs text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                                UID: {r.uid}
                              </span>
                            )}
                            <span className="text-xs text-slate-500">{new Date(r.thoiGian).toLocaleString("vi-VN")}</span>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed break-all whitespace-pre-wrap">{r.moTa}</p>
                        </div>
                        {userRole === "admin" && (
                          <div className="flex gap-2 shrink-0">
                            {r.trangThai !== "reviewing" && (
                              <button onClick={() => setInvestigateModal(r)} disabled={updatingId === r.id}
                                className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition disabled:opacity-50">
                                Điều tra
                              </button>
                            )}
                            {r.trangThai !== "closed" && (
                              <button onClick={() => handleUpdateStatus(r.id, "closed")} disabled={updatingId === r.id}
                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition disabled:opacity-50">
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
            )}
          </div>
        )}

      {/* Investigation Modal */}
      {investigateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInvestigateModal(null)}>
          <div className="bg-[#0f1e33] border border-amber-500/30 rounded-3xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-400">manage_search</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Điều tra Báo cáo</h3>
                <p className="text-xs text-slate-400">Cập nhật trạng thái và lưu ghi chú</p>
              </div>
            </div>
            
            <div className="mb-5 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 text-sm break-all whitespace-pre-wrap">
                <p className="text-slate-300"><strong>UID/Serial:</strong> {investigateModal.uid || 'N/A'}</p>
                <p className="text-slate-300"><strong>Mô tả:</strong> {investigateModal.moTa}</p>
                <p className="text-slate-300 text-xs"><strong>Thời gian:</strong> {new Date(investigateModal.thoiGian).toLocaleString('vi-VN')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Ghi chú điều tra / Kết quả xử lý
                </label>
                <textarea
                  value={investigateNote}
                  onChange={e => setInvestigateNote(e.target.value)}
                  rows={4}
                  placeholder="VD: Đã liên hệ đại lý, xác nhận lỗi in ấn tem nhãn... hoặc phát hiện hàng giả, yêu cầu cơ quan chức năng can thiệp."
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-y custom-scrollbar"
                />
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer" onClick={() => setSendEmail(!sendEmail)}>
                <input type="checkbox" checked={sendEmail} onChange={() => {}} className="rounded bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer" />
                <div>
                    <span className="text-sm text-slate-300 font-bold block">Gửi Email thông báo</span>
                    <span className="text-xs text-slate-500 block">Gửi kết quả điều tra ẩn danh (nếu người dùng có cung cấp liên hệ)</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setInvestigateModal(null); setInvestigateNote(""); setSendEmail(false); }}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">Huỷ</button>
                <button type="button" disabled={updatingId === investigateModal.id || !investigateNote.trim()}
                  onClick={async () => {
                     let finalNote = investigateNote;
                     if (sendEmail) finalNote += " [HỆ THỐNG: Đã gửi Email kết quả tới người báo cáo]";
                     await handleUpdateStatus(investigateModal.id, "reviewing", finalNote);
                     setInvestigateModal(null);
                     setInvestigateNote("");
                     setSendEmail(false);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
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
