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
  const [userName, setUserName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manufacturer");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showChangePass, setShowChangePass] = useState(false);

  // Load real user data from API
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          // Fallback to localStorage
          setUserName(localStorage.getItem("userName") || "");
          setIsDemo(true);
        } else {
          setUserName(data.ten || "");
          setEmail(data.email || "");
          setPhone(data.soDienThoai || "");
          setCompany(data.tenDoanhNghiep || "");
          setRole(data.role || "manufacturer");
          setIsDemo(data.isDemo || false);
        }
      })
      .catch(() => {
        setUserName(localStorage.getItem("userName") || "");
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
        body: JSON.stringify({ ten: userName, soDienThoai: phone, email, tenDoanhNghiep: company }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        localStorage.setItem("userName", data.ten || userName);
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

      <div className="min-h-[calc(100vh-80px)] w-full relative flex flex-col p-4 md:p-8 max-w-lg mx-auto pb-24">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-white font-headline">{t("prof_title")}</h1>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white flex items-center justify-center text-4xl font-black mb-4 shadow-xl border-4 border-[#0b1623]">
                {userName ? userName.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30 uppercase tracking-widest">
                {roleLabel[role] || role}
              </div>
              {isDemo && (
                <div className="mt-2 px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] rounded-full border border-amber-500/20">
                  Tài khoản Demo — thông tin chỉ đọc
                </div>
              )}
            </div>

            {/* Info form */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-5 mb-4">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_fullname")}</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} disabled={isDemo}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_company")}</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} disabled={isDemo}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_phone")}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isDemo}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t("prof_email")}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isDemo}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 transition focus:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>

              {saveError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                  <span className="material-symbols-outlined text-[14px]">error</span>{saveError}
                </div>
              )}

              <button onClick={handleSave} disabled={saving || isDemo}
                className={`w-full py-3.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition ${saved ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                {saving ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saved ? (
                  <><span className="material-symbols-outlined text-[18px]">check_circle</span> {t("prof_saved")}</>
                ) : t("prof_save")}
              </button>
            </div>

            {/* Change password */}
            <button onClick={() => setShowChangePass(true)}
              className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition font-bold text-sm mb-4 shadow-lg">
              <span className="material-symbols-outlined text-[18px]">lock_reset</span> {t("prof_change_pass")}
            </button>

            {/* Logout */}
            <button onClick={handleLogout}
              className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition font-bold text-sm shadow-lg">
              <span className="material-symbols-outlined text-[18px]">logout</span> {t("prof_logout")}
            </button>
          </>
        )}
      </div>
    </>
  );
}
