"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    pending:   { label: "Chờ duyệt",  cls: "bg-amber-500/20 text-amber-300 border-amber-500/30",   icon: "schedule" },
    verified:  { label: "Đã xác thực",cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: "verified" },
    suspended: { label: "Bị từ chối", cls: "bg-red-500/20 text-red-400 border-red-500/30",         icon: "block" },
    revoked:   { label: "Thu hồi",    cls: "bg-orange-500/20 text-orange-400 border-orange-500/30",  icon: "lock" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${s.cls}`}>
      <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
      {s.label}
    </span>
  );
}

export default function KYCPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ company: Company; action: "verified" | "suspended" | "revoked" } | null>(null);
  const [viewDetailsModal, setViewDetailsModal] = useState<Company | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  // Inline edit state
  const [editing, setEditing] = useState<string | null>(null); // field name being edited
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFileUpload = async (docLabel: string, file: File, fieldName?: string) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast("✗ File không được vượt quá 10MB", false); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { showToast("✗ Chỉ hỗ trợ PDF, JPG, PNG, WEBP", false); return; }
    setUploadingDoc(docLabel);
    await new Promise(r => setTimeout(r, 800));
    const fileName = file.name;
    setUploadedDocs(prev => ({ ...prev, [docLabel]: fileName }));
    // Lưu vào DB nếu có fieldName
    if (fieldName) {
      await fetch("/api/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_info", [fieldName]: fileName }),
      });
      fetchData();
    }
    showToast(`✓ Đã tải lên: ${fileName}`, true);
    setUploadingDoc(null);
  };

  const handleSaveField = async (fieldName: string, value: string) => {
    if (!value.trim()) { showToast("✗ Giá trị không được để trống", false); return; }
    setSaving(true);
    const res = await fetch("/api/kyc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_info", [fieldName]: value.trim() }),
    });
    if (res.ok) {
      await fetchData();
      setEditing(null);
      setEditVal("");
      showToast("✓ Đã lưu thành công", true);
    } else {
      const d = await res.json();
      showToast("✗ " + d.error, false);
    }
    setSaving(false);
  };
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "suspended" | "revoked">("all");

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/kyc");
    const data = await res.json();
    if (data.role === "admin") {
      setCompanies(data.companies || []);
    } else {
      setMyCompany(data.company || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    setUserRole(role);
    if (role !== "admin" && role !== "manufacturer" && role !== "importer") {
      router.replace("/dashboard");
      return;
    }
    fetchData();
  }, []);

  const handleApproval = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    const res = await fetch("/api/kyc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "admin_approval", id: actionModal.company.id, trangThai: actionModal.action, lyDo }),
    });
    const data = await res.json();
    if (!res.ok) { showToast("✗ " + data.error, false); }
    else {
      const label = actionModal.action === "verified" ? "phê duyệt / mở khóa"
        : actionModal.action === "revoked" ? "thu hồi (khóa)"
        : "từ chối";
      showToast(`✓ Đã ${label} ${actionModal.company.ten}`, true);
      setActionModal(null);
      setLyDo("");
      fetchData();
    }
    setSubmitting(false);
  };

  const filtered = companies.filter(c => filter === "all" || c.trangThai === filter);

  if (!userRole) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl ${toast.ok ? "bg-emerald-600" : "bg-red-600"} text-white`}>
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
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-cyan-400">verified_user</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline">
                {userRole === "admin" ? "Phê duyệt hồ sơ" : "Hồ sơ Doanh nghiệp (KYC)"}
              </h1>
              <p className="text-sm text-slate-400">
                {userRole === "admin" ? "Kiểm duyệt & phê duyệt hồ sơ doanh nghiệp đăng ký mới" : "Thông tin pháp lý và trạng thái xác thực"}
              </p>
            </div>
          </div>
        </div>

        {/* Admin filters */}
        {userRole === "admin" && (
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "verified", "suspended", "revoked"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  filter === f
                    ? f === "revoked" ? "bg-orange-500 text-white border-orange-400"
                      : "bg-cyan-500 text-white border-cyan-400"
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}>
                {f === "all" ? "Tất cả" : f === "pending" ? "Chờ duyệt" : f === "verified" ? "Đã duyệt" : f === "suspended" ? "Bị từ chối" : "Thu hồi"}
                {f === "pending" && companies.filter(c => c.trangThai === "pending").length > 0 && (
                  <span className="ml-1 bg-amber-500 text-white rounded-full text-[10px] px-1.5 py-0.5">
                    {companies.filter(c => c.trangThai === "pending").length}
                  </span>
                )}
                {f === "revoked" && companies.filter(c => c.trangThai === "revoked").length > 0 && (
                  <span className="ml-1 bg-orange-500 text-white rounded-full text-[10px] px-1.5 py-0.5">
                    {companies.filter(c => c.trangThai === "revoked").length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400" />
        </div>
      ) : userRole === "admin" ? (
        /* ── Admin: List all companies ── */
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">domain_disabled</span>
              Không có doanh nghiệp nào
            </div>
          )}
          {filtered.map(c => (
            <div key={c.id} className="glass-panel border border-white/10 rounded-2xl p-5 hover:border-white/20 transition">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    c.loai === "NSX" ? "bg-blue-500/20 border border-blue-500/30" : "bg-purple-500/20 border border-purple-500/30"
                  }`}>
                    <span className={`material-symbols-outlined ${c.loai === "NSX" ? "text-blue-400" : "text-purple-400"}`}>
                      {c.loai === "NSX" ? "factory" : "local_shipping"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white">{c.ten}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                        {c.loai === "NSX" ? "Nhà sản xuất" : "Nhập khẩu / Phân phối"}
                      </span>
                      <StatusBadge status={c.trangThai} />
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">MST: <span className="font-mono">{c.maSoThue}</span>{c.diaChi ? ` · ${c.diaChi}` : ""}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đăng ký: {new Date(c.ngayDangKy).toLocaleDateString("vi-VN")}
                      {c._count && ` · ${c._count.sanPhams} sản phẩm`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap justify-end mt-4 md:mt-0">
                  <button
                    onClick={() => setViewDetailsModal(c)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold hover:bg-blue-500/30 transition shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    Chi tiết
                  </button>
                  
                  {/* Quick Action Buttons */}
                {c.trangThai === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setActionModal({ company: c, action: "verified" })}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Phê duyệt
                    </button>
                    <button
                      onClick={() => setActionModal({ company: c, action: "suspended" })}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold hover:bg-red-500/30 transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      Từ chối
                    </button>
                  </div>
                )}
                {/* Button for suspended: Phê duyệt lại */}
                {c.trangThai === "suspended" && (
                  <button
                    onClick={() => setActionModal({ company: c, action: "verified" })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Phê duyệt
                  </button>
                )}
                {/* Button for verified: Thu hồi (Khóa) */}
                {c.trangThai === "verified" && (
                  <button
                    onClick={() => setActionModal({ company: c, action: "revoked" })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold hover:bg-orange-500/25 transition shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Thu hồi
                  </button>
                )}
                {/* Button for revoked: Mở khóa → trả về verified */}
                {c.trangThai === "revoked" && (
                  <button
                    onClick={() => setActionModal({ company: c, action: "verified" })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">lock_open</span>
                    Mở khóa
                  </button>
                )}
              </div>
            </div>
          </div>
          ))}
        </div>
      ) : (
        /* ── Manufacturer/Importer: Own company profile ── */
        myCompany ? (
          <div className="space-y-6">
            {/* Status banner */}
            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
              myCompany.trangThai === "verified"
                ? "bg-emerald-500/10 border-emerald-500/30"
                : myCompany.trangThai === "suspended"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}>
              <span className={`material-symbols-outlined text-3xl ${
                myCompany.trangThai === "verified" ? "text-emerald-400"
                  : myCompany.trangThai === "suspended" ? "text-red-400"
                  : "text-amber-400"
              }`}>
                {myCompany.trangThai === "verified" ? "verified_user" : myCompany.trangThai === "suspended" ? "gpp_bad" : "pending"}
              </span>
              <div>
                <p className="font-bold text-white">
                  {myCompany.trangThai === "verified" ? "Tài khoản đã được xác thực KYC" : myCompany.trangThai === "suspended" ? "Tài khoản bị từ chối" : "Đang chờ Admin phê duyệt KYC"}
                </p>
                <p className="text-sm text-slate-400">
                  {myCompany.trangThai === "pending" ? "Hồ sơ của bạn đang được xem xét, vui lòng chờ trong 3 ngày làm việc." : ""}
                </p>
              </div>
              <div className="ml-auto"><StatusBadge status={myCompany.trangThai} /></div>
            </div>

            {/* Company info */}
            <div className="glass-panel border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">business</span>
                Thông tin Pháp lý
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Tên doanh nghiệp", value: myCompany.ten, icon: "apartment" },
                  { label: "Mã số thuế (MST)", value: myCompany.maSoThue, icon: "tag", mono: true },
                  { label: "Loại hình", value: myCompany.loai === "NSX" ? "Nhà sản xuất" : "Nhập khẩu / Phân phối", icon: "category" },
                  { label: "Địa chỉ", value: myCompany.diaChi || "Chưa cập nhật", icon: "location_on" },
                  { label: "Ngành nghề (VSIC)", value: myCompany.nganh_VSIC || "Chưa cập nhật", icon: "work" },
                  { label: "Ngày đăng ký", value: new Date(myCompany.ngayDangKy).toLocaleDateString("vi-VN"), icon: "calendar_today" },
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5">{row.icon}</span>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{row.label}</p>
                      <p className={`text-white font-semibold ${(row as any).mono ? "font-mono" : ""}`}>{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KYC Checklist — BR-01 Full Requirements (interactive) */}
            <div className="glass-panel border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">checklist</span>
                Checklist Xác thực KYC
              </h2>
              <p className="text-xs text-slate-400 mb-4">Theo <strong className="text-amber-300">BR-01</strong>: Nhấn vào từng mục <span className="text-amber-400 font-bold">Cần bổ sung</span> để điền thông tin.</p>

              {/* Static ticked items */}
              {[
                { label: "Mã số thuế (MST)", value: myCompany.maSoThue, done: !!myCompany.maSoThue },
                { label: "Tên doanh nghiệp đầy đủ", value: myCompany.ten, done: !!myCompany.ten },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20 mb-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400 shrink-0">check_circle</span>
                  <span className="text-sm font-medium text-white flex-1">{item.label}</span>
                  <span className="text-xs text-emerald-400 font-mono">{item.value}</span>
                </div>
              ))}

              {/* Editable fields */}
              <div className="space-y-2 mt-2">
                {([
                  { label: "Địa chỉ nhà máy / kho hàng",          field: "diaChi",        value: myCompany.diaChi,        placeholder: "VD: Số 10 Lý Thái Tổ, Q.1, TP.HCM",       icon: "location_on",  type: "text" },
                  { label: "Ngành nghề kinh doanh (VSIC)",         field: "nganh_VSIC",   value: myCompany.nganh_VSIC,    placeholder: "VD: 1071 - Sản xuất bánh mì, bánh...",      icon: "work",         type: "text" },
                  { label: "Email miền riêng (không Gmail/Yahoo)", field: "email",        value: myCompany.email,         placeholder: "VD: contact@company.vn",                   icon: "mail",         type: "email" },
                  { label: "Hotline xác thực doanh nghiệp",        field: "hotline",      value: myCompany.hotline,       placeholder: "VD: 028 1234 5678",                        icon: "support_agent",type: "tel" },
                  { label: "Người đại diện pháp luật",             field: "nguoiDaiDien", value: myCompany.nguoiDaiDien,  placeholder: "Họ tên đầy đủ + chức vụ",                  icon: "badge",        type: "text" },
                ] as Array<{label:string;field:string;value?:string;placeholder:string;icon:string;type:string}>).map((item) => {
                  const done = !!item.value;
                  const isEditing = editing === item.field;
                  return (
                    <div key={item.field} className={`rounded-xl border transition-all ${
                      done ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/10 hover:border-amber-500/30"
                    }`}>
                      <div className="flex items-center gap-3 p-3">
                        <span className={`material-symbols-outlined text-[18px] shrink-0 ${done ? "text-emerald-400" : "text-slate-500"}`}>
                          {done ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        <span className={`text-sm font-medium flex-1 ${done ? "text-white" : "text-slate-400"}`}>{item.label}</span>
                        {done && !isEditing && <span className="text-xs text-slate-400 max-w-[180px] truncate">{item.value}</span>}
                        {!done && !isEditing && <span className="text-xs text-amber-400 font-bold shrink-0">Cần bổ sung</span>}
                        <button onClick={() => { setEditing(item.field); setEditVal(item.value || ""); }}
                          className="ml-2 text-xs px-2 py-1 rounded-lg bg-white/10 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 transition font-medium shrink-0">
                          <span className="material-symbols-outlined text-[13px]">{done ? "edit" : "add"}</span>
                        </button>
                      </div>
                      {isEditing && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/10 flex gap-2">
                          <input autoFocus type={item.type} value={editVal} onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveField(item.field, editVal); if (e.key === "Escape") setEditing(null); }}
                            placeholder={item.placeholder}
                            className="flex-1 bg-[#0f1e33] border border-cyan-500/40 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400" />
                          <button onClick={() => handleSaveField(item.field, editVal)} disabled={saving}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1">
                            {saving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[14px]">save</span>}
                            Lưu
                          </button>
                          <button onClick={() => setEditing(null)} className="px-3 py-2 bg-white/10 text-slate-300 rounded-xl text-xs font-bold hover:bg-white/20 transition">Huỷ</button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Upload fields */}
                {([
                  { label: "Giấy phép kinh doanh (scan PDF)",       field: "giayphep_url", value: myCompany.giayphep_url, icon: "description" },
                  { label: "CMND/CCCD Người đại diện pháp luật",    field: "cmnd_url",     value: myCompany.cmnd_url,    icon: "badge" },
                ] as Array<{label:string;field:string;value?:string;icon:string}>).map(item => {
                  const done = !!(item.value || uploadedDocs[item.label]);
                  const displayName = uploadedDocs[item.label] || item.value;
                  return (
                    <label key={item.field} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      done ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-dashed border-white/20 hover:border-amber-500/40"
                    }`}>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleFileUpload(item.label, e.target.files[0], item.field); (e.target as HTMLInputElement).value = ""; }} />
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${done ? "text-emerald-400" : "text-slate-500"}`}>
                        {done ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <span className={`text-sm font-medium flex-1 ${done ? "text-white" : "text-slate-400"}`}>{item.label}</span>
                      {done
                        ? <span className="text-xs text-emerald-400 max-w-[160px] truncate">{displayName}</span>
                        : <span className="text-xs text-amber-400 font-bold">Cần bổ sung</span>}
                      {uploadingDoc === item.label
                        ? <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        : <span className="material-symbols-outlined text-[18px] text-slate-500">cloud_upload</span>}
                    </label>
                  );
                })}

                {/* Admin approval — read only */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                  myCompany.trangThai === "verified" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/10"
                }`}>
                  <span className={`material-symbols-outlined text-[18px] shrink-0 ${myCompany.trangThai === "verified" ? "text-emerald-400" : "text-slate-500"}`}>
                    {myCompany.trangThai === "verified" ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={`text-sm font-medium flex-1 ${myCompany.trangThai === "verified" ? "text-white" : "text-slate-400"}`}>Phê duyệt KYC bởi Admin</span>
                  {myCompany.trangThai !== "verified" && <span className="text-xs text-amber-400 font-bold">Chờ Admin duyệt</span>}
                  {myCompany.trangThai === "verified" && <span className="text-xs text-emerald-400 font-bold">Đã phê duyệt</span>}
                </div>
              </div>
            </div>

            {/* Upload Giấy tờ — BR-01 mandatory */}
            <div className="glass-panel border border-amber-500/20 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">upload_file</span>
                Upload Giấy tờ Pháp lý <span className="text-red-400">*</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">Bắt buộc theo BR-01: Upload scan PDF hoặc ảnh chất lượng cao. AI phân tích tự động phát hiện giả mạo.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                   { label: "Giấy chứng nhận đăng ký kinh doanh", icon: "description",  required: true },
                   { label: "Chứng nhận ATTP / GMP (nếu có)",     icon: "verified",     required: false },
                   { label: "CMND/CCCD Người đại diện pháp luật", icon: "badge",        required: true },
                   { label: "Tờ khai hải quan (nếu nhập khẩu)",  icon: "receipt_long", required: false },
                 ].map((doc, i) => (
                  <label key={i} className="flex items-center gap-3 p-4 bg-white/5 border border-dashed border-white/20 rounded-xl hover:border-cyan-400/40 hover:bg-white/8 transition cursor-pointer group">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleFileUpload(doc.label, e.target.files[0]); (e.target as HTMLInputElement).value = ''; }} />
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-cyan-400 transition">{doc.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">
                        {doc.label}
                        {doc.required && <span className="text-red-400 ml-1 font-bold">*</span>}
                      </p>
                      {uploadedDocs[doc.label]
                        ? <p className="text-xs text-emerald-400 font-semibold">✓ {uploadedDocs[doc.label]}</p>
                        : <p className="text-xs text-slate-500">PDF, JPG, PNG ≤ 10MB · Nhấn để chọn file</p>
                      }
                    </div>
                    {uploadingDoc === doc.label
                      ? <span className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      : uploadedDocs[doc.label]
                        ? <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
                        : <span className="material-symbols-outlined text-slate-500 group-hover:text-cyan-400 transition text-[20px]">cloud_upload</span>
                    }
                  </label>
                ))}
              </div>

            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4 block">domain_disabled</span>
            <p className="font-bold text-white mb-2">Chưa có hồ sơ doanh nghiệp</p>
            <p className="text-sm">Vui lòng liên hệ Admin để được cấp quyền.</p>
          </div>
        )
      )}

      {/* Approval modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setActionModal(null)}>
          <div className="bg-[#0f1e33] border border-white/10 rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                actionModal.action === "verified" ? "bg-emerald-500/20"
                : actionModal.action === "revoked" ? "bg-orange-500/20"
                : "bg-red-500/20"
              }`}>
                <span className={`material-symbols-outlined ${
                  actionModal.action === "verified" ? "text-emerald-400"
                  : actionModal.action === "revoked" ? "text-orange-400"
                  : "text-red-400"
                }`}>
                  {actionModal.action === "verified" ? "check_circle" : actionModal.action === "revoked" ? "lock" : "block"}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {actionModal.action === "verified" ? "Phê duyệt / Mở khóa KYC"
                   : actionModal.action === "revoked" ? "🔒 Thu hồi — Khóa tài khoản"
                   : "Từ chối KYC"}
                </h3>
                <p className="text-xs text-slate-400">{actionModal.company.ten}</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Lý do {actionModal.action === "verified" ? "(không bắt buộc)" : "(khuyến khích ghi rõ)"}
              </label>
              <textarea
                value={lyDo}
                onChange={e => setLyDo(e.target.value)}
                rows={3}
                placeholder={
                  actionModal.action === "verified" ? "Ghi chú phê duyệt / mở khóa..."
                  : actionModal.action === "revoked" ? "Lý do thu hồi — tài khoản sẽ bị khóa ngay..."
                  : "Lý do từ chối để doanh nghiệp biết và bổ sung hồ sơ..."
                }
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setActionModal(null)} className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">
                Huỷ
              </button>
              <button onClick={handleApproval} disabled={submitting}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                  actionModal.action === "verified"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                    : actionModal.action === "revoked"
                    ? "bg-orange-600 hover:bg-orange-500 text-white"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}>
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                {actionModal.action === "verified" ? "Phê duyệt / Mở khóa"
                  : actionModal.action === "revoked" ? "🔒 Xác nhận Thu hồi"
                  : "Từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewDetailsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewDetailsModal(null)}>
          <div className="bg-[#0f1e33] border border-cyan-500/30 rounded-3xl p-7 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  viewDetailsModal.loai === "NSX" ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "bg-purple-500/20 border-purple-500/30 text-purple-400"
                }`}>
                  <span className="material-symbols-outlined text-2xl">{viewDetailsModal.loai === "NSX" ? "factory" : "local_shipping"}</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white font-headline">{viewDetailsModal.ten}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-xs text-slate-400">MST: <span className="font-mono">{viewDetailsModal.maSoThue}</span></span>
                    <StatusBadge status={viewDetailsModal.trangThai} />
                  </div>
                </div>
              </div>
              <button onClick={() => setViewDetailsModal(null)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 transition">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="glass-panel border border-white/10 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Thông tin cơ bản</p>
                <div><span className="text-slate-500 text-xs">Loại hình:</span> <p className="text-sm font-medium text-white">{viewDetailsModal.loai === "NSX" ? "Nhà sản xuất" : "Nhập khẩu / Phân phối"}</p></div>
                <div><span className="text-slate-500 text-xs">Ngành nghề (VSIC):</span> <p className="text-sm font-medium text-white">{viewDetailsModal.nganh_VSIC || "Chưa cập nhật"}</p></div>
                <div><span className="text-slate-500 text-xs">Ngày đăng ký:</span> <p className="text-sm font-medium text-white">{new Date(viewDetailsModal.ngayDangKy).toLocaleDateString("vi-VN")}</p></div>
                <div><span className="text-slate-500 text-xs">Thống kê:</span> <p className="text-sm font-medium text-white">{viewDetailsModal._count?.sanPhams || 0} sản phẩm · {viewDetailsModal._count?.nguoiDungs || 0} nhân sự</p></div>
              </div>
              
              <div className="glass-panel border border-white/10 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Thông tin liên hệ</p>
                <div><span className="text-slate-500 text-xs">Người đại diện:</span> <p className="text-sm font-medium text-white">{viewDetailsModal.nguoiDaiDien || "Chưa cập nhật"}</p></div>
                <div><span className="text-slate-500 text-xs">Điện thoại (Hotline):</span> <p className="text-sm font-medium text-white">{viewDetailsModal.hotline || "Chưa cập nhật"}</p></div>
                <div><span className="text-slate-500 text-xs">Email:</span> <p className="text-sm font-medium text-white">{viewDetailsModal.email || "Chưa cập nhật"}</p></div>
                <div><span className="text-slate-500 text-xs">Địa chỉ:</span> <p className="text-sm font-medium text-white">{viewDetailsModal.diaChi || "Chưa cập nhật"}</p></div>
              </div>
            </div>

            <div className="glass-panel border border-white/10 p-5 rounded-2xl mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tài liệu pháp lý (BR-01)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-amber-400 shrink-0">description</span>
                    <span className="text-sm text-slate-300 truncate">Giấy phép Kinh doanh</span>
                  </div>
                  {viewDetailsModal.giayphep_url ? (
                    <a href={viewDetailsModal.giayphep_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 flex shrink-0 p-1 bg-cyan-500/10 rounded-lg ml-2">
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-red-400 font-bold px-2 py-0.5 rounded bg-red-500/10 shrink-0">Thiếu</span>
                  )}
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-amber-400 shrink-0">badge</span>
                    <span className="text-sm text-slate-300 truncate">CMND/CCCD</span>
                  </div>
                  {viewDetailsModal.cmnd_url ? (
                    <a href={viewDetailsModal.cmnd_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 flex shrink-0 p-1 bg-cyan-500/10 rounded-lg ml-2">
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-red-400 font-bold px-2 py-0.5 rounded bg-red-500/10 shrink-0">Thiếu</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-white/10 flex gap-3 flex-wrap">
              {viewDetailsModal.trangThai === "pending" || viewDetailsModal.trangThai === "suspended" ? (
                <button
                  onClick={() => { setActionModal({ company: viewDetailsModal, action: "verified" }); setViewDetailsModal(null); }}
                  className="flex-1 min-w-[120px] py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span> Phê duyệt
                </button>
              ) : null}
              {viewDetailsModal.trangThai === "pending" ? (
                <button
                  onClick={() => { setActionModal({ company: viewDetailsModal, action: "suspended" }); setViewDetailsModal(null); }}
                  className="flex-1 min-w-[120px] py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">block</span> Từ chối
                </button>
              ) : null}
              {viewDetailsModal.trangThai === "verified" ? (
                <button
                  onClick={() => { setActionModal({ company: viewDetailsModal, action: "revoked" }); setViewDetailsModal(null); }}
                  className="flex-1 min-w-[120px] py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span> Thu hồi
                </button>
              ) : null}
              {viewDetailsModal.trangThai === "revoked" ? (
                <button
                  onClick={() => { setActionModal({ company: viewDetailsModal, action: "verified" }); setViewDetailsModal(null); }}
                  className="flex-1 min-w-[120px] py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">lock_open</span> Mở khóa
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
