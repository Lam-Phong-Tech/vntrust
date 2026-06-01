"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Toast component ──────────────────────────────────────────────────────────
type TType = "error" | "success" | "info";
function Toast({ msg, type, onClose }: { msg: string; type: TType; onClose: () => void }) {
  const cls = {
    error:   "bg-red-500/15 border-red-500/40 text-red-300",
    success: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    info:    "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
  }[type];
  const icon = { error: "error", success: "check_circle", info: "info" }[type];
  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-md shadow-2xl text-sm font-semibold animate-in slide-in-from-top-4 duration-300 ${cls}`}>
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition">
        <span className="material-symbols-outlined text-[15px]">close</span>
      </button>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: TType } | null>(null);
  const show = (msg: string, type: TType = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };
  return { toast, show, dismiss: () => setToast(null) };
}

// ─── Phone validation helper ──────────────────────────────────────────────────
function validateVNPhone(phone: string, errMsg: string): string | null {
  const cleaned = phone.replace(/\s+/g, "").replace(/^(\+84|0084)/, "0");
  if (!/^0[3-9]\d{8}$/.test(cleaned)) {
    return errMsg;
  }
  return null;
}

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const pageRole = (params?.role as string) || "consumer";

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"login" | "register" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { toast, show: showToast, dismiss } = useToast();

  // OTP flow states
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1); // 1=email, 2=otp, 3=newpass
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPhoneError, setRegPhoneError] = useState("");
  const [regPassword, setRegPassword] = useState("");
  // Business-specific fields (NSX/NNK)
  const [regCompany, setRegCompany] = useState("");
  const [regTaxCode, setRegTaxCode] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regHotline, setRegHotline] = useState("");
  
  const isBusiness = pageRole === "manufacturer" || pageRole === "importer";
  const resetRegForm = () => { setRegName(""); setRegEmail(""); setRegPhone(""); setRegPhoneError(""); setRegPassword(""); setRegCompany(""); setRegTaxCode(""); setRegAddress(""); setRegHotline(""); };

  const handleTestRegister = () => {
    setUsername("test_user_" + Math.floor(Math.random()*1000));
    setRegName("Công ty TNHH Demo " + Math.floor(Math.random()*1000));
    setRegEmail("demo" + Math.floor(Math.random()*1000) + "@vntrust.vn");
    setRegPhone("09" + Math.floor(Math.random()*100000000).toString().padStart(8, '0'));
    setRegAddress("Khu CN cao, Q9, TP.HCM");
    setRegTaxCode(Math.floor(Math.random() * 9000000000 + 1000000000).toString());
    setPassword("DemoPass123!");
    setConfirmPassword("DemoPass123!");
  };

  const handlePhoneChange = (val: string) => {
    setRegPhone(val);
    if (val.length > 0) {
      const err = validateVNPhone(val, t("login_phone_invalid"));
      setRegPhoneError(err || "");
    } else {
      setRegPhoneError("");
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (view === "register") {
      // Phone validation
      const phoneErr = validateVNPhone(regPhone, t("login_phone_invalid"));
      if (phoneErr) { setRegPhoneError(phoneErr); return; }

      // Business role: extra required fields
      if (isBusiness) {
        if (!regCompany.trim()) { showToast("Vui lòng nhập tên công ty / doanh nghiệp", "error"); return; }
        if (!regTaxCode.trim()) { showToast("Vui lòng nhập mã số thuế (MST)", "error"); return; }
        if (!/^\d{10}(\d{3})?$/.test(regTaxCode.replace(/-/g, ""))) { showToast("Mã số thuế không hợp lệ (10 hoặc 13 số)", "error"); return; }
        if (!regAddress.trim()) { showToast("Vui lòng nhập địa chỉ nhà máy / kho hàng", "error"); return; }
        // Removed corporate email validation for easier testing
      }
    }

    setLoading(true);

    try {
      if (view === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (res.ok && data.role) {
          // Clear chat history for previous account when switching accounts
          const prevUser = localStorage.getItem("userName");
          const newUser = data.username || username;
          if (prevUser && prevUser !== newUser) {
            localStorage.removeItem("vntrust_chat_web");
            localStorage.removeItem(`vntrust_chat_${prevUser}`);
          }
          localStorage.setItem("userRole", data.role);
          localStorage.setItem("userName", newUser);
          if (data.doanhNghiepId) {
            localStorage.setItem("doanhNghiepId", data.doanhNghiepId);
          } else {
            localStorage.removeItem("doanhNghiepId");
          }
          // Dùng window.location thay vì router.push — tránh race condition
          // với useEffect[router] khi localStorage vừa được set
          setIsRedirecting(true);
          window.location.href = "/dashboard";
        } else {
          showToast(data.error || t("login_err_pass"), "error");
          setLoading(false);
        }
      } else if (view === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: regName,
            email: regEmail,
            phone: regPhone,
            role: pageRole,
            password: regPassword,
            // Business fields
            company: regCompany,
            taxCode: regTaxCode,
            address: regAddress,
            hotline: regHotline,
          })
        });
        const data = await res.json();

        if (res.ok) {
          showToast("Đăng ký thành công! Vui lòng đăng nhập.", "success");
          setTimeout(() => {
            setView("login");
            setUsername(regEmail);
            setPassword(regPassword);
            resetRegForm();
          }, 1500);
        } else {
          // Show duplicate phone error specifically
          if (data.error?.toLowerCase().includes("phone") || data.error?.toLowerCase().includes("sdt") || data.error?.toLowerCase().includes("điện thoại")) {
            setRegPhoneError(t("login_phone_dup"));
          }
          showToast(data.error || t("login_err_reg"), "error");
        }
        setLoading(false);
      } else if (view === "forgot") {
        // handled by separate OTP functions below
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      showToast("Lỗi kết nối máy chủ!", "error");
      setLoading(false);
    }
  };

  // Redirect nếu đã đăng nhập — kiểm tra cookie (giống middleware) thay vì localStorage
  // để tránh vòng lặp: localStorage có nhưng cookie không có → middleware chặn → /login loop
  useEffect(() => {
    if (isRedirecting) return;
    // Đọc cookie userRole (middleware dùng cookie này để bảo vệ route)
    const cookieRole = document.cookie
      .split("; ")
      .find(row => row.startsWith("userRole="))
      ?.split("=")?.[1];
    if (cookieRole) {
      router.replace("/dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── OTP Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  // ── Bước 1: Gửi OTP ─────────────────────────────────────────────────────────
  const sendOtp = async () => {
    if (!otpEmail.trim()) { showToast("Vui lòng nhập email", "error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail)) { showToast("Email không hợp lệ", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("✉️ Mã OTP đã gửi! Kiểm tra hộp thư của bạn.", "success");
      setOtpStep(2);
      setOtpCountdown(300); // 5 phút
    } catch (e: any) {
      showToast(e.message || "Không thể gửi OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Bước 2: Xác thực OTP ─────────────────────────────────────────────────────
  const verifyOtp = async () => {
    const code = otpCode.join("");
    if (code.length < 6) { showToast("Vui lòng nhập đủ 6 chữ số", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetToken(data.resetToken);
      setOtpStep(3);
    } catch (e: any) {
      showToast(e.message || "OTP không đúng", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Bước 3: Đặt mật khẩu mới ─────────────────────────────────────────────────
  const resetPassword = async () => {
    if (newPassword.length < 6) { showToast("Mật khẩu phải có ít nhất 6 ký tự", "error"); return; }
    if (newPassword !== confirmPassword) { showToast("Mật khẩu xác nhận không khớp", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("🎉 Đặt lại mật khẩu thành công!", "success");
      setTimeout(() => {
        setView("login");
        setOtpStep(1);
        setOtpEmail(""); setOtpCode(["","","","","",""]); setResetToken("");
        setNewPassword(""); setConfirmPassword("");
      }, 1500);
    } catch (e: any) {
      showToast(e.message || "Lỗi đặt lại mật khẩu", "error");
    } finally {
      setLoading(false);
    }
  };

  // OTP input keyboard handler
  const handleOtpKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const val = e.currentTarget.value;
    if (/^\d$/.test(e.key)) {
      const next = [...otpCode];
      next[idx] = e.key;
      setOtpCode(next);
      if (idx < 5) (document.getElementById(`otp-${idx+1}`) as HTMLInputElement)?.focus();
      e.preventDefault();
    } else if (e.key === "Backspace") {
      const next = [...otpCode];
      if (next[idx]) { next[idx] = ""; setOtpCode(next); }
      else if (idx > 0) { (document.getElementById(`otp-${idx-1}`) as HTMLInputElement)?.focus(); }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      (document.getElementById(`otp-${idx-1}`) as HTMLInputElement)?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      (document.getElementById(`otp-${idx+1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleDemoLogin = (demoRole: string, demoUsername: string) => {
    setUsername(demoUsername);
    let pass = "123456";
    if (demoRole === 'admin') pass = "Admin@VNTrust2024!";
    else if (demoRole === 'manufacturer') pass = "Mfr@VNTrust2024!";
    else if (demoRole === 'importer') pass = "Imp@VNTrust2024!";
    else if (demoRole === 'consumer') pass = "Con@VNTrust2024!";
    setPassword(pass);
  };

  // Role label map
  const roleLabels: Record<string,string> = { admin: 'Quản trị viên', manufacturer: 'Nhà sản xuất', importer: 'Nhà phân phối', consumer: 'Người tiêu dùng' };
  const roleIcons: Record<string,string> = { admin: 'admin_panel_settings', manufacturer: 'factory', importer: 'local_shipping', consumer: 'qr_code_scanner' };

  return (
    <div style={{ position:'fixed', inset:0, background:'#0B1623', display:'flex', flexDirection:'column', alignItems:'center', zIndex:100, overflowY:'auto' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={dismiss} />}

      {/* Background glow */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,165,87,0.12) 0%, transparent 60%)' }} />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:440, margin:'auto', padding:'32px 20px 40px' }}>

        {/* Top bar: back + brand */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
          <button onClick={() => router.back()} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(246,241,232,0.08)', border:'1px solid rgba(246,241,232,0.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'#F6F1E8', cursor:'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:16, color:'#F6F1E8' }}>VN<span style={{ color:'#C8A557' }}>Trust</span></div>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(246,241,232,0.08)', border:'1px solid rgba(246,241,232,0.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'#C8A557' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>{roleIcons[pageRole] || 'shield'}</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px 5px 8px', background:'rgba(200,165,87,0.1)', border:'1px solid rgba(200,165,87,0.25)', borderRadius:100, marginBottom:14 }}>
            <span className="gold-pulse-dot" />
            <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'#C8A557' }}>{roleLabels[pageRole] || pageRole}</span>
          </div>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:400, fontSize:26, letterSpacing:'-0.02em', lineHeight:1.15, color:'#F6F1E8', marginBottom:6 }}>
            {view === 'login' ? <>{t('login_title')}</> : view === 'register' ? <>Tạo <em style={{ fontStyle:'italic', color:'#C8A557', fontWeight:300 }}>tài khoản</em></> : <>Quên <em style={{ fontStyle:'italic', color:'#C8A557', fontWeight:300 }}>mật khẩu</em></>}
          </h1>
          <p style={{ fontSize:12, color:'rgba(246,241,232,0.5)', lineHeight:1.5 }}>
            {view === 'login' ? t('login_enter_info') : view === 'register' ? t('reg_sub') : 'Khôi phục quyền truy cập tài khoản'}
          </p>
        </div>

        {/* Main Card */}
        <div style={{ background:'linear-gradient(180deg,rgba(246,241,232,0.05) 0%,rgba(246,241,232,0.02) 100%)', border:'1px solid rgba(200,165,87,0.15)', borderRadius:20, padding:'24px 20px', marginBottom:16 }}>
          {view === "login" && (
            <div>
              <form onSubmit={handleAction} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'rgba(246,241,232,0.5)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>{t('login_email_phone')}</label>
                  <div style={{ position:'relative' }}>
                    <span className="material-symbols-outlined" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:20, color:'rgba(200,165,87,0.7)' }}>person</span>
                    <input required value={username} onChange={e => setUsername(e.target.value)} type="text"
                      style={{ width:'100%', padding:'12px 14px 12px 44px', background:'rgba(246,241,232,0.06)', border:'1px solid rgba(200,165,87,0.2)', borderRadius:12, fontSize:14, color:'#F6F1E8', outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }}
                      placeholder={t('login_ph_email')} />
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'rgba(246,241,232,0.5)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>{t('login_pass')}</label>
                  <div style={{ position:'relative' }}>
                    <span className="material-symbols-outlined" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:20, color:'rgba(200,165,87,0.7)' }}>lock</span>
                    <input required value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'}
                      style={{ width:'100%', padding:'12px 44px 12px 44px', background:'rgba(246,241,232,0.06)', border:'1px solid rgba(200,165,87,0.2)', borderRadius:12, fontSize:14, color:'#F6F1E8', outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }}
                      placeholder={t('login_ph_pass')} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(246,241,232,0.4)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:20 }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#E4D2A1,#C8A557)', color:'#0B1623', border:'none', borderRadius:14, fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading?0.7:1, marginTop:4 }}>
                  {loading ? <span style={{ width:20, height:20, border:'2px solid rgba(11,22,35,0.3)', borderTopColor:'#0B1623', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} /> : <>{t('login_btn_login')} <span className="material-symbols-outlined" style={{ fontSize:18 }}>arrow_forward</span></>}
                </button>
              </form>

              <div style={{ marginTop:16, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <button onClick={() => router.push('/forgot-password')} style={{ fontSize:12, color:'rgba(246,241,232,0.45)', background:'none', border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>
                  {t('login_forgot')}
                </button>
                {pageRole !== 'admin' && (
                  <div style={{ fontSize:12, color:'rgba(246,241,232,0.4)' }}>
                    {t('login_no_account')} <button onClick={() => setView('register')} style={{ color:'#C8A557', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12 }}>{t('login_register_now')}</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "register" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center mb-6">
                <button onClick={() => setView("login")} className="mr-3 text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white">{t("reg_title")}</h2>
                  <p className="text-slate-400 text-sm mt-1">{t("reg_sub")}</p>
                </div>
              </div>

              <form onSubmit={handleAction} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t("reg_name")}</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 text-xl">person</span>
                    <input required type="text" value={regName} onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
                      placeholder={t("reg_ph_name")} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 text-xl">mail</span>
                    <input required type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
                      placeholder={t("reg_ph_email")} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t("reg_phone")}</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-green-500 text-xl">call</span>
                    <input required type="tel" value={regPhone} onChange={(e) => handlePhoneChange(e.target.value)}
                      maxLength={11}
                      className={`w-full bg-[#131b2c] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white ${
                        regPhoneError ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30" : "border-slate-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/50"
                      }`}
                      placeholder="0xxxxxxxxx" />
                  </div>
                  {regPhoneError && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">error</span>
                      {regPhoneError}
                    </p>
                  )}
                </div>

                  {/* Role is automatically set from the URL parameter */}

                {/* ── Business fields: chỉ hiện khi chọn NSX / NNK ── */}
                {isBusiness && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <span className="material-symbols-outlined text-amber-400 text-[16px] shrink-0">business_center</span>
                      <p className="text-xs text-amber-300 font-medium">Vai trò doanh nghiệp yêu cầu thêm thông tin xác thực (BR-01 / FR-KYC-01)</p>
                    </div>

                    {/* Tên công ty */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Tên công ty / Doanh nghiệp <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 text-xl">apartment</span>
                        <input required={isBusiness} type="text" value={regCompany} onChange={e => setRegCompany(e.target.value)}
                          className={`w-full bg-[#131b2c] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white ${
                            !regCompany && isBusiness ? "border-amber-500/40" : "border-slate-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/50"
                          }`}
                          placeholder="VD: Công ty TNHH ABC Việt Nam" />
                      </div>
                    </div>

                    {/* Mã số thuế */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Mã số thuế (MST) <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 text-xl">tag</span>
                        <input required={isBusiness} type="text" value={regTaxCode} onChange={e => setRegTaxCode(e.target.value.replace(/[^0-9-]/g,""))}
                          maxLength={14}
                          className={`w-full bg-[#131b2c] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white font-mono ${
                            regTaxCode && !/^\d{10}(\d{3})?$/.test(regTaxCode.replace(/-/g,"")) ? "border-red-500/60 focus:ring-red-500/30" : !regTaxCode && isBusiness ? "border-amber-500/40" : "border-slate-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/50"
                          }`}
                          placeholder="VD: 0123456789" />
                      </div>
                      {regTaxCode && !/^\d{10}(\d{3})?$/.test(regTaxCode.replace(/-/g,"")) && (
                        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">error</span>
                          MST phải có 10 hoặc 13 chữ số
                        </p>
                      )}
                    </div>

                    {/* Địa chỉ */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Địa chỉ nhà máy / kho hàng <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3.5 text-purple-400 text-xl">location_on</span>
                        <textarea required={isBusiness} value={regAddress} onChange={e => setRegAddress(e.target.value)}
                          rows={2}
                          className={`w-full bg-[#131b2c] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white resize-none ${
                            !regAddress && isBusiness ? "border-amber-500/40" : "border-slate-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/50"
                          }`}
                          placeholder="VD: Số 10 Lý Thái Tổ, Quận 1, TP.HCM" />
                      </div>
                    </div>

                    {/* Hotline (không bắt buộc nhưng nên có) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Hotline xác thực doanh nghiệp
                        <span className="ml-2 text-[10px] font-normal text-slate-500 normal-case">(không bắt buộc)</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 text-xl">support_agent</span>
                        <input type="tel" value={regHotline} onChange={e => setRegHotline(e.target.value)}
                          className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
                          placeholder="VD: 1800 xxxx" />
                      </div>
                    </div>


                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Mật khẩu <span className="text-red-400">*</span>
                    <span className="ml-2 text-[10px] font-normal text-slate-500 normal-case">(NFR-SC-07: ≥12 ký tự)</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 text-xl">lock</span>
                    <input required type={showPassword ? "text" : "password"} value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
                      placeholder="Min 12 ký tự, hoa+thường+số+ký tự đặc biệt" minLength={12} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                  {/* NFR-SC-07: Password Strength Meter */}
                  {regPassword.length > 0 && (() => {
                    const checks = [
                      regPassword.length >= 12,
                      /[A-Z]/.test(regPassword),
                      /[a-z]/.test(regPassword),
                      /\d/.test(regPassword),
                      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword),
                    ];
                    const score = checks.filter(Boolean).length;
                    const colors = ['bg-red-500','bg-red-400','bg-amber-500','bg-amber-400','bg-emerald-500'];
                    const labels = ['Rất yếu','Yếu','Trung bình','Mạnh','Rất mạnh'];
                    const textColors = ['text-red-400','text-red-300','text-amber-400','text-amber-300','text-emerald-400'];
                    return (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[0,1,2,3,4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score-1] : 'bg-white/10'}`} />
                          ))}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold ${textColors[score-1] || 'text-slate-500'}`}>
                            {score > 0 ? labels[score-1] : ''}
                          </span>
                          <div className="flex gap-2">
                            {[['12+ ký tự', checks[0]], ['HOA', checks[1]], ['thường', checks[2]], ['số', checks[3]], ['ký tự !@#', checks[4]]].map(([l, ok], i) => (
                              <span key={i} className={`text-[9px] px-1 py-0.5 rounded font-bold ${ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-600'}`}>{l as string}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <button type="submit" disabled={loading || !!regPhoneError}
                  className="w-full mt-6 bg-[#3cdada] hover:bg-[#34c4c4] text-[#0b1320] font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="animate-spin w-5 h-5 border-2 border-[#0b1320]/30 border-t-[#0b1320] rounded-full"></span>
                  ) : (
                    <>{t("reg_btn")} <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">person_add</span></>
                  )}
                </button>
              </form>
            </div>
          )}

          {view === "forgot" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header */}
              <div className="flex items-center mb-6">
                <button onClick={() => { setView("login"); setOtpStep(1); setOtpCode(["","","","","",""]); }} className="mr-3 text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {otpStep === 1 ? "Quên mật khẩu" : otpStep === 2 ? "Nhập mã OTP" : "Đặt mật khẩu mới"}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {otpStep === 1 ? "Nhập email để nhận mã xác thực 6 số" : otpStep === 2 ? `Mã đã gửi đến ${otpEmail}` : "Tạo mật khẩu mới cho tài khoản"}
                  </p>
                </div>
              </div>

              {/* Step indicators */}
              <div className="flex items-center mb-7">
                {/* Bước 1 */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${otpStep >= 1 ? "bg-cyan-500 text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
                    {otpStep > 1 ? <span className="material-symbols-outlined text-[15px]">check</span> : "1"}
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${otpStep >= 1 ? "text-cyan-400" : "text-slate-600"}`}>Email</span>
                </div>
                {/* Line 1→2 */}
                <div className={`flex-1 h-0.5 mx-2 mb-3 rounded-full transition-all duration-500 ${otpStep > 1 ? "bg-cyan-500" : "bg-white/10"}`} />
                {/* Bước 2 */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${otpStep >= 2 ? "bg-cyan-500 text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
                    {otpStep > 2 ? <span className="material-symbols-outlined text-[15px]">check</span> : "2"}
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${otpStep >= 2 ? "text-cyan-400" : "text-slate-600"}`}>OTP</span>
                </div>
                {/* Line 2→3 */}
                <div className={`flex-1 h-0.5 mx-2 mb-3 rounded-full transition-all duration-500 ${otpStep > 2 ? "bg-cyan-500" : "bg-white/10"}`} />
                {/* Bước 3 */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${otpStep >= 3 ? "bg-cyan-500 text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
                    {otpStep > 3 ? <span className="material-symbols-outlined text-[15px]">check</span> : "3"}
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${otpStep >= 3 ? "text-cyan-400" : "text-slate-600"}`}>Mật khẩu</span>
                </div>
              </div>

              {/* ── Bước 1: Nhập email ── */}
              {otpStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Địa chỉ Email</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 text-xl">contact_mail</span>
                      <input
                        type="email" value={otpEmail}
                        onChange={e => setOtpEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendOtp()}
                        className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
                        placeholder="example@gmail.com"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">mail</span>
                    <p className="text-xs text-slate-300">Mã OTP 6 chữ số sẽ được gửi qua <strong className="text-white">Gmail</strong>. Kiểm tra cả thư mục Spam nếu không thấy.</p>
                  </div>
                  <button onClick={sendOtp} disabled={loading}
                    className="w-full bg-[#3cdada] hover:bg-[#34c4c4] text-[#0b1320] font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50">
                    {loading
                      ? <span className="animate-spin w-5 h-5 border-2 border-[#0b1320]/30 border-t-[#0b1320] rounded-full" />
                      : <><span className="material-symbols-outlined text-xl">send</span> Gửi mã OTP</>
                    }
                  </button>
                </div>
              )}

              {/* ── Bước 2: Nhập OTP ── */}
              {otpStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Mã xác thực 6 số</label>
                    <div className="flex gap-3 justify-center">
                      {otpCode.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-${idx}`}
                          type="text" inputMode="numeric"
                          maxLength={1} value={digit}
                          onKeyDown={e => handleOtpKey(e, idx)}
                          onChange={() => {}}
                          className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all outline-none
                            ${digit ? "border-cyan-400 bg-cyan-500/10 text-cyan-300" : "border-slate-700/50 bg-[#131b2c] text-white"}
                            focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30`}
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="text-center">
                    {otpCountdown > 0 ? (
                      <p className="text-sm text-slate-400">
                        Mã hết hạn sau{" "}
                        <span className="font-bold text-cyan-400">
                          {Math.floor(otpCountdown / 60).toString().padStart(2, "0")}:{(otpCountdown % 60).toString().padStart(2, "0")}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-red-400 font-medium">Mã đã hết hạn</p>
                    )}
                  </div>

                  <button onClick={verifyOtp} disabled={loading || otpCode.join("").length < 6}
                    className="w-full bg-[#3cdada] hover:bg-[#34c4c4] text-[#0b1320] font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50">
                    {loading
                      ? <span className="animate-spin w-5 h-5 border-2 border-[#0b1320]/30 border-t-[#0b1320] rounded-full" />
                      : <><span className="material-symbols-outlined text-xl">verified</span> Xác nhận OTP</>
                    }
                  </button>

                  {/* Gửi lại */}
                  <div className="text-center">
                    <button
                      onClick={() => { setOtpStep(1); setOtpCode(["","","","","",""]); }}
                      className="text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                      Không nhận được mã? <span className="underline font-medium">Gửi lại</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Bước 3: Đặt mật khẩu mới ── */}
              {otpStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[20px] shrink-0">verified_user</span>
                    <p className="text-xs text-emerald-300 font-medium">Xác thực thành công! Tạo mật khẩu mới cho tài khoản.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Mật khẩu mới</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 text-xl">lock</span>
                      <input type={showPassword ? "text" : "password"} value={newPassword}
                        onChange={e => setNewPassword(e.target.value)} minLength={6}
                        className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
                        placeholder="Ít nhất 6 ký tự" autoFocus />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 text-xl">lock_reset</span>
                      <input type={showPassword ? "text" : "password"} value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={`w-full bg-[#131b2c] border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white
                          ${confirmPassword && confirmPassword !== newPassword ? "border-red-500/60 focus:ring-red-500/30" : "border-slate-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/50"}`}
                        placeholder="Nhập lại mật khẩu" />
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">error</span> Mật khẩu không khớp
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={resetPassword} disabled={loading || !newPassword || !confirmPassword}
                    className="w-full bg-[#3cdada] hover:bg-[#34c4c4] text-[#0b1320] font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-2">
                    {loading
                      ? <span className="animate-spin w-5 h-5 border-2 border-[#0b1320]/30 border-t-[#0b1320] rounded-full" />
                      : <><span className="material-symbols-outlined text-xl">key</span> Đặt lại mật khẩu</>
                    }
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Demo Accounts */}
        {view === 'login' && (
          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:'rgba(200,165,87,0.15)' }} />
              <span style={{ fontSize:10, fontWeight:600, color:'rgba(246,241,232,0.35)', letterSpacing:'0.15em', textTransform:'uppercase' }}>{t('demo_label')}</span>
              <div style={{ flex:1, height:1, background:'rgba(200,165,87,0.15)' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { role:'manufacturer', user:'nsx@vntrust.vn', icon:'factory', label:t('demo_mfr'), color:'#C8A557' },
                { role:'importer', user:'nhapkhau@vntrust.vn', icon:'local_shipping', label:t('demo_imp'), color:'#6FB585' },
                { role:'consumer', user:'nguoitieudung@vntrust.vn', icon:'qr_code_scanner', label:t('demo_con'), color:'#52c2c2' },
                { role:'admin', user:'admin@vntrust.vn', icon:'admin_panel_settings', label:t('demo_admin'), color:'#C8893A' },
              ].map(d => (
                <button key={d.role} onClick={() => handleDemoLogin(d.role, d.user)} style={{ background:'rgba(246,241,232,0.04)', border:'1px solid rgba(200,165,87,0.12)', borderRadius:12, padding:'12px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer', transition:'all 0.2s' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:22, color:d.color, fontVariationSettings:"'FILL' 1" }}>{d.icon}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:'#F6F1E8', fontFamily:'Outfit,sans-serif' }}>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop:24, textAlign:'center' }}>
          <Link href="/login" style={{ fontSize:12, color:'rgba(246,241,232,0.35)', display:'inline-flex', alignItems:'center', gap:5, textDecoration:'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize:14 }}>arrow_back</span>
            Chọn vai trò khác
          </Link>
        </div>
      </div>
    </div>
  );
}
