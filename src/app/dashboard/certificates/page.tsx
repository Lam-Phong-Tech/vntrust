"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Cert {
  id: string;
  loai: string;
  soChungNhan: string;
  ngayCap: string;
  ngayHetHan: string;
  toChucCap?: string;
  sanPham?: { ten: string; maSKU: string } | null;
  loHang?: { maLo: string } | null;
}

const CERT_TYPES = ["ISO", "HACCP", "GMP", "CFS", "FDA", "HALAL", "ORGANIC", "OTHER"];
const CERT_COLORS: Record<string, string> = {
  ISO:     "text-blue-300 bg-blue-500/15 border-blue-500/30",
  HACCP:   "text-green-300 bg-green-500/15 border-green-500/30",
  GMP:     "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
  CFS:     "text-purple-300 bg-purple-500/15 border-purple-500/30",
  FDA:     "text-rose-300 bg-rose-500/15 border-rose-500/30",
  HALAL:   "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  ORGANIC: "text-lime-300 bg-lime-500/15 border-lime-500/30",
  OTHER:   "text-slate-300 bg-slate-500/15 border-slate-500/30",
};

interface SanPham { id: string; ten: string; maSKU: string; }

export default function CertificatesPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [sanPhams, setSanPhams] = useState<SanPham[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ loai: "ISO" });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [previewImg, setPreviewImg] = useState("");

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/certificates");
    const data = await res.json();
    setCerts(data.certs || []);
    setLoading(false);
  }, []);

  const fetchProducts = async () => {
    const res = await fetch("/api/inventory");
    const data = await res.json();
    setSanPhams(data.sanPhams || []);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) {
        setForm(f => ({ ...f, hinhAnhUrl: d.url }));
        setPreviewImg(d.url);
        showToast("✓ Đã upload ảnh chứng nhận", true);
      } else showToast("✗ Upload thất bại", false);
    } catch { showToast("✗ Lỗi upload", false); }
    setUploadingImg(false);
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (!["admin", "manufacturer", "importer"].includes(role)) { router.replace("/dashboard"); return; }
    setUserRole(role);
    fetchCerts();
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { loai, soChungNhan, ngayCap, ngayHetHan, toChucCap, sanPhamId } = form;
    if (!loai || !soChungNhan || !ngayCap || !ngayHetHan) {
      showToast("✗ Vui lòng điền đầy đủ các trường bắt buộc (*)", false);
      return;
    }
    if (!form.hinhAnhUrl) {
      showToast("✗ Vui lòng tải lên Ảnh / Tài liệu chứng nhận", false);
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loai, soChungNhan, ngayCap, ngayHetHan, toChucCap, sanPhamId, hinhAnhUrl: form.hinhAnhUrl || undefined }),
    });
    const data = await res.json();
    if (!res.ok) showToast("✗ " + data.error, false);
    else {
      showToast("✓ Đã thêm chứng nhận thành công", true);
      setModal(false);
      setForm({ loai: "ISO" });
      setPreviewImg("");
      fetchCerts();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa chứng nhận này?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/certificates?id=${id}`, { method: "DELETE" });
    if (res.ok) { showToast("✓ Đã xóa", true); fetchCerts(); }
    else showToast("✗ Lỗi xóa", false);
    setDeletingId(null);
  };

  if (!userRole) return null;

  const expiredCount = certs.filter(c => new Date(c.ngayHetHan) < new Date()).length;
  const expiringCount = certs.filter(c => {
    const d = new Date(c.ngayHetHan);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 90;
  }).length;

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[200] px-5 py-4 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 border ${toast.ok ? "bg-emerald-500 border-emerald-400 text-white" : "bg-red-500 border-red-400 text-white"}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.ok ? "check_circle" : "error"}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> Bảng điều khiển
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-400">workspace_premium</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline">Chứng nhận Sản phẩm</h1>
              <p className="text-sm text-slate-400">BR-02: Quản lý ISO, HACCP, GMP, CFS, FDA... theo sản phẩm</p>
            </div>
          </div>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold text-sm transition active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Thêm Chứng nhận
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Tổng chứng nhận", value: certs.length,   icon: "workspace_premium", color: "text-white" },
          { label: "Sắp hết hạn (90 ngày)", value: expiringCount, icon: "schedule", color: "text-amber-400" },
          { label: "Đã hết hạn",     value: expiredCount,   icon: "event_busy",  color: "text-red-400" },
        ].map((s, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4">
            <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cert list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-400" />
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3 block">workspace_premium</span>
          <p className="font-bold text-white mb-2">Chưa có chứng nhận nào</p>
          <p className="text-sm mb-5">Thêm chứng nhận ISO, HACCP, GMP... để tăng uy tín sản phẩm</p>
          <button onClick={() => setModal(true)} className="px-6 py-2.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold hover:bg-cyan-500/30 transition">
            + Thêm chứng nhận
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map(cert => {
            const isExpired = new Date(cert.ngayHetHan) < new Date();
            const daysLeft = Math.ceil((new Date(cert.ngayHetHan).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const expiringSoon = daysLeft >= 0 && daysLeft <= 90;
            const cls = CERT_COLORS[cert.loai] || CERT_COLORS.OTHER;
            return (
              <div key={cert.id} className={`glass-panel border rounded-2xl p-5 flex flex-col gap-3 transition hover:border-white/20 ${isExpired ? 'border-red-500/30 bg-red-900/10' : expiringSoon ? 'border-amber-500/20' : 'border-white/10'}`}>
                <div className="flex items-start justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${cls}`}>
                    <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                    {cert.loai}
                  </span>
                  {isExpired && (
                    <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-bold">Hết hạn</span>
                  )}
                  {!isExpired && expiringSoon && (
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold">
                      Còn {daysLeft} ngày
                    </span>
                  )}
                </div>

                <div>
                  <p className="font-mono font-bold text-white text-sm">{cert.soChungNhan}</p>
                  {cert.toChucCap && <p className="text-xs text-slate-400 mt-0.5">Cấp bởi: {cert.toChucCap}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Ngày cấp</p>
                    <p className="text-white font-medium">{new Date(cert.ngayCap).toLocaleDateString("vi-VN")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Hết hạn</p>
                    <p className={`font-medium ${isExpired ? "text-red-400" : expiringSoon ? "text-amber-400" : "text-white"}`}>
                      {new Date(cert.ngayHetHan).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>

                {cert.sanPham && (
                  <div className="p-2 bg-white/5 rounded-lg text-xs text-slate-300 border border-white/5">
                    <span className="material-symbols-outlined text-[13px] mr-1">inventory_2</span>
                    {cert.sanPham.ten} <span className="text-slate-500 font-mono">({cert.sanPham.maSKU})</span>
                  </div>
                )}

                <button onClick={() => handleDelete(cert.id)} disabled={deletingId === cert.id}
                  className="mt-auto flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/20 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition self-end disabled:opacity-40">
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Xóa
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="bg-[#0f1e33] border border-white/10 rounded-3xl p-7 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-400">workspace_premium</span>
              </div>
              <h3 className="text-lg font-bold text-white">Thêm Chứng nhận</h3>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-5 text-xs text-blue-300 flex gap-2">
              <span className="material-symbols-outlined text-[15px] shrink-0">info</span>
              Trường đánh dấu <span className="text-red-400 font-bold">*</span> là bắt buộc theo yêu cầu BR-02
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Loại chứng nhận <span className="text-red-400">*</span>
                  </label>
                  <select value={form.loai} onChange={e => setForm(f => ({ ...f, loai: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-400">
                    {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Số chứng nhận <span className="text-red-400">*</span>
                  </label>
                  <input value={form.soChungNhan || ""} onChange={e => setForm(f => ({ ...f, soChungNhan: e.target.value }))}
                    required placeholder="VD: ISO-9001-2024-VN"
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-green-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Ngày cấp <span className="text-red-400">*</span>
                  </label>
                  <input type="date" value={form.ngayCap || ""} onChange={e => setForm(f => ({ ...f, ngayCap: e.target.value }))}
                    required className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Ngày hết hạn <span className="text-red-400">*</span>
                  </label>
                  <input type="date" value={form.ngayHetHan || ""} onChange={e => setForm(f => ({ ...f, ngayHetHan: e.target.value }))}
                    required className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Tổ chức cấp</label>
                <input value={form.toChucCap || ""} onChange={e => setForm(f => ({ ...f, toChucCap: e.target.value }))}
                  placeholder="VD: Bureau Veritas, SGS, QUACERT..."
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-green-400" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Áp dụng cho sản phẩm</label>
                <select value={form.sanPhamId || ""} onChange={e => setForm(f => ({ ...f, sanPhamId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-400">
                  <option value="">— Áp dụng cho toàn công ty —</option>
                  {sanPhams.map(sp => <option key={sp.id} value={sp.id}>{sp.ten} ({sp.maSKU})</option>)}
                </select>
              </div>

              {/* Ảnh chứng nhận */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Ảnh / Tài liệu chứng nhận <span className="text-red-400">*</span>
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center">
                  {previewImg ? (
                    <div className="relative">
                      <img src={previewImg} alt="preview" className="w-full max-h-28 object-contain rounded-lg mb-2" />
                      <button type="button" onClick={() => { setPreviewImg(""); setForm(f => ({ ...f, hinhAnhUrl: "" })); }}
                        className="text-xs text-red-400 hover:text-red-300 underline">Xóa ảnh</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-1 text-slate-400 hover:text-slate-300 transition">
                      <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                      <span className="text-xs">{uploadingImg ? "Đang tải lên..." : "Nhấn để upload ảnh chứng nhận"}</span>
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingImg}
                        onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Ảnh scan chứng nhận để admin xét duyệt</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">Huỷ</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                  Lưu chứng nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
