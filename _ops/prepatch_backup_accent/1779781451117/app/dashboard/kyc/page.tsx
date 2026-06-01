"use client";
import { Toast } from "@/components/Toast";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Company {
  id: string;
  maSoThue: string;
  ten: string;
  diaChi?: string;
  nganh_VSIC?: string;
  email?: string;
  hotline?: string;
  nguoiDaiDien?: string;
  giayphep_url?: string;
  cmnd_url?: string;
  loai: string;
  ngayDangKy: string;
  trangThai: string;
  _count?: { sanPhams: number; nguoiDungs: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    pending:   { label: "Chờ duyệt",    cls: "bg-[#C8A557]/20 text-amber-300 border-[#C8A557]/30",       icon: "schedule" },
    verified:  { label: "Đã xác thực",  cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: "verified" },
    suspended: { label: "Bị từ chối",   cls: "bg-red-500/20 text-red-400 border-red-500/30",             icon: "block" },
    revoked:   { label: "Thu hồi",      cls: "bg-orange-500/20 text-orange-400 border-orange-500/30",    icon: "lock" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${s.cls}`}>
      <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
      {s.label}
    </span>
  );
}

// ─── Drag & Drop Upload Zone ──────────────────────────────────────────────────
function DocUploadZone({
  label, icon, url, uploading, onFile, fieldName, disabled
}: {
  label: string;
  icon: string;
  url?: string;
  uploading: boolean;
  onFile: (file: File) => void;
  fieldName: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [disabled, onFile]);

  const isImage = url && !url.endsWith('.pdf');
  const isPdf   = url && url.endsWith('.pdf');
  const hasDoc  = !!url;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[#C8A557] text-[20px]">{icon}</span>
        <span className="text-sm font-bold text-white">{label}</span>
        {hasDoc
          ? <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">✓ Đã nộp</span>
          : <span className="ml-auto px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">Chưa nộp</span>
        }
      </div>

      {/* Preview */}
      {isImage && (
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 group">
          <img src={url} alt={label} className="w-full max-h-48 object-contain" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <a href={url} target="_blank" rel="noreferrer"
              className="px-3 py-1.5 bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">open_in_new</span> Xem
            </a>
          </div>
        </div>
      )}
      {isPdf && (
        <a href={url} target="_blank" rel="noreferrer"
          className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition">
          <span className="material-symbols-outlined text-red-400 text-[24px]">picture_as_pdf</span>
          <span className="text-sm text-slate-300 flex-1 truncate">Xem file PDF</span>
          <span className="material-symbols-outlined text-slate-400 text-[16px]">open_in_new</span>
        </a>
      )}

      {/* Drop Zone */}
      {!disabled && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition select-none
            ${drag ? "border-cyan-400 bg-cyan-500/10" : "border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/5"}`}
        >
          {uploading ? (
            <>
              <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-cyan-400">Đang tải lên...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[28px]">cloud_upload</span>
              <span className="text-xs text-slate-400 text-center">
                {hasDoc ? "Kéo thả để <span class='text-white font-bold'>thay thế</span>" : "Kéo & thả hoặc"} <span className="text-cyan-400 font-bold">chọn file</span>
              </span>
              <span className="text-[10px] text-slate-500">PDF, JPG, PNG, WEBP · Tối đa 10MB</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { onFile(f); e.target.value = ''; } }}
          />
        </div>
      )}
    </div>
  );
}

