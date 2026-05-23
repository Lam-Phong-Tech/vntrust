"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

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
      <div className="w-full max-w-sm bg-[#0d1b2e] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">lock_reset</span>
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
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-12 py-3 text-white text-sm outline-none focus:border-amber-400 transition focus:bg-white/10 placeholder:text-slate-600" />
              <EyeBtn show={showOld} toggle={() => setShowOld(!showOld)} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_cp_new")}</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)}
                placeholder={t("prof_cp_new_ph")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-12 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/10 placeholder:text-slate-600" />
              <EyeBtn show={showNew} toggle={() => setShowNew(!showNew)} />
            </div>
            {newPass.length > 0 && (() => {
              const score = [newPass.length >= 8, /[A-Z]/.test(newPass), /[a-z]/.test(newPass), /\d/.test(newPass), /[^A-Za-z0-9]/.test(newPass)].filter(Boolean).length;
              const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-400", "bg-emerald-500"];
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
                className={`w-full bg-white/5 border rounded-xl px-4 pr-12 py-3 text-white text-sm outline-none transition focus:bg-white/10 placeholder:text-slate-600 ${confirmPass && confirmPass !== newPass ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-cyan-400"}`} />
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
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> {t("prof_cp_success")}
            </div>
          )}

          <button onClick={handleChange} disabled={loading || success}
            className="w-full py-3.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition bg-amber-500 hover:bg-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
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
  const { t } = useLanguage();
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

  // ── Original snapshot: để so sánh xem có thay đổi không
  const [origName, setOrigName] = useState("");
  const [origPhone, setOrigPhone] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [origCompany, setOrigCompany] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showChangePass, setShowChangePass] = useState(false);

  // Có thay đổi so với bản gốc không?
  const isDirty =
    editName !== origName ||
    editPhone !== origPhone ||
    editEmail !== origEmail ||
    editCompany !== origCompany;

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
          // Display state
          setDisplayName(name);
          setDisplayCompany(company);
          // Edit state (khởi tạo bằng giá trị từ DB)
          setEditName(name);
          setEditPhone(phone);
          setEditEmail(email);
          setEditCompany(company);
          // Snapshot gốc
          setOrigName(name);
          setOrigPhone(phone);
          setOrigEmail(email);
          setOrigCompany(company);
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
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten: editName, soDienThoai: editPhone, email: editEmail, tenDoanhNghiep: editCompany }),
      });
      const data = await res.json();
      if (res.ok) {
        // Chỉ sau khi save thành công mới sync display + snapshot
        setDisplayName(editName);
        setDisplayCompany(editCompany);
        setOrigName(editName);
        setOrigPhone(editPhone);
        setOrigEmail(editEmail);
        setOrigCompany(editCompany);
        setSaved(true);
        localStorage.setItem("userName", data.ten || editName);
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
    setSaveError("");
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

      <div className="min-h-[calc(100vh-80px)] w-full pb-24 lg:pb-8">

        {/* ── HERO BANNER ─────────────────────────────────────────────── */}
        <div className="relative w-full bg-gradient-to-r from-[#0a1628] via-[#0d2040] to-[#0a1628] border-b border-white/5 px-6 lg:px-12 py-8">
          {/* Back */}
          <button onClick={() => router.push('/dashboard')}
            className="absolute top-6 left-6 lg:left-12 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
            <span className="material-symbols-outlined text-white text-[18px]">arrow_back</span>
          </button>

          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-end gap-6 pt-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white flex items-center justify-center text-4xl lg:text-5xl font-black shadow-2xl border-4 border-[#0b1623] ring-4 ring-cyan-500/20">
                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#0b1623] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[14px]">verified</span>
              </div>
            </div>

            {/* Name + role + badges */}
            <div className="flex-1 text-center lg:text-left pb-1">
              <h1 className="text-2xl lg:text-3xl font-black text-white mb-2">
                {displayName || <span className="text-slate-500 font-medium italic text-xl">Chưa cập nhật tên</span>}
              </h1>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-full border border-emerald-500/30 uppercase tracking-widest">
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
                className="px-5 py-2.5 rounded-xl flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition font-semibold text-sm">
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
            <span className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 lg:px-12 py-8">
            {/* 2-col grid: left = thông tin cá nhân | right = doanh nghiệp */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── LEFT: Thông tin cá nhân ── */}
              <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-[18px]">person</span>
                  <h2 className="text-sm font-bold text-white">Thông tin cá nhân</h2>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_fullname")}</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isDemo}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_phone")}</label>
                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={isDemo}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_email")}</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={isDemo}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Thông tin doanh nghiệp ── */}
              <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-[18px]">apartment</span>
                  <h2 className="text-sm font-bold text-white">Thông tin doanh nghiệp</h2>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_company")}</label>
                    <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} disabled={isDemo}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Vai trò</label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-sm flex items-center gap-2 opacity-60">
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      {roleLabel[role] || role}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Save + error ── */}
            {saveError && (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                <span className="material-symbols-outlined text-[16px]">error</span>{saveError}
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving || isDemo || !isDirty}
                className={`flex-1 lg:flex-none lg:px-10 py-3.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition ${saved ? 'bg-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.3)]' : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-[0_0_24px_rgba(6,182,212,0.25)]'} disabled:opacity-40 disabled:cursor-not-allowed`}>
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
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition font-bold text-sm">
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

