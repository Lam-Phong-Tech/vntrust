"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Validation chuẩn hoá (đồng bộ với /login/[role]) ─────────────────────────
// Email: cấu trúc chuẩn local@domain.tld
function validateEmailStrict(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "Vui lòng nhập email";
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(trimmed)) {
    return "Email không đúng cấu trúc (ví dụ: ten@gmail.com)";
  }
  return null;
}

// Mật khẩu: ≥1 hoa, ≥1 thường, ≥1 số, ≥1 ký tự đặc biệt, 8-20 ký tự
function validatePasswordStrict(pwd: string): string | null {
  if (!pwd) return "Vui lòng nhập mật khẩu";
  if (pwd.length < 8)  return "Mật khẩu tối thiểu 8 ký tự";
  if (pwd.length > 20) return "Mật khẩu tối đa 20 ký tự";
  if (!/[a-z]/.test(pwd))           return "Mật khẩu phải có ≥1 chữ thường";
  if (!/[A-Z]/.test(pwd))           return "Mật khẩu phải có ≥1 chữ HOA";
  if (!/[0-9]/.test(pwd))           return "Mật khẩu phải có ≥1 chữ số";
  if (!/[^A-Za-z0-9]/.test(pwd))    return "Mật khẩu phải có ≥1 ký tự đặc biệt (!@#$%...)";
  return null;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Bước 1: Gửi OTP
  const sendOtp = async () => {
    const emailErr = validateEmailStrict(email);
    if (emailErr) { showMsg(emailErr, false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg("✉️ Mã OTP đã gửi! Kiểm tra hộp thư.", true);
      setStep(2);
      setCountdown(300);
    } catch (e: any) {
      showMsg(e.message || "Không thể gửi OTP", false);
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác thực OTP
  const verifyOtp = async () => {
    const code = otpCode.join("");
    if (code.length < 6) { showMsg("Vui lòng nhập đủ 6 chữ số", false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetToken(data.resetToken);
      setStep(3);
    } catch (e: any) {
      showMsg(e.message || "OTP không đúng", false);
    } finally {
      setLoading(false);
    }
  };

  // Bước 3: Đặt mật khẩu mới
  const resetPassword = async () => {
    const pwdErr = validatePasswordStrict(newPassword);
    if (pwdErr) { showMsg(pwdErr, false); return; }
    if (newPassword !== confirmPassword) { showMsg("Mật khẩu xác nhận không khớp", false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg("🎉 Đặt lại mật khẩu thành công!", true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (e: any) {
      showMsg(e.message || "Lỗi đặt lại mật khẩu", false);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (/^\d$/.test(e.key)) {
      const next = [...otpCode];
      next[idx] = e.key;
      setOtpCode(next);
      if (idx < 5) (document.getElementById(`otp-${idx + 1}`) as HTMLInputElement)?.focus();
      e.preventDefault();
    } else if (e.key === "Backspace") {
      const next = [...otpCode];
      if (next[idx]) { next[idx] = ""; setOtpCode(next); }
      else if (idx > 0) (document.getElementById(`otp-${idx - 1}`) as HTMLInputElement)?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      (document.getElementById(`otp-${idx - 1}`) as HTMLInputElement)?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      (document.getElementById(`otp-${idx + 1}`) as HTMLInputElement)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1320] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="flex flex-col items-center mb-8 z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-[#C8A557]/20 to-[#E4D2A1]/10 rounded-3xl flex items-center justify-center mb-4 border border-[#C8A557]/20 shadow-lg shadow-blue-900/20">
          <span className="material-symbols-outlined text-4xl text-[#C8A557]">shield_person</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">AI VeriGoods</h1>
        <p className="text-slate-400 mt-2 text-sm text-center">Nền tảng xác thực hàng hóa chống giả mạo toàn quốc</p>
      </div>

      {/* Card */}
      <div className="bg-[#1a2235]/90 backdrop-blur-xl border border-slate-800/50 p-8 rounded-3xl w-full max-w-md shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button onClick={() => step === 1 ? router.push("/login") : setStep(s => (s - 1) as 1 | 2 | 3)}
            className="mr-3 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {step === 1 ? "Quên mật khẩu" : step === 2 ? "Nhập mã OTP" : "Mật khẩu mới"}
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {step === 1 ? "Nhận mã xác thực 6 số qua Gmail"
                : step === 2 ? `Mã đã gửi đến ${email}`
                : "Tạo mật khẩu mới cho tài khoản"}
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center mb-7">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${step >= 1 ? "bg-[#C8A557] text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
              {step > 1 ? <span className="material-symbols-outlined text-[15px]">check</span> : "1"}
            </div>
            <span className={`text-[9px] font-bold tracking-wider uppercase ${step >= 1 ? "text-[#C8A557]" : "text-slate-600"}`}>Email</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 mb-3 rounded-full transition-all duration-500 ${step > 1 ? "bg-[#C8A557]" : "bg-white/10"}`} />
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${step >= 2 ? "bg-[#C8A557] text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
              {step > 2 ? <span className="material-symbols-outlined text-[15px]">check</span> : "2"}
            </div>
            <span className={`text-[9px] font-bold tracking-wider uppercase ${step >= 2 ? "text-[#C8A557]" : "text-slate-600"}`}>OTP</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 mb-3 rounded-full transition-all duration-500 ${step > 2 ? "bg-[#C8A557]" : "bg-white/10"}`} />
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${step >= 3 ? "bg-[#C8A557] text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
              3
            </div>
            <span className={`text-[9px] font-bold tracking-wider uppercase ${step >= 3 ? "text-[#C8A557]" : "text-slate-600"}`}>Mật khẩu</span>
          </div>
        </div>

        {/* ── Bước 1 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Địa chỉ Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#C8A557] text-xl">contact_mail</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendOtp()}
                  className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-[#C8A557]/50 focus:ring-1 focus:ring-[#C8A557]/50 transition-all placeholder:text-slate-600"
                  placeholder="example@gmail.com" autoFocus />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-[#C8A557]/10 border border-[#C8A557]/20 rounded-xl">
              <span className="material-symbols-outlined text-[#C8A557] text-[18px] shrink-0">mail</span>
              <p className="text-xs text-slate-300">Mã OTP 6 chữ số sẽ được gửi đến <strong className="text-white">email bạn nhập</strong> qua Gmail.</p>
            </div>
            <button onClick={sendOtp} disabled={loading}
              className="w-full bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] hover:from-[#C8A557] hover:to-[#A6873E] text-[#0B1623] font-bold py-3.5 rounded-xl shadow-lg shadow-[#C8A557]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <span className="animate-spin w-5 h-5 border-2 border-[#0b1320]/30 border-t-[#0b1320] rounded-full" />
                : <><span className="material-symbols-outlined text-xl">send</span> Gửi mã OTP</>}
            </button>
          </div>
        )}

        {/* ── Bước 2 ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Mã xác thực 6 số</label>
              <div className="flex gap-3 justify-center">
                {otpCode.map((digit, idx) => (
                  <input key={idx} id={`otp-${idx}`} type="text" inputMode="numeric"
                    maxLength={1} value={digit}
                    onKeyDown={e => handleOtpKey(e, idx)}
                    onChange={() => {}}
                    className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all outline-none
                      ${digit ? "border-[#C8A557] bg-[#C8A557]/10 text-[#C8A557]" : "border-slate-700/50 bg-[#131b2c] text-white"}
                      focus:border-[#C8A557] focus:ring-2 focus:ring-[#C8A557]/30`}
                    autoFocus={idx === 0} />
                ))}
              </div>
            </div>
            <div className="text-center">
              {countdown > 0
                ? <p className="text-sm text-slate-400">Hết hạn sau <span className="font-bold text-[#C8A557]">{Math.floor(countdown / 60).toString().padStart(2, "0")}:{(countdown % 60).toString().padStart(2, "0")}</span></p>
                : <p className="text-sm text-red-400 font-medium">Mã đã hết hạn</p>}
            </div>
            <button onClick={verifyOtp} disabled={loading || otpCode.join("").length < 6}
              className="w-full bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] hover:from-[#C8A557] hover:to-[#A6873E] text-[#0B1623] font-bold py-3.5 rounded-xl shadow-lg shadow-[#C8A557]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <span className="animate-spin w-5 h-5 border-2 border-[#0b1320]/30 border-t-[#0b1320] rounded-full" />
                : <><span className="material-symbols-outlined text-xl">verified</span> Xác nhận OTP</>}
            </button>
            <div className="text-center">
              <button onClick={() => { setStep(1); setOtpCode(["", "", "", "", "", ""]); }}
                className="text-sm text-slate-500 hover:text-[#C8A557] transition-colors">
                Không nhận được? <span className="underline font-medium">Gửi lại</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Bước 3 ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 bg-[#4A7C5C]/10 border border-[#4A7C5C]/20 rounded-xl">
              <span className="material-symbols-outlined text-[#6FB585] text-[20px] shrink-0">verified_user</span>
              <p className="text-xs text-emerald-300 font-medium">Xác thực thành công! Tạo mật khẩu mới.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Mật khẩu mới <span className="ml-1 text-[10px] font-normal text-slate-500 normal-case">(8–20 ký tự · hoa + thường + số + ký tự đặc biệt)</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#C8A557] text-xl">lock</span>
                <input type={showPassword ? "text" : "password"} value={newPassword}
                  onChange={e => setNewPassword(e.target.value.slice(0, 20))}
                  minLength={8} maxLength={20}
                  className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-[#C8A557]/50 focus:ring-1 focus:ring-[#C8A557]/50 transition-all placeholder:text-slate-600"
                  placeholder="VD: Abc@1234" autoFocus />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              {/* Strength meter */}
              {newPassword.length > 0 && (() => {
                const checks = [
                  newPassword.length >= 8 && newPassword.length <= 20,
                  /[A-Z]/.test(newPassword),
                  /[a-z]/.test(newPassword),
                  /\d/.test(newPassword),
                  /[^A-Za-z0-9]/.test(newPassword),
                ];
                const score = checks.filter(Boolean).length;
                const colors = ['bg-red-500','bg-red-400','bg-amber-500','bg-amber-400','bg-[#4A7C5C]'];
                const labels = ['Rất yếu','Yếu','Trung bình','Mạnh','Rất mạnh'];
                const textColors = ['text-red-400','text-red-300','text-amber-400','text-amber-300','text-[#6FB585]'];
                return (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score-1] : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-between items-center gap-1">
                      <span className={`text-[10px] font-bold ${textColors[score-1] || 'text-slate-500'}`}>{score > 0 ? labels[score-1] : ''}</span>
                      <div className="flex gap-1 flex-wrap">
                        {[['8-20', checks[0]], ['HOA', checks[1]], ['thường', checks[2]], ['số', checks[3]], ['!@#', checks[4]]].map(([l, ok], i) => (
                          <span key={i} className={`text-[9px] px-1 py-0.5 rounded font-bold ${ok ? 'bg-[#4A7C5C]/20 text-[#6FB585]' : 'bg-white/5 text-slate-600'}`}>{l as string}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Xác nhận mật khẩu</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#C8A557] text-xl">lock_reset</span>
                <input type={showPassword ? "text" : "password"} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value.slice(0, 20))}
                  maxLength={20}
                  className={`w-full bg-[#131b2c] border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white
                    ${confirmPassword && confirmPassword !== newPassword ? "border-red-500/60 focus:ring-red-500/30" : "border-slate-700/50 focus:border-[#C8A557]/50 focus:ring-[#C8A557]/50"}`}
                  placeholder="Nhập lại mật khẩu" />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">error</span> Mật khẩu không khớp
                  </p>
                )}
              </div>
            </div>
            <button onClick={resetPassword} disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] hover:from-[#C8A557] hover:to-[#A6873E] text-[#0B1623] font-bold py-3.5 rounded-xl shadow-lg shadow-[#C8A557]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
              {loading ? <span className="animate-spin w-5 h-5 border-2 border-[#0b1320]/30 border-t-[#0b1320] rounded-full" />
                : <><span className="material-symbols-outlined text-xl">key</span> Đặt lại mật khẩu</>}
            </button>
          </div>
        )}
      </div>

      {/* Link về đăng nhập */}
      <a href="/login" className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2 z-10">
        <span className="material-symbols-outlined text-base">home</span> Về trang chủ
      </a>

      {/* Toast */}
      {msg && (
        <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-sm transition-all
          ${msg.ok ? "bg-[#4A7C5C] text-white" : "bg-red-600 text-white"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