// ─── KYC Progress Bar ─────────────────────────────────────────────────────────
function KycProgressBar({ company }: { company: Company }) {
  const docs = [company.giayphep_url, company.cmnd_url].filter(Boolean);
  const info = [company.nguoiDaiDien, company.hotline, company.email, company.diaChi, company.nganh_VSIC].filter(Boolean);
  const steps = [
    { label: "Tạo tài khoản",       done: true },
    { label: "Cập nhật thông tin",  done: info.length >= 3 },
    { label: "Nộp tài liệu KYC",    done: docs.length >= 2 },
    { label: "Chờ Admin xét duyệt", done: company.trangThai === "verified" },
    { label: "Đã xác thực",         done: company.trangThai === "verified" },
  ];
  const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100);

  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400 text-[18px]">timeline</span>
          Tiến trình xác minh KYC
        </h2>
        <span className={`text-lg font-black ${pct === 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full mb-5">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-y-2 gap-x-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`material-symbols-outlined text-[14px] ${s.done ? 'text-emerald-400' : 'text-slate-600'}`}>
              {s.done ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className={`text-xs ${s.done ? 'text-slate-300' : 'text-slate-600'}`}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Detail Modal ───────────────────────────────────────────────────────
function AdminDetailModal({
  company, onClose, onApprove, onReject, submitting, defaultTab, defaultLyDo
}: {
  company: Company;
  onClose: () => void;
  onApprove: (lyDo?: string) => void;
  onReject: (lyDo: string) => void;
  submitting: boolean;
  defaultTab?: "info" | "docs" | "action";
  defaultLyDo?: string;
}) {
  const [lyDo, setLyDo] = useState(defaultLyDo || "");
  const [tab, setTab] = useState<"info" | "docs" | "action">(defaultTab || "info");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0B1623] border border-cyan-500/20 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[#0B1623] border-b border-white/10 px-6 py-4 flex items-center gap-4 rounded-t-3xl">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border
            ${company.loai === "NSX" ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "bg-purple-500/20 border-purple-500/30 text-purple-400"}`}>
            <span className="material-symbols-outlined">{company.loai === "NSX" ? "factory" : "local_shipping"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-white truncate">{company.ten}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 font-mono">MST: {company.maSoThue}</span>
              <StatusBadge status={company.trangThai} />
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          {(["info", "docs", "action"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition -mb-px
                ${tab === t ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {t === "info" ? "Thông tin" : t === "docs" ? "Tài liệu" : "Phán quyết"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Tab: Info */}
          {tab === "info" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Loại hình",         value: company.loai === "NSX" ? "Nhà sản xuất" : "Nhập khẩu / Phân phối", icon: "category" },
                { label: "Ngành nghề (VSIC)",  value: company.nganh_VSIC || "Chưa cập nhật", icon: "work" },
                { label: "Ngày đăng ký",       value: new Date(company.ngayDangKy).toLocaleDateString("vi-VN"), icon: "calendar_today" },
                { label: "Thống kê",           value: `${company._count?.sanPhams || 0} sản phẩm · ${company._count?.nguoiDungs || 0} nhân sự`, icon: "bar_chart" },
                { label: "Người đại diện",     value: company.nguoiDaiDien || "Chưa cập nhật", icon: "person" },
                { label: "Điện thoại (Hotline)", value: company.hotline || "Chưa cập nhật", icon: "phone" },
                { label: "Email",              value: company.email || "Chưa cập nhật", icon: "mail" },
                { label: "Địa chỉ",            value: company.diaChi || "Chưa cập nhật", icon: "location_on" },
              ].map((row, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-slate-400 text-[16px] mt-0.5">{row.icon}</span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{row.label}</p>
                    <p className="text-sm text-white font-medium mt-0.5">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Docs */}
          {tab === "docs" && (
            <div className="space-y-6">
              {/* Giấy phép KD */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C8A557] text-[18px]">description</span>
                    <span className="text-sm font-bold text-white">Giấy phép Kinh doanh</span>
                  </div>
                  {company.giayphep_url
                    ? <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">✓ Đã nộp</span>
                    : <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">Thiếu</span>
                  }
                </div>
                {company.giayphep_url ? (
                  company.giayphep_url.endsWith('.pdf') ? (
                    <a href={company.giayphep_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition">
                      <span className="material-symbols-outlined text-red-400 text-[28px]">picture_as_pdf</span>
                      <div>
                        <p className="text-sm font-bold text-white">File PDF đã tải lên</p>
                        <p className="text-xs text-slate-400">Nhấn để xem/tải</p>
                      </div>
                      <span className="ml-auto material-symbols-outlined text-cyan-400">open_in_new</span>
                    </a>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
                      <img src={company.giayphep_url} alt="Giấy phép KD" className="w-full max-h-64 object-contain" />
                      <div className="p-2 flex justify-end">
                        <a href={company.giayphep_url} target="_blank" rel="noreferrer"
                          className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-cyan-500/30 transition">
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span> Phóng to
                        </a>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-6 rounded-xl bg-white/3 border border-red-500/20 flex items-center gap-3 text-red-400">
                    <span className="material-symbols-outlined text-[24px]">warning</span>
                    <span className="text-sm">Doanh nghiệp chưa nộp tài liệu này</span>
                  </div>
                )}
              </div>

              {/* CMND/CCCD */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C8A557] text-[18px]">badge</span>
                    <span className="text-sm font-bold text-white">CMND / CCCD Người đại diện</span>
                  </div>
                  {company.cmnd_url
                    ? <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">✓ Đã nộp</span>
                    : <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">Thiếu</span>
                  }
                </div>
                {company.cmnd_url ? (
                  company.cmnd_url.endsWith('.pdf') ? (
                    <a href={company.cmnd_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition">
                      <span className="material-symbols-outlined text-red-400 text-[28px]">picture_as_pdf</span>
                      <div>
                        <p className="text-sm font-bold text-white">File PDF đã tải lên</p>
                        <p className="text-xs text-slate-400">Nhấn để xem/tải</p>
                      </div>
                      <span className="ml-auto material-symbols-outlined text-cyan-400">open_in_new</span>
                    </a>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
                      <img src={company.cmnd_url} alt="CMND/CCCD" className="w-full max-h-64 object-contain" />
                      <div className="p-2 flex justify-end">
                        <a href={company.cmnd_url} target="_blank" rel="noreferrer"
                          className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-cyan-500/30 transition">
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span> Phóng to
                        </a>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-6 rounded-xl bg-white/3 border border-red-500/20 flex items-center gap-3 text-red-400">
                    <span className="material-symbols-outlined text-[24px]">warning</span>
                    <span className="text-sm">Doanh nghiệp chưa nộp tài liệu này</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Action */}
          {tab === "action" && (
            <div className="space-y-5">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-slate-400 mb-1">Trạng thái hiện tại</p>
                <StatusBadge status={company.trangThai} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Ghi chú / Lý do (nếu từ chối)
                </label>
                <textarea
                  value={lyDo} onChange={e => setLyDo(e.target.value)}
                  rows={3} placeholder="VD: Giấy phép KD bị mờ, vui lòng nộp lại bản scan rõ hơn..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(company.trangThai === "pending" || company.trangThai === "suspended" || company.trangThai === "revoked") && (
                  <button onClick={() => onApprove(lyDo)} disabled={submitting}
                    className="py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">verified</span>}
                    Phê duyệt / Mở khóa
                  </button>
                )}
                {company.trangThai === "pending" && (
                  <button onClick={() => { if (lyDo.trim()) onReject(lyDo); else onReject("Không đáp ứng yêu cầu KYC"); }} disabled={submitting}
                    className="py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">block</span>
                    Từ chối
                  </button>
                )}
                {company.trangThai === "verified" && (
                  <button onClick={() => onReject("Thu hồi tài khoản")} disabled={submitting}
                    className="py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    Thu hồi (Khóa)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KYCPage() {
  const router = useRouter();
  const [userRole, setUserRole]     = useState<string | null>(null);
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [myCompany, setMyCompany]   = useState<Company | null>(null);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"all" | "pending" | "verified" | "suspended" | "revoked">("all");
  const [detailModal, setDetailModal] = useState<{ company: Company; defaultTab?: "info" | "docs" | "action"; defaultLyDo?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [uploading, setUploading]   = useState<Record<string, boolean>>({});

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kyc");
      const data = await res.json();
      if (data.role === "admin") setCompanies(data.companies || []);
      else setMyCompany(data.company || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    setUserRole(role);
    if (!["admin", "manufacturer", "importer"].includes(role)) { router.replace("/dashboard"); return; }
    fetchData();
  }, []);

  // ── File Upload ─────────────────────────────────────────────────────────────
  const handleUpload = async (fieldName: "giayphep_url" | "cmnd_url", file: File) => {
    const label = fieldName === "giayphep_url" ? "Giấy phép KD" : "CMND/CCCD";
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { showToast("❌ Chỉ chấp nhận PDF, JPG, PNG, WEBP", false); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("❌ File không được vượt quá 10MB", false); return; }

    setUploading(prev => ({ ...prev, [fieldName]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "kyc");
      fd.append("kycField", fieldName);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { showToast("❌ " + data.error, false); return; }

      showToast(`✅ Đã tải lên ${label}`, true);
      await fetchData();
    } catch {
      showToast("❌ Lỗi kết nối", false);
    } finally {
      setUploading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // ── Admin Actions ───────────────────────────────────────────────────────────
  const handleApprove = async (company: Company, lyDo?: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_approval", id: company.id, trangThai: "verified", lyDo }),
      });
      if (res.ok) {
        showToast(`✅ Đã phê duyệt ${company.ten}`, true);
        setDetailModal(null);
        fetchData();
      } else {
        const d = await res.json();
        showToast("❌ " + d.error, false);
      }
    } finally { setSubmitting(false); }
  };

  const handleReject = async (company: Company, lyDo: string) => {
    const newStatus = company.trangThai === "verified" ? "revoked" : "suspended";
    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_approval", id: company.id, trangThai: newStatus, lyDo }),
      });
      if (res.ok) {
        showToast(`✅ Đã ${newStatus === "revoked" ? "thu hồi" : "từ chối"} ${company.ten}`, true);
        setDetailModal(null);
        fetchData();
      } else {
        const d = await res.json();
        showToast("❌ " + d.error, false);
      }
    } finally { setSubmitting(false); }
  };

  if (!userRole) return null;

  const filtered = companies.filter(c => filter === "all" || c.trangThai === filter);
  const counts = {
    all: companies.length,
    pending: companies.filter(c => c.trangThai === "pending").length,
    verified: companies.filter(c => c.trangThai === "verified").length,
    suspended: companies.filter(c => c.trangThai === "suspended").length,
    revoked: companies.filter(c => c.trangThai === "revoked").length,
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full pb-24 lg:pb-8">
      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}

      {/* Admin Detail Modal */}
      {detailModal && userRole === "admin" && (
        <AdminDetailModal
          company={detailModal.company}
          onClose={() => setDetailModal(null)}
          onApprove={(lyDo) => handleApprove(detailModal.company, lyDo)}
          onReject={(lyDo) => handleReject(detailModal.company, lyDo)}
          submitting={submitting}
          defaultTab={detailModal.defaultTab}
          defaultLyDo={detailModal.defaultLyDo}
        />
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-r from-[#0B1623] via-[#142235] to-[#0B1623] border-b border-white/5 px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
              <span className="material-symbols-outlined text-white text-[18px]">arrow_back</span>
            </Link>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-cyan-400">verified_user</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display">
                {userRole === "admin" ? "Phê duyệt Hồ sơ KYC" : "Xác minh Doanh nghiệp"}
              </h1>
              <p className="text-sm text-slate-400">
                {userRole === "admin" ? "Kiểm duyệt & phê duyệt hồ sơ doanh nghiệp đăng ký mới" : "Nộp tài liệu pháp lý để được xác thực và sử dụng đầy đủ tính năng"}
              </p>
            </div>
          </div>

          {userRole === "admin" && (
            <div className="lg:ml-auto flex flex-wrap gap-3">
              {(["all", "pending", "verified", "suspended"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5
                    ${filter === f ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"}`}>
                  {f === "all" ? "Tất cả" : f === "pending" ? "Chờ duyệt" : f === "verified" ? "Đã duyệt" : "Từ chối"}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black
                    ${f === "pending" ? "bg-[#C8A557]/20 text-amber-300" : f === "verified" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
                    {counts[f]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-12 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <span className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : userRole === "admin" ? (
          /* ── ADMIN VIEW ──────────────────────────────────────────────────── */
          filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-3 block">inbox</span>
              Không có hồ sơ nào
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(c => (
                <div key={c.id}
                  className="glass-panel border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-white/20 transition">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border
                    ${c.loai === "NSX" ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "bg-purple-500/20 border-purple-500/30 text-purple-400"}`}>
                    <span className="material-symbols-outlined">{c.loai === "NSX" ? "factory" : "local_shipping"}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-white text-sm truncate">{c.ten}</p>
                      <StatusBadge status={c.trangThai} />
                    </div>
                    <p className="text-xs text-slate-400 font-mono">MST: {c.maSoThue}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.giayphep_url ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/25"}`}>
                        {c.giayphep_url ? "✓ Giấy phép KD" : "✕ Giấy phép KD"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.cmnd_url ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/25"}`}>
                        {c.cmnd_url ? "✓ CMND/CCCD" : "✕ CMND/CCCD"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <button onClick={() => setDetailModal({ company: c, defaultTab: 'info' })}
                      className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold hover:bg-cyan-500/25 transition">
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      Chi tiết
                    </button>
                    {c.trangThai === "pending" && (
                      <>
                        <button onClick={() => handleApprove(c)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          Duyệt
                        </button>
                        <button onClick={() => setDetailModal({ company: c, defaultTab: 'action' })}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 text-red-400 border border-red-500/25 rounded-xl text-xs font-bold hover:bg-red-500/25 transition">
                          <span className="material-symbols-outlined text-[15px]">block</span>
                          Từ chối
                        </button>
                      </>
                    )}
                    {c.trangThai === "verified" && (
                      <button onClick={() => setDetailModal({ company: c, defaultTab: 'action', defaultLyDo: 'Thu hồi tài khoản' })}
                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold hover:bg-orange-500/25 transition">
                        <span className="material-symbols-outlined text-[15px]">lock</span>
                        Thu hồi
                      </button>
                    )}
                    {(c.trangThai === "suspended" || c.trangThai === "revoked") && (
                      <button onClick={() => handleApprove(c)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition">
                        <span className="material-symbols-outlined text-[15px]">lock_open</span>
                        Mở khóa
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : myCompany ? (
          /* ── MANUFACTURER / IMPORTER VIEW ───────────────────────────────── */
          <div className="space-y-6 max-w-3xl">
            {/* Progress */}
            <KycProgressBar company={myCompany} />

            {/* Status Banner */}
            <div className={`p-5 rounded-2xl border flex items-start gap-4
              ${myCompany.trangThai === "verified" ? "bg-emerald-500/10 border-emerald-500/30"
                : myCompany.trangThai === "suspended" ? "bg-red-500/10 border-red-500/30"
                : "bg-[#C8A557]/10 border-[#C8A557]/30"}`}>
              <span className={`material-symbols-outlined text-3xl shrink-0
                ${myCompany.trangThai === "verified" ? "text-emerald-400"
                  : myCompany.trangThai === "suspended" ? "text-red-400"
                  : "text-[#C8A557]"}`}>
                {myCompany.trangThai === "verified" ? "verified_user" : myCompany.trangThai === "suspended" ? "gpp_bad" : "pending"}
              </span>
              <div>
                <p className="font-bold text-white">
                  {myCompany.trangThai === "verified" ? "✅ Tài khoản đã được xác thực KYC"
                    : myCompany.trangThai === "suspended" ? "❌ Hồ sơ bị từ chối — vui lòng nộp lại"
                    : "⏳ Đang chờ Admin xét duyệt KYC"}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {myCompany.trangThai === "pending"
                    ? "Hồ sơ của bạn đang được xem xét, vui lòng chờ trong 3 ngày làm việc."
                    : myCompany.trangThai === "suspended"
                    ? "Hãy kiểm tra và nộp lại tài liệu bên dưới, sau đó liên hệ Admin để duyệt lại."
                    : "Bạn đã có đầy đủ quyền truy cập các tính năng của hệ thống."}
                </p>
              </div>
              <div className="ml-auto shrink-0"><StatusBadge status={myCompany.trangThai} /></div>
            </div>

            {/* Document Upload Section */}
            <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C8A557] text-[18px]">folder_open</span>
                <h2 className="text-sm font-bold text-white">Tài liệu pháp lý (BR-01)</h2>
                <span className="ml-auto text-xs text-slate-400">
                  {[myCompany.giayphep_url, myCompany.cmnd_url].filter(Boolean).length}/2 tài liệu
                </span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <DocUploadZone
                  label="Giấy phép Kinh doanh"
                  icon="description"
                  url={myCompany.giayphep_url}
                  uploading={!!uploading["giayphep_url"]}
                  fieldName="giayphep_url"
                  disabled={myCompany.trangThai === "verified"}
                  onFile={f => handleUpload("giayphep_url", f)}
                />
                <DocUploadZone
                  label="CMND / CCCD Người đại diện"
                  icon="badge"
                  url={myCompany.cmnd_url}
                  uploading={!!uploading["cmnd_url"]}
                  fieldName="cmnd_url"
                  disabled={myCompany.trangThai === "verified"}
                  onFile={f => handleUpload("cmnd_url", f)}
                />
              </div>
              {myCompany.trangThai === "verified" && (
                <div className="px-6 pb-5 flex items-center gap-2 text-xs text-emerald-400">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Tài liệu đã được Admin xác thực. Để cập nhật, vui lòng liên hệ hỗ trợ.
                </div>
              )}
            </div>

            {/* Company Info Summary */}
            <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-[18px]">business</span>
                <h2 className="text-sm font-bold text-white">Thông tin doanh nghiệp</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Tên doanh nghiệp", value: myCompany.ten, icon: "apartment" },
                  { label: "Mã số thuế",        value: myCompany.maSoThue, icon: "tag" },
                  { label: "Loại hình",          value: myCompany.loai === "NSX" ? "Nhà sản xuất" : "Nhập khẩu / Phân phối", icon: "category" },
                  { label: "Người đại diện",     value: myCompany.nguoiDaiDien || "Chưa cập nhật", icon: "person" },
                  { label: "Hotline",            value: myCompany.hotline || "Chưa cập nhật", icon: "phone" },
                  { label: "Email",              value: myCompany.email || "Chưa cập nhật", icon: "mail" },
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-slate-400 text-[16px] mt-0.5">{row.icon}</span>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{row.label}</p>
                      <p className="text-sm text-white font-medium mt-0.5">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-3 block">business_center</span>
            Không tìm thấy thông tin doanh nghiệp
          </div>
        )}
      </div>
    </div>
  );
}
