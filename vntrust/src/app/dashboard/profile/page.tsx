"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const normalizePhone = (value: string) => value.replace(/\s+/g, "").replace(/^(\+84|0084)/, "0");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strength labels per language (array — can't be in string dict)
const STRENGTH_LABELS: Record<string, string[]> = {
  vi: ["Rất yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"],
  en: ["Very weak", "Weak", "Medium", "Strong", "Very strong"],
  zh: ["非常弱", "弱", "中等", "强", "非常强"],
  ja: ["非常に弱い", "弱い", "普通", "強い", "非常に強い"],
  ko: ["매우 약함", "약함", "보통", "강함", "매우 강함"],
  fr: ["Très faible", "Faible", "Moyen", "Fort", "Très fort"],
};

// ── Đổi mật khẩu Modal ────────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLanguage();
  const strengthLabels = STRENGTH_LABELS[lang] || STRENGTH_LABELS.vi;
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = async () => {
    setError("");
    if (!oldPass || !newPass || !confirmPass) {
      setError(t("prof_cp_empty")); return;
    }
    if (newPass.length < 6) {
      setError(t("prof_cp_short")); return;
    }
    if (newPass !== confirmPass) {
      setError(t("prof_cp_mismatch")); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 1800);
      } else {
        setError(data.error || t("prof_cp_wrong"));
      }
    } catch {
      setError(t("prof_cp_err_conn"));
    } finally {
      setLoading(false);
    }
  };

  const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
      <span className="material-symbols-outlined text-[20px]">{show ? "visibility_off" : "visibility"}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 pb-[80px] sm:pb-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-[#0B1623] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#C8A557] text-[18px]">lock_reset</span>
            </div>
            <h2 className="text-base font-bold text-white">{t("prof_cp_title")}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_cp_old")}</label>
            <div className="relative">
              <input type={showOld ? "text" : "password"} value={oldPass} onChange={(e) => setOldPass(e.target.value)}
                placeholder={t("prof_cp_old_ph")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-12 py-3 text-white text-sm outline-none focus:border-[#C8A557] transition focus:bg-white/10 placeholder:text-slate-600" />
              <EyeBtn show={showOld} toggle={() => setShowOld(!showOld)} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_cp_new")}</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)}
                placeholder={t("prof_cp_new_ph")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-12 py-3 text-white text-sm outline-none focus:border-[#C8A557] transition focus:bg-white/10 placeholder:text-slate-600" />
              <EyeBtn show={showNew} toggle={() => setShowNew(!showNew)} />
            </div>
            {newPass.length > 0 && (() => {
              const score = [newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /\d/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length;
              const colors = ["bg-red-500", "bg-orange-500", "bg-[#C8A557]", "bg-[#4A7C5C]", "bg-[#4A7C5C]"];
              return (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3, 4].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-white/10'}`} />)}
                  </div>
                  <span className="text-[10px] text-slate-500">{score > 0 ? strengthLabels[score - 1] : ""}</span>
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_cp_confirm")}</label>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                placeholder={t("prof_cp_confirm_ph")}
                className={`w-full bg-white/5 border rounded-xl px-4 pr-12 py-3 text-white text-sm outline-none transition focus:bg-white/10 placeholder:text-slate-600 ${confirmPass && confirmPass !== newPass ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-[#C8A557]"}`} />
              <EyeBtn show={showConfirm} toggle={() => setShowConfirm(!showConfirm)} />
            </div>
            {confirmPass && confirmPass !== newPass && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">error</span> {t("prof_cp_mismatch")}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
              <span className="material-symbols-outlined text-[14px]">error</span>{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#4A7C5C]/10 border border-[#4A7C5C]/30 rounded-xl text-xs text-[#6FB585]">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> {t("prof_cp_success")}
            </div>
          )}

          <button onClick={handleChange} disabled={loading || success}
            className="w-full py-3.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition bg-[#C8A557] hover:bg-[#C8A557] text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : success ? (
              <><span className="material-symbols-outlined text-[18px]">check_circle</span> {t("prof_cp_success_btn")}</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">lock_reset</span> {t("prof_cp_submit")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Page ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t, lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === 'en' ? en : vi);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [role, setRole] = useState("manufacturer");

  // ── Display state: dữ liệu đang LƯU TRÊN DB → dùng cho hero, avatar
  const [displayName, setDisplayName] = useState("");
  const [displayCompany, setDisplayCompany] = useState("");

  // ── Edit state: dữ liệu ĐANG CHỈNH SỬA trong form → chỉ dùng cho input
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCompany, setEditCompany] = useState("");
  // Profile expansion fields
  const [editAvatar, setEditAvatar] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editBirthday, setEditBirthday] = useState(""); // ISO date string
  const [editGender, setEditGender] = useState("");
  const [editCccd, setEditCccd] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ── Original snapshot: để so sánh xem có thay đổi không
  const [origName, setOrigName] = useState("");
  const [origPhone, setOrigPhone] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [origCompany, setOrigCompany] = useState("");
  const [origAvatar, setOrigAvatar] = useState("");
  const [origAddress, setOrigAddress] = useState("");
  const [origBirthday, setOrigBirthday] = useState("");
  const [origGender, setOrigGender] = useState("");
  const [origCccd, setOrigCccd] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showChangePass, setShowChangePass] = useState(false);

  // Có thay đổi so với bản gốc không?
  const isDirty =
    editName !== origName ||
    editPhone !== origPhone ||
    editEmail !== origEmail ||
    editAvatar !== origAvatar ||
    editAddress !== origAddress ||
    editBirthday !== origBirthday ||
    editGender !== origGender ||
    editCccd !== origCccd;

  // Load real user data from API
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          const name = localStorage.getItem("userName") || "";
          setDisplayName(name);
          setEditName(name);
          setOrigName(name);
          setIsDemo(true);
        } else {
          const name = data.ten || "";
          const phone = data.soDienThoai || "";
          const email = data.email || "";
          const company = data.tenDoanhNghiep || "";
          const avatar = data.avatar || "";
          const address = data.diaChi || "";
          const birthday = data.ngaySinh ? new Date(data.ngaySinh).toISOString().split('T')[0] : "";
          const gender = data.gioiTinh || "";
          const cccd = data.cccd || "";
          // Display state
          setDisplayName(name);
          setDisplayCompany(company);
          // Edit state (khởi tạo bằng giá trị từ DB)
          setEditName(name);
          setEditPhone(phone);
          setEditEmail(email);
          setEditCompany(company);
          setEditAvatar(avatar);
          setEditAddress(address);
          setEditBirthday(birthday);
          setEditGender(gender);
          setEditCccd(cccd);
          // Snapshot gốc
          setOrigName(name);
          setOrigPhone(phone);
          setOrigEmail(email);
          setOrigCompany(company);
          setOrigAvatar(avatar);
          setOrigAddress(address);
          setOrigBirthday(birthday);
          setOrigGender(gender);
          setOrigCccd(cccd);
          setRole(data.role || "manufacturer");
          setIsDemo(data.isDemo || false);
        }
      })
      .catch(() => {
        const name = localStorage.getItem("userName") || "";
        setDisplayName(name);
        setEditName(name);
        setOrigName(name);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const name = editName.trim();
    const phone = normalizePhone(editPhone);
    const email = editEmail.trim().toLowerCase();
    const address = editAddress.trim();
    const cccd = editCccd.replace(/\s+/g, "");

    if (name.length < 2 || name.length > 80) {
      setSaveError(tr("Họ tên phải từ 2 đến 80 ký tự", "Full name must be 2-80 characters"));
      return;
    }
    if (!emailPattern.test(email) || email.length > 120) {
      setSaveError(tr("Email liên hệ không hợp lệ", "Contact email is invalid"));
      return;
    }
    if (phone && !/^0\d{9}$/.test(phone)) {
      setSaveError(tr("Số điện thoại phải gồm 10 số và bắt đầu bằng 0", "Phone number must have 10 digits and start with 0"));
      return;
    }
    if (editBirthday) {
      const birthday = new Date(`${editBirthday}T00:00:00`);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (Number.isNaN(birthday.getTime()) || birthday > today) {
        setSaveError(tr("Ngày sinh không được lớn hơn ngày hiện tại", "Birthday cannot be in the future"));
        return;
      }
    }
    if (editGender && !["M", "F", "O"].includes(editGender)) {
      setSaveError(tr("Giới tính không hợp lệ", "Gender is invalid"));
      return;
    }
    if (cccd && !/^\d{9}$|^\d{12}$/.test(cccd)) {
      setSaveError(tr("CCCD/CMND phải gồm 9 hoặc 12 số", "ID card must have 9 or 12 digits"));
      return;
    }
    if (address.length > 200) {
      setSaveError(tr("Địa chỉ cá nhân tối đa 200 ký tự", "Personal address is limited to 200 characters"));
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten: name, soDienThoai: phone, email,
          avatar: editAvatar, diaChi: address,
          ngaySinh: editBirthday || null, gioiTinh: editGender, cccd,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Chỉ sau khi save thành công mới sync display + snapshot
        setEditName(name);
        setEditPhone(phone);
        setEditEmail(email);
        setEditAddress(address);
        setEditCccd(cccd);
        setDisplayName(name);
        setOrigName(name);
        setOrigPhone(phone);
        setOrigEmail(email);
        setOrigCompany(editCompany);
        setOrigAvatar(editAvatar);
        setOrigAddress(address);
        setOrigBirthday(editBirthday);
        setOrigGender(editGender);
        setOrigCccd(cccd);
        setSaved(true);
        localStorage.setItem("userName", data.ten || name);
        window.dispatchEvent(new Event("storage"));
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(data.error || "Lỗi khi lưu");
      }
    } catch {
      setSaveError("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditName(origName);
    setEditPhone(origPhone);
    setEditEmail(origEmail);
    setEditCompany(origCompany);
    setEditAvatar(origAvatar);
    setEditAddress(origAddress);
    setEditBirthday(origBirthday);
    setEditGender(origGender);
    setEditCccd(origCccd);
    setSaveError("");
  };

  // Upload avatar
  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSaveError('Chỉ chấp nhận file ảnh');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Ảnh tối đa 5MB');
      return;
    }
    setUploadingAvatar(true);
    setSaveError("");
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'avatar');
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Upload thất bại');
      setEditAvatar(data.url);
    } catch (e: any) {
      setSaveError(e.message || 'Lỗi upload ảnh');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => { });
    window.location.href = "/login";
  };

  const roleLabel: Record<string, string> = {
    manufacturer: t("prof_role_mfr"),
    importer:     "Nhà phân phối",
    consumer:     "Người tiêu dùng",
    admin:        "Quản trị viên",
  };


  return (
    <>
      {showChangePass && <ChangePasswordModal onClose={() => setShowChangePass(false)} />}

      <div className="dashboard-profile-page min-h-[calc(100vh-80px)] w-full pb-24 lg:pb-8">

        {/* ── HERO BANNER ─────────────────────────────────────────────── */}
        <div className="dashboard-profile-hero relative w-full bg-gradient-to-r from-[#0B1623] via-[#142235] to-[#0B1623] border-b border-white/5 px-6 lg:px-12 py-8">
          {/* Back */}
          <button onClick={() => router.push('/dashboard')}
            className="dashboard-profile-back absolute top-6 left-6 lg:left-12 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
            <span className="material-symbols-outlined text-white text-[18px]">arrow_back</span>
          </button>

          <div className="dashboard-profile-hero-inner max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-end gap-6 pt-4">
            {/* Avatar — click để upload */}
            <div className="relative flex-shrink-0">
              <label className="dashboard-profile-avatar cursor-pointer block w-24 h-24 lg:w-28 lg:h-28 rounded-2xl shadow-2xl border-4 border-[#0B1623] ring-4 ring-[#C8A557]/20 overflow-hidden hover:ring-[#C8A557]/40 transition group relative">
                {editAvatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#6FB585] to-[#E4D2A1] text-white flex items-center justify-center text-4xl lg:text-5xl font-black">
                    {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  {uploadingAvatar ? (
                    <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden"
                  disabled={isDemo || uploadingAvatar}
                  onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
              </label>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#4A7C5C] border-2 border-[#0B1623] flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-white text-[14px]">verified</span>
              </div>
            </div>

            {/* Name + role + badges */}
            <div className="dashboard-profile-identity flex-1 text-center lg:text-left pb-1">
              <h1 className="dashboard-profile-title text-2xl lg:text-3xl font-black text-white mb-2">
                {displayName || <span className="text-slate-500 font-medium italic text-xl">{tr("Chưa cập nhật tên", "Name not set")}</span>}
              </h1>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="px-3 py-1 bg-[#4A7C5C]/20 text-[#6FB585] text-[11px] font-bold rounded-full border border-[#4A7C5C]/30 uppercase tracking-widest">
                  {roleLabel[role] || role}
                </span>
                {displayCompany && (
                  <span className="px-3 py-1 bg-white/5 text-slate-400 text-[11px] rounded-full border border-white/10 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">apartment</span>{displayCompany}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop action buttons inline in hero */}
            <div className="hidden lg:flex items-center gap-3 pb-1">
              <button onClick={() => setShowChangePass(true)}
                className="px-5 py-2.5 rounded-xl flex items-center gap-2 text-[#C8A557] bg-[#C8A557]/10 border border-[#C8A557]/20 hover:bg-[#C8A557]/20 transition font-semibold text-sm">
                <span className="material-symbols-outlined text-[16px]">lock_reset</span> {t("prof_change_pass")}
              </button>
              <button onClick={handleLogout}
                className="px-5 py-2.5 rounded-xl flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition font-semibold text-sm">
                <span className="material-symbols-outlined text-[16px]">logout</span> {t("prof_logout")}
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT AREA ────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <span className="w-12 h-12 border-2 border-[#C8A557] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="dashboard-profile-content max-w-6xl mx-auto px-4 lg:px-12 py-8">
            {/* 2-col grid: left = thông tin cá nhân | right = doanh nghiệp (#21: NTD chỉ 1 cột) */}
            <div className={`grid grid-cols-1 gap-6 ${role !== "consumer" ? "lg:grid-cols-2" : "max-w-2xl"}`}>

              {/* ── LEFT: Thông tin cá nhân ── */}
              <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#C8A557] text-[18px]">person</span>
                  <h2 className="text-sm font-bold text-white">{tr("Thông tin cá nhân", "Personal information")}</h2>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_fullname")}</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isDemo}
                      minLength={2} maxLength={80} required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C8A557] transition focus:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_phone")}</label>
                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={isDemo}
                      inputMode="tel" maxLength={15} placeholder="0xxxxxxxxx"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C8A557] transition focus:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_email")}</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={isDemo}
                      maxLength={120} required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C8A557] transition focus:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                  {/* Profile expansion: ngày sinh + giới tính */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{tr("Ngày sinh", "Birthday")}</label>
                      <input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} disabled={isDemo}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#C8A557] transition focus:bg-white/8 disabled:opacity-40 [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{tr("Giới tính", "Gender")}</label>
                      <select value={editGender} onChange={(e) => setEditGender(e.target.value)} disabled={isDemo}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#C8A557] transition focus:bg-white/8 disabled:opacity-40">
                        <option value="" className="bg-[#0B1623]">{tr("— Chọn —", "— Select —")}</option>
                        <option value="M" className="bg-[#0B1623]">{tr("Nam", "Male")}</option>
                        <option value="F" className="bg-[#0B1623]">{tr("Nữ", "Female")}</option>
                        <option value="O" className="bg-[#0B1623]">{tr("Khác", "Other")}</option>
                      </select>
                    </div>
                  </div>
                  {/* Profile expansion: CCCD */}
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{tr("CCCD / CMND", "ID Card")}</label>
                    <input type="text" value={editCccd} onChange={(e) => setEditCccd(e.target.value)} disabled={isDemo}
                      inputMode="numeric" maxLength={12} placeholder="012345678912"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-[#C8A557] transition focus:bg-white/8 disabled:opacity-40" />
                  </div>
                  {/* Profile expansion: địa chỉ */}
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{tr("Địa chỉ cá nhân", "Personal address")}</label>
                    <textarea value={editAddress} onChange={(e) => setEditAddress(e.target.value)} disabled={isDemo}
                      rows={2} maxLength={200}
                      placeholder={tr("Số nhà, đường, phường, quận, thành phố", "Street, ward, district, city")}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C8A557] transition focus:bg-white/8 disabled:opacity-40 resize-none" />
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Thông tin doanh nghiệp — #21: ẩn với người tiêu dùng (vô nghĩa) ── */}
              {role !== "consumer" && (
              <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#C8A557] text-[18px]">apartment</span>
                  <h2 className="text-sm font-bold text-white">{tr("Thông tin doanh nghiệp", "Business information")}</h2>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_company")}</label>
                    <input type="text" value={editCompany} readOnly disabled
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm outline-none opacity-70 cursor-not-allowed" />
                    <p className="mt-2 text-[11px] text-slate-500">
                      {tr("Thông tin doanh nghiệp được quản lý qua hồ sơ KYC.", "Business information is managed through the KYC profile.")}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{tr("Vai trò", "Role")}</label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-sm flex items-center gap-2 opacity-60">
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      {roleLabel[role] || role}
                    </div>
                  </div>
                </div>
              </div>
              )}

            </div>

            {/* ── Save + error ── */}
            {saveError && (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                <span className="material-symbols-outlined text-[16px]">error</span>{saveError}
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving || isDemo || !isDirty}
                className={`flex-1 lg:flex-none lg:px-10 py-3.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition ${saved ? 'bg-[#4A7C5C] text-white shadow-[0_0_24px_rgba(16,185,129,0.3)]' : 'bg-[#C8A557] hover:bg-[#C8A557] text-white shadow-[0_0_24px_rgba(6,182,212,0.25)]'} disabled:opacity-40 disabled:cursor-not-allowed`}>
              {saving ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <><span className="material-symbols-outlined text-[18px]">check_circle</span> {t("prof_saved")}</>
              ) : t("prof_save")}
              </button>

              {/* Nút huỷ thay đổi — chỉ hiện khi có thay đổi chưa lưu */}
              {isDirty && !saving && (
                <button onClick={handleReset}
                  className="px-5 py-3.5 rounded-xl text-sm font-semibold text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">undo</span>
                  Huỷ thay đổi
                </button>
              )}
            </div>

            {/* Mobile-only action buttons */}
            <div className="lg:hidden mt-4 flex flex-col gap-3">
              <button onClick={() => setShowChangePass(true)}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-[#C8A557] bg-[#C8A557]/10 border border-[#C8A557]/20 hover:bg-[#C8A557]/20 transition font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">lock_reset</span> {t("prof_change_pass")}
              </button>
              <button onClick={handleLogout}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">logout</span> {t("prof_logout")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

