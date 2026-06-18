"use client";
import { Toast } from "@/components/Toast";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

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
    pending:   { label: "Chờ duyệt",    cls: "bg-amber-500/20 text-amber-300 border-amber-500/30",       icon: "schedule" },
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
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === 'en' ? en : vi);
  const inputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
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
        <span className="material-symbols-outlined text-amber-400 text-[20px]">{icon}</span>
        <span className="text-sm font-bold text-white">{label}</span>
        {hasDoc
          ? <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">✓ Đã nộp</span>
          : <span className="ml-auto px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">{tr("Chưa nộp", "Not submitted")}</span>
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

      {/* Drop Zone + Chụp ảnh */}
      {!disabled && (
        <div className="flex flex-col gap-2">
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
                  {hasDoc ? "Kéo thả để thay thế hoặc" : "Kéo & thả hoặc"} <span className="text-cyan-400 font-bold">chọn ảnh</span>
                </span>
                <span className="text-[10px] text-slate-500">JPG, PNG, WEBP · Tối đa 5MB</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { onFile(f); e.target.value = ''; } }}
            />
          </div>
          {/* Chụp ảnh (mobile mở camera, desktop mở chọn ảnh) */}
          <button
            type="button"
            onClick={() => captureRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            {tr("Chụp ảnh", "Take photo")}
          </button>
          <input
            ref={captureRef}
            type="file"
            accept="image/*"
            capture="environment"
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
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === 'en' ? en : vi);
  const [lyDo, setLyDo] = useState(defaultLyDo || "");
  const [tab, setTab] = useState<"info" | "docs" | "action">(defaultTab || "info");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1b2e] border border-cyan-500/20 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[#0d1b2e] border-b border-white/10 px-6 py-4 flex items-center gap-4 rounded-t-3xl">
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
                    <span className="material-symbols-outlined text-amber-400 text-[18px]">description</span>
                    <span className="text-sm font-bold text-white">Giấy phép Kinh doanh</span>
                  </div>
                  {company.giayphep_url
                    ? <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">✓ Đã nộp</span>
                    : <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">{tr("Thiếu", "Missing")}</span>
                  }
                </div>
                {company.giayphep_url ? (
                  company.giayphep_url.endsWith('.pdf') ? (
                    <a href={company.giayphep_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition">
                      <span className="material-symbols-outlined text-red-400 text-[28px]">picture_as_pdf</span>
                      <div>
                        <p className="text-sm font-bold text-white">{tr("File PDF đã tải lên", "PDF uploaded")}</p>
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
                    <span className="text-sm">{tr("Doanh nghiệp chưa nộp tài liệu này", "Business has not submitted this document")}</span>
                  </div>
                )}
              </div>

              {/* CMND/CCCD */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-[18px]">badge</span>
                    <span className="text-sm font-bold text-white">CMND / CCCD Người đại diện</span>
                  </div>
                  {company.cmnd_url
                    ? <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">✓ Đã nộp</span>
                    : <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">{tr("Thiếu", "Missing")}</span>
                  }
                </div>
                {company.cmnd_url ? (
                  company.cmnd_url.endsWith('.pdf') ? (
                    <a href={company.cmnd_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition">
                      <span className="material-symbols-outlined text-red-400 text-[28px]">picture_as_pdf</span>
                      <div>
                        <p className="text-sm font-bold text-white">{tr("File PDF đã tải lên", "PDF uploaded")}</p>
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
                    <span className="text-sm">{tr("Doanh nghiệp chưa nộp tài liệu này", "Business has not submitted this document")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Action */}
          {tab === "action" && (
            <div className="space-y-5">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-slate-400 mb-1">{tr("Trạng thái hiện tại", "Current status")}</p>
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
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === 'en' ? en : vi);
  const [userRole, setUserRole]     = useState<string | null>(null);
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [myCompany, setMyCompany]   = useState<Company | null>(null);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"all" | "pending" | "verified" | "suspended" | "revoked">("all");
  const [detailModal, setDetailModal] = useState<{ company: Company; defaultTab?: "info" | "docs" | "action"; defaultLyDo?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [uploading, setUploading]   = useState<Record<string, boolean>>({});
  // Form thông tin DN (cho DN tự cập nhật + OCR auto-fill)
  const [form, setForm] = useState({ nguoiDaiDien: "", hotline: "", email: "", diaChi: "", nganh_VSIC: "" });
  const [savingInfo, setSavingInfo] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrHint, setOcrHint] = useState<{ maSoThue?: string; tenDN?: string; sdt?: string } | null>(null);

  // ── Giấy phép lưu hành (gắn vào hồ sơ DN) ──
  type GiayPhep = { id: string; tenGiayPhep: string; soGiayPhep: string; coQuanCap?: string | null; ngayCap?: string | null; ngayHetHan?: string | null; phamVi?: string | null; fileUrl?: string | null; trangThai: string };
  const [licenses, setLicenses] = useState<GiayPhep[]>([]);
  const [licForm, setLicForm] = useState({ tenGiayPhep: "", soGiayPhep: "", coQuanCap: "", ngayCap: "", ngayHetHan: "", phamVi: "" });
  const [licFile, setLicFile] = useState<File | null>(null);
  const [licOpen, setLicOpen] = useState(false);
  const [licSaving, setLicSaving] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLicenses = async () => {
    try {
      const r = await fetch("/api/giay-phep-luu-hanh", { cache: "no-store" });
      if (r.ok) setLicenses((await r.json()).items || []);
    } catch { /* ignore */ }
  };

  const addLicense = async () => {
    if (!licForm.tenGiayPhep.trim() || !licForm.soGiayPhep.trim()) { showToast("Nhập tên giấy phép và số giấy phép", false); return; }
    setLicSaving(true);
    try {
      let fileUrl: string | undefined;
      if (licFile) {
        const fd = new FormData(); fd.append("file", licFile); fd.append("type", "kyc");
        const ur = await fetch("/api/upload", { method: "POST", body: fd });
        const ud = await ur.json();
        if (ur.ok && ud.url) fileUrl = ud.url;
      }
      const r = await fetch("/api/giay-phep-luu-hanh", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...licForm, fileUrl }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lưu thất bại");
      showToast("✅ Đã thêm giấy phép lưu hành", true);
      setLicForm({ tenGiayPhep: "", soGiayPhep: "", coQuanCap: "", ngayCap: "", ngayHetHan: "", phamVi: "" });
      setLicFile(null); setLicOpen(false);
      await fetchLicenses();
    } catch (e: any) { showToast("❌ " + e.message, false); }
    finally { setLicSaving(false); }
  };

  const delLicense = async (id: string) => {
    try {
      const r = await fetch(`/api/giay-phep-luu-hanh?id=${id}`, { method: "DELETE" });
      if (r.ok) { showToast("Đã xóa giấy phép", true); await fetchLicenses(); }
    } catch { showToast("Lỗi xóa", false); }
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
    if (role !== "admin") fetchLicenses();
  }, []);

  // Đồng bộ form từ dữ liệu DN
  useEffect(() => {
    if (myCompany) setForm({
      nguoiDaiDien: myCompany.nguoiDaiDien || "",
      hotline:      myCompany.hotline || "",
      email:        myCompany.email || "",
      diaChi:       myCompany.diaChi || "",
      nganh_VSIC:   myCompany.nganh_VSIC || "",
    });
  }, [myCompany]);

  // Chuyển Blob/File → data URL (base64)
  const toDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

  // ── OCR: quét Giấy phép KD (base64) và tự điền các trường ──────────────────────
  const runOCR = async (imageBase64: string) => {
    setOcrRunning(true);
    try {
      const res = await fetch("/api/ocr/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "OCR thất bại");
      const af = data.autoFillSuggestion || {};
      // Tự điền các trường được phép sửa (địa chỉ, hotline)
      setForm(prev => ({
        ...prev,
        diaChi:  af.diaChi || prev.diaChi,
        hotline: af.sdt || prev.hotline,
      }));
      // Lưu gợi ý MST/Tên DN để đối chiếu (không sửa được vì là định danh)
      setOcrHint({ maSoThue: af.maSoThue, tenDN: af.tenDN, sdt: af.sdt });
      const filled = [af.diaChi ? "địa chỉ" : null, af.sdt ? "SĐT" : null].filter(Boolean);
      showToast(filled.length ? `✅ OCR đã điền: ${filled.join(", ")} (tin cậy ${data.confidence?.toFixed(0)}%)` : "OCR xong nhưng chưa trích được trường nào — kiểm tra ảnh rõ hơn", filled.length > 0);
    } catch (e: any) {
      showToast("❌ OCR lỗi: " + e.message + " (lần đầu tải model có thể chậm)", false);
    } finally {
      setOcrRunning(false);
    }
  };

  // ── DN lưu thông tin đã chỉnh/điền ────────────────────────────────────────────
  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_info", ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      showToast("✅ Đã lưu thông tin doanh nghiệp", true);
      await fetchData();
    } catch (e: any) {
      showToast("❌ " + e.message, false);
    } finally {
      setSavingInfo(false);
    }
  };

  // ── File Upload ─────────────────────────────────────────────────────────────
  const handleUpload = async (fieldName: "giayphep_url" | "cmnd_url", file: File) => {
    const label = fieldName === "giayphep_url" ? "Giấy phép KD" : "CMND/CCCD";
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { showToast("❌ Chỉ chấp nhận ảnh JPG, PNG, WEBP", false); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("❌ Ảnh không được vượt quá 5MB", false); return; }

    setUploading(prev => ({ ...prev, [fieldName]: true }));
    try {
      // 1) Upload ảnh → lấy URL
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "kyc");
      fd.append("kycField", fieldName);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) { showToast("❌ " + (data.error || "Upload thất bại"), false); return; }

      // 2) Lưu URL vào hồ sơ DN
      const patch = await fetch("/api/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_info", [fieldName]: data.url }),
      });
      if (!patch.ok) { const pd = await patch.json(); showToast("❌ " + (pd.error || "Lưu giấy tờ thất bại"), false); return; }

      showToast(`✅ Đã nộp ${label}`, true);
      await fetchData();

      // 3) Giấy phép KD → tự động OCR + điền trường (dùng base64 của file vừa chọn)
      if (fieldName === "giayphep_url") {
        try { runOCR(await toDataUrl(file)); } catch {}
      }
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
      <div className="relative w-full bg-gradient-to-r from-[#0a1628] via-[#0d2040] to-[#0a1628] border-b border-white/5 px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
              <span className="material-symbols-outlined text-white text-[18px]">arrow_back</span>
            </Link>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-cyan-400">verified_user</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline">
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
                    ${f === "pending" ? "bg-amber-500/20 text-amber-300" : f === "verified" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
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
                : "bg-amber-500/10 border-amber-500/30"}`}>
              <span className={`material-symbols-outlined text-3xl shrink-0
                ${myCompany.trangThai === "verified" ? "text-emerald-400"
                  : myCompany.trangThai === "suspended" ? "text-red-400"
                  : "text-amber-400"}`}>
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
                <span className="material-symbols-outlined text-amber-400 text-[18px]">folder_open</span>
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
              {/* OCR auto-fill — quét Giấy phép KD và điền vào form bên dưới */}
              {myCompany.giayphep_url && !myCompany.giayphep_url.endsWith('.pdf') && myCompany.trangThai !== "verified" && (
                <div className="px-6 pb-5">
                  <button
                    onClick={async () => {
                      try {
                        const blob = await (await fetch(myCompany.giayphep_url!)).blob();
                        runOCR(await toDataUrl(blob));
                      } catch { showToast("❌ Không tải được ảnh để quét lại", false); }
                    }}
                    disabled={ocrRunning}
                    className="w-full px-4 py-2.5 bg-[#C8A557]/15 hover:bg-[#C8A557]/25 border border-[#C8A557]/40 text-[#C8A557] text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {ocrRunning
                      ? <><span className="w-4 h-4 border-2 border-[#C8A557] border-t-transparent rounded-full animate-spin" /> Đang quét OCR… (5–10s)</>
                      : <><span className="material-symbols-outlined text-[18px]">document_scanner</span> Quét OCR &amp; tự điền</>}
                  </button>
                  <p className="text-[10px] text-slate-500 mt-2 text-center">
                    Tự động trích xuất & điền Địa chỉ, SĐT từ ảnh Giấy phép KD vào form bên dưới.
                  </p>
                </div>
              )}
              {/* Nhắc bắt buộc giấy tờ */}
              {myCompany.trangThai !== "verified" && (!myCompany.giayphep_url || !myCompany.cmnd_url) && (
                <div className="mx-6 mb-5 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0">priority_high</span>
                  <p className="text-xs text-amber-200">
                    Bắt buộc nộp <b>đủ cả 2 giấy tờ</b> (Giấy phép KD + CMND/CCCD). Admin chỉ phê duyệt khi hồ sơ đầy đủ.
                  </p>
                </div>
              )}
              {myCompany.trangThai === "verified" && (
                <div className="px-6 pb-5 flex items-center gap-2 text-xs text-emerald-400">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Tài liệu đã được Admin xác thực. Để cập nhật, vui lòng liên hệ hỗ trợ.
                </div>
              )}
            </div>

            {/* Company Info — editable (khi chưa verified) hoặc read-only (đã verified) */}
            <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-[18px]">business</span>
                <h2 className="text-sm font-bold text-white">{tr("Thông tin doanh nghiệp", "Business information")}</h2>
                {myCompany.trangThai !== "verified" && <span className="ml-auto text-[10px] text-slate-500">{tr("Có thể chỉnh / OCR tự điền", "Editable / OCR autofill")}</span>}
              </div>

              {myCompany.trangThai === "verified" ? (
                /* Read-only sau khi đã xác thực */
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Tên doanh nghiệp", value: myCompany.ten, icon: "apartment" },
                    { label: "Mã số thuế",        value: myCompany.maSoThue, icon: "tag" },
                    { label: "Loại hình",          value: "Doanh nghiệp", icon: "category" },
                    { label: "Người đại diện",     value: myCompany.nguoiDaiDien || "—", icon: "person" },
                    { label: "Hotline",            value: myCompany.hotline || "—", icon: "phone" },
                    { label: "Địa chỉ",            value: myCompany.diaChi || "—", icon: "location_on" },
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
              ) : (
                <div className="p-6 space-y-4">
                  {/* Định danh — không sửa được */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Tên doanh nghiệp</p>
                      <p className="text-sm text-white font-medium mt-0.5">{myCompany.ten}</p>
                      {ocrHint?.tenDN && <p className="text-[10px] text-[#C8A557] mt-1">OCR đọc được: {ocrHint.tenDN}</p>}
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Mã số thuế</p>
                      <p className="text-sm text-white font-medium mt-0.5 font-mono">{myCompany.maSoThue}</p>
                      {ocrHint?.maSoThue && <p className="text-[10px] text-[#C8A557] mt-1">OCR đọc được: {ocrHint.maSoThue}</p>}
                    </div>
                  </div>
                  {/* Các trường có thể sửa / OCR điền */}
                  {([
                    { key: "diaChi",       label: "Địa chỉ", ph: "Số nhà, đường, phường/xã, tỉnh/thành", full: true },
                    { key: "nguoiDaiDien", label: "Người đại diện", ph: "Họ tên người đại diện" },
                    { key: "hotline",      label: "Hotline / SĐT", ph: "VD: 0901234567" },
                    { key: "email",        label: "Email", ph: "email@congty.vn" },
                    { key: "nganh_VSIC",   label: "Ngành nghề (VSIC)", ph: "VD: 1079 - Sản xuất thực phẩm" },
                  ] as const).map(f => (
                    <div key={f.key} className={("full" in f) ? "" : "inline-block w-full sm:w-[calc(50%-0.5rem)] sm:mr-2 align-top"}>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">{f.label}</label>
                      <input
                        value={(form as any)[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.ph}
                        className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  ))}
                  <button
                    onClick={saveInfo}
                    disabled={savingInfo}
                    className="w-full sm:w-auto px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">{savingInfo ? "progress_activity" : "save"}</span>
                    {savingInfo ? "Đang lưu…" : "Lưu thông tin"}
                  </button>
                </div>
              )}
            </div>

            {/* ── Giấy phép lưu hành (gắn vào hồ sơ DN) ── */}
            <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C8A557] text-[18px]">verified</span>
                <h2 className="text-sm font-bold text-white">Giấy phép lưu hành</h2>
                <span className="ml-auto text-[10px] text-slate-500">{licenses.length} giấy phép</span>
                <button onClick={() => setLicOpen(o => !o)} className="ml-2 text-xs font-bold text-[#C8A557] hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">{licOpen ? "close" : "add"}</span>{licOpen ? "Đóng" : "Thêm"}
                </button>
              </div>
              <div className="p-6 space-y-3">
                {licOpen && (
                  <div className="rounded-xl border border-[#C8A557]/25 bg-[#C8A557]/5 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={licForm.tenGiayPhep} onChange={e => setLicForm(f => ({ ...f, tenGiayPhep: e.target.value }))} placeholder="Tên/loại giấy phép *" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
                      <input value={licForm.soGiayPhep} onChange={e => setLicForm(f => ({ ...f, soGiayPhep: e.target.value }))} placeholder="Số giấy phép / số đăng ký *" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
                      <input value={licForm.coQuanCap} onChange={e => setLicForm(f => ({ ...f, coQuanCap: e.target.value }))} placeholder="Cơ quan cấp (VD: Cục QLD - Bộ Y tế)" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
                      <input value={licForm.phamVi} onChange={e => setLicForm(f => ({ ...f, phamVi: e.target.value }))} placeholder="Phạm vi lưu hành (VD: Toàn quốc)" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">Ngày cấp</label>
                        <input type="date" value={licForm.ngayCap} onChange={e => setLicForm(f => ({ ...f, ngayCap: e.target.value }))} className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">Ngày hết hạn</label>
                        <input type="date" value={licForm.ngayHetHan} onChange={e => setLicForm(f => ({ ...f, ngayHetHan: e.target.value }))} className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <span className="material-symbols-outlined text-[18px] text-[#C8A557]">image</span>
                      <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">{licFile ? `✓ ${licFile.name}` : "Chọn ảnh/scan giấy phép (tùy chọn)"}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setLicFile(e.target.files?.[0] || null)} />
                    </label>
                    <button onClick={addLicense} disabled={licSaving} className="px-5 py-2.5 bg-[#C8A557] text-[#0B1623] text-sm font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">{licSaving ? "progress_activity" : "save"}</span>
                      {licSaving ? "Đang lưu…" : "Lưu giấy phép"}
                    </button>
                  </div>
                )}

                {licenses.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-6">Chưa có giấy phép lưu hành nào. Bấm “Thêm” để khai báo.</p>
                ) : (
                  <div className="space-y-2">
                    {licenses.map(l => {
                      const expired = l.ngayHetHan && new Date(l.ngayHetHan) < new Date();
                      return (
                        <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                          <span className="material-symbols-outlined text-[#C8A557] text-[20px] mt-0.5 shrink-0">workspace_premium</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-bold truncate">{l.tenGiayPhep}</div>
                            <div className="text-[11px] text-slate-400 truncate">Số: <span className="font-mono">{l.soGiayPhep}</span>{l.coQuanCap ? ` · ${l.coQuanCap}` : ""}{l.phamVi ? ` · ${l.phamVi}` : ""}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {l.ngayCap ? `Cấp: ${new Date(l.ngayCap).toLocaleDateString("vi-VN")}` : ""}
                              {l.ngayHetHan ? ` · HSD: ${new Date(l.ngayHetHan).toLocaleDateString("vi-VN")}` : ""}
                              {expired && <span className="ml-1 text-red-400 font-bold">(Hết hạn)</span>}
                              {l.fileUrl && <a href={l.fileUrl} target="_blank" rel="noreferrer" className="ml-2 text-cyan-400 underline">Xem ảnh</a>}
                            </div>
                          </div>
                          <button onClick={() => delLicense(l.id)} className="text-slate-500 hover:text-red-400 transition shrink-0" title="Xóa">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
