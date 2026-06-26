"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Toast component ──────────────────────────────────────────────────────────
type TType = "error" | "success" | "info";
function Toast({ msg, type, onClose }: { msg: string; type: TType; onClose: () => void }) {
  const cls = {
    error:   "bg-red-500/15 border-red-500/40 text-red-300",
    success: "bg-[#4A7C5C]/15 border-[#4A7C5C]/40 text-emerald-300",
    info:    "bg-[#1F6FEB]/15 border-[#1F6FEB]/40 text-cyan-300",
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

// ─── Validation helpers (chuẩn hoá theo yêu cầu) ──────────────────────────────
// Họ tên: chỉ chữ + dấu space, tối đa 20 ký tự
function validateHoTen(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Vui lòng nhập họ và tên";
  if (trimmed.length > 20) return "Họ và tên tối đa 20 ký tự";
  // Cho phép chữ Latin + chữ có dấu Việt Nam + space, KHÔNG số/ký tự đặc biệt
  if (!/^[\p{L}\s]+$/u.test(trimmed)) return "Họ và tên không được chứa số hoặc ký tự đặc biệt";
  return null;
}

// Email: cấu trúc chuẩn local@domain.tld
function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "Vui lòng nhập email";
  // RFC simplified: local-part @ domain . tld
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(trimmed)) {
    return "Email không đúng cấu trúc (ví dụ: ten@gmail.com)";
  }
  return null;
}

// Phone VN: 10 số, đầu 01-09
function validateVNPhone(phone: string, _errMsg?: string): string | null {
  const cleaned = phone.replace(/\s+/g, "").replace(/^(\+84|0084)/, "0");
  if (!/^0[1-9]\d{8}$/.test(cleaned)) {
    return "Số điện thoại phải đủ 10 số, bắt đầu bằng 01-09 (ví dụ: 0987654321)";
  }
  return null;
}

// Mật khẩu: ≥1 hoa, ≥1 thường, ≥1 số, ≥1 ký tự đặc biệt, tối đa 20 ký tự
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

export default function LoginPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pageRole = (params?.role as string) || "consumer";

  const kickReason = searchParams?.get("reason"); // 'suspended' | null

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
  
  // Vai trò chọn khi đăng ký (cho phép đổi giữa Người tiêu dùng / Doanh nghiệp)
  const [regRole, setRegRole] = useState<string>(pageRole === "consumer" ? "consumer" : pageRole === "admin" ? "admin" : "manufacturer");
  const isBusiness = regRole === "manufacturer";
  // Đăng ký DN tách 2 bước: 1 = thông tin, 2 = giấy tờ
  const [regStep, setRegStep] = useState<1 | 2>(1);
  // KYC document states
  const [regGiayphep, setRegGiayphep] = useState<File | null>(null);
  const [regCmnd, setRegCmnd] = useState<File | null>(null);
  const [uploadingKyc, setUploadingKyc] = useState<Record<string, boolean>>({});
  const [uploadedKycUrls, setUploadedKycUrls] = useState<Record<string, string>>({});

  const resetRegForm = () => {
    setRegName(""); setRegEmail(""); setRegPhone(""); setRegPhoneError(""); setRegPassword("");
    setRegCompany(""); setRegTaxCode(""); setRegAddress(""); setRegHotline("");
    setRegGiayphep(null); setRegCmnd(null); setUploadingKyc({}); setUploadedKycUrls({});
    setRegStep(1);
  };

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
      // Họ và tên — chỉ chữ + dấu, max 20
      const nameErr = validateHoTen(regName);
      if (nameErr) { showToast(nameErr, "error"); return; }

      // Email — phải đúng cấu trúc
      const emailErr = validateEmail(regEmail);
      if (emailErr) { showToast(emailErr, "error"); return; }

      // Phone — 10 số, đầu 01-09
      const phoneErr = validateVNPhone(regPhone);
      if (phoneErr) { setRegPhoneError(phoneErr); showToast(phoneErr, "error"); return; }

      // Password — phức tạp
      const pwdErr = validatePasswordStrict(regPassword);
      if (pwdErr) { showToast(pwdErr, "error"); return; }

      // Business role: extra required fields
      if (isBusiness) {
        if (!regCompany.trim()) { showToast("Vui lòng nhập tên công ty / doanh nghiệp", "error"); return; }
        if (!regTaxCode.trim()) { showToast("Vui lòng nhập mã số thuế (MST)", "error"); return; }
        if (!/^\d{10}(\d{3})?$/.test(regTaxCode.replace(/-/g, ""))) { showToast("Mã số thuế không hợp lệ (10 hoặc 13 số)", "error"); return; }
        if (!regAddress.trim()) { showToast("Vui lòng nhập địa chỉ nhà máy / kho hàng", "error"); return; }
        // Removed corporate email validation for easier testing
      }

      // 2 bước (Doanh nghiệp): xong bước 1 → sang bước 2 nộp giấy tờ, chưa tạo tài khoản
      if (isBusiness && regStep === 1) { setRegStep(2); return; }

      // Bước 2 — BẮT BUỘC nộp đủ giấy tờ trước khi tạo tài khoản
      if (isBusiness) {
        if (uploadingKyc['giayphep'] || uploadingKyc['cmnd']) { showToast("Đang tải giấy tờ, vui lòng đợi…", "error"); return; }
        if (!uploadedKycUrls['giayphep']) { showToast("Vui lòng tải lên Giấy phép Kinh doanh", "error"); return; }
        if (!uploadedKycUrls['cmnd']) { showToast("Vui lòng tải lên CMND/CCCD người đại diện", "error"); return; }
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
            role: regRole,
            password: regPassword,
            // Business fields
            company: regCompany,
            taxCode: regTaxCode,
            address: regAddress,
            hotline: regHotline,
            // KYC documents (optional, uploaded before registration)
            giayphep_url: uploadedKycUrls['giayphep'] || undefined,
            cmnd_url: uploadedKycUrls['cmnd'] || undefined,
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
    // Áp dụng cùng quy tắc mật khẩu strict như form đăng ký
    const pwdErr = validatePasswordStrict(newPassword);
    if (pwdErr) { showToast(pwdErr, "error"); return; }
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

  // Demo creds fetched from server (per-deploy random env, không hardcode)
  const [demoCredsMap, setDemoCredsMap] = useState<Record<string, { user: string; pass: string }>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/demo-creds', { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        const map: Record<string, { user: string; pass: string }> = {};
        for (const a of (data.demoAccounts || [])) {
          map[a.role] = { user: a.user, pass: a.pass };
        }
        setDemoCredsMap(map);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDemoLogin = (demoRole: string, demoUsername: string) => {
    const creds = demoCredsMap[demoRole];
    if (creds) {
      // Per-deploy random creds (an toàn — không hardcode trong source)
      setUsername(creds.user);
      setPassword(creds.pass);
    } else {
      // Fallback nếu /api/auth/demo-creds chưa load — chỉ điền email, user nhập pass
      setUsername(demoUsername);
      setPassword('');
    }
  };

  // Role label map
  const roleLabels: Record<string,string> = { admin: 'Quản trị viên', manufacturer: 'Doanh nghiệp', importer: 'Doanh nghiệp', consumer: 'Người tiêu dùng', authority: 'Cơ quan chức năng' };
  const roleIconsSvg: Record<string, React.ReactNode> = {
    consumer: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    manufacturer: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
        <path d="M3 21h18M5 21V7l8-4 8 4v14" />
      </svg>
    ),
    importer: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    admin: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="10" r="2.5" />
        <path d="M8 17a4 4 0 0 1 8 0" />
      </svg>
    )
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#eef5fb', display:'flex', flexDirection:'column', alignItems:'center', zIndex:100, overflowY:'auto' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={dismiss} />}

      {/* Background glow */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(31,111,235,0.12) 0%, transparent 60%)' }} />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:440, margin:'auto', padding:'32px 20px 40px' }}>

        {/* Top bar: back + brand (decorative role icon removed — no function) */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
          <button onClick={() => router.back()} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(13,27,46,0.08)', border:'1px solid rgba(13,27,46,0.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'#0d1b2e', cursor:'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>arrow_back_ios_new</span>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/verigoods-logo.png" alt="AI VeriGoods" width={116} height={38} style={{ objectFit: 'contain', display: 'block' }} />
          {/* spacer giữ layout cân — bằng width back button */}
          <div style={{ width:36, height:36 }} aria-hidden="true" />
        </div>

        {/* Hero */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px 5px 8px', background:'rgba(31,111,235,0.1)', border:'1px solid rgba(31,111,235,0.25)', borderRadius:100, marginBottom:14 }}>
            <span className="gold-pulse-dot" />
            <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'#1F6FEB' }}>{view === "register" ? (roleLabels[regRole] || regRole) : (roleLabels[pageRole] || pageRole)}</span>
          </div>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontWeight:400, fontSize:26, letterSpacing:'-0.02em', lineHeight:1.15, color:'#0d1b2e', marginBottom:6 }}>
            {view === 'login' ? <>{t('login_title')}</> : view === 'register' ? <>Tạo <em style={{ fontStyle:'italic', color:'#1F6FEB', fontWeight:300 }}>tài khoản</em></> : <>Quên <em style={{ fontStyle:'italic', color:'#1F6FEB', fontWeight:300 }}>mật khẩu</em></>}
          </h1>
          <p style={{ fontSize:12, color:'rgba(13,27,46,0.5)', lineHeight:1.5 }}>
            {view === 'login' ? t('login_enter_info') : view === 'register' ? t('reg_sub') : 'Khôi phục quyền truy cập tài khoản'}
          </p>
        </div>

        {/* ── Suspended Banner ── */}
        {kickReason === 'suspended' && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:14, marginBottom:16 }}>
            <span className="material-symbols-outlined" style={{ fontSize:20, color:'#f87171', flexShrink:0, marginTop:1 }}>lock</span>
            <div>
              <p style={{ fontWeight:700, fontSize:13, color:'#f87171', marginBottom:2 }}>Tài khoản đã bị khóa</p>
              <p style={{ fontSize:11, color:'rgba(248,113,113,0.8)', lineHeight:1.5 }}>
                Quản trị viên đã thu hồi quyền truy cập. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.
              </p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div style={{ background:'#ffffff', border:'1px solid rgba(31,111,235,0.15)', borderRadius:20, padding:'24px 20px', marginBottom:16, boxShadow:'0 10px 30px rgba(31,111,235,0.08)' }}>
          {view === "login" && (
            <div>
              <form onSubmit={handleAction} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'rgba(13,27,46,0.5)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>{t('login_email_phone')}</label>
                  <div style={{ position:'relative' }}>
                    <span className="material-symbols-outlined" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:20, color:'rgba(31,111,235,0.7)' }}>person</span>
                    <input required value={username} onChange={e => setUsername(e.target.value)} type="text"
                      style={{ width:'100%', padding:'12px 14px 12px 44px', background:'rgba(13,27,46,0.06)', border:'1px solid rgba(31,111,235,0.2)', borderRadius:12, fontSize:14, color:'#0d1b2e', outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }}
                      placeholder={t('login_ph_email')} />
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'rgba(13,27,46,0.5)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>{t('login_pass')}</label>
                  <div style={{ position:'relative' }}>
                    <span className="material-symbols-outlined" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:20, color:'rgba(31,111,235,0.7)' }}>lock</span>
                    <input required value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'}
                      style={{ width:'100%', padding:'12px 44px 12px 44px', background:'rgba(13,27,46,0.06)', border:'1px solid rgba(31,111,235,0.2)', borderRadius:12, fontSize:14, color:'#0d1b2e', outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }}
                      placeholder={t('login_ph_pass')} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(13,27,46,0.4)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:20 }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background:'#1F6FEB', color:'#ffffff', border:'none', borderRadius:14, fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading?0.7:1, marginTop:4 }}>
                  {loading ? <span style={{ width:20, height:20, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#ffffff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} /> : <>{t('login_btn_login')} <span className="material-symbols-outlined" style={{ fontSize:18 }}>arrow_forward</span></>}
                </button>
              </form>

              {/* ── VNeID Divider & Button ── */}
              <div style={{ position:'relative', margin:'20px 0 16px', textAlign:'center' }}>
                <span style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'rgba(13,27,46,0.1)' }} />
                <span style={{ position:'relative', zIndex:1, background:'#ffffff', padding:'0 12px', fontSize:10, color:'rgba(13,27,46,0.4)', letterSpacing:'0.14em', textTransform:'uppercase' }}>Hoặc</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  // TC-AUTH-009: VNeID chưa tích hợp xong (mock provider /_vneid chưa có) →
                  // báo "đang phát triển" thay vì redirect tới trang 404.
                  showToast('Đăng nhập VNeID đang được tích hợp. Vui lòng dùng email & mật khẩu.', 'info');
                }}
                style={{ width:'100%', padding:'13px 16px', background:'transparent', color:'#0d1b2e', border:'1px solid rgba(13,27,46,0.2)', borderRadius:14, fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,27,46,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* VNeID Logo SVG */}
                <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Red background shield/card */}
                  <rect width="48" height="48" rx="10" fill="#DA251D"/>
                  {/* Yellow star */}
                  <polygon points="24,8 27.5,18.5 38.5,18.5 29.5,25 33,35.5 24,29 15,35.5 18.5,25 9.5,18.5 20.5,18.5" fill="#FFCD00"/>
                </svg>
                <span>Đăng nhập bằng VNeID</span>
              </button>

              <div style={{ marginTop:16, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <button onClick={() => router.push('/forgot-password')} style={{ fontSize:12, color:'rgba(13,27,46,0.45)', background:'none', border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>
                  {t('login_forgot')}
                </button>
                {pageRole !== 'admin' && (
                  <div style={{ fontSize:12, color:'rgba(13,27,46,0.4)' }}>
                    {t('login_no_account')} <button onClick={() => setView('register')} style={{ color:'#1F6FEB', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontSize:12 }}>{t('login_register_now')}</button>
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
                {/* Chỉ báo bước (chỉ Doanh nghiệp) */}
                {isBusiness && (
                  <div className="flex items-center gap-1 mb-1">
                    {[{ n: 1, l: lang === "en" ? "Info" : "Thông tin" }, { n: 2, l: lang === "en" ? "Documents" : "Giấy tờ" }].map((s, i) => (
                      <div key={s.n} className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${regStep >= s.n ? "bg-[#1F6FEB] text-[#ffffff]" : "bg-white/10 text-slate-400"}`}>{s.n}</span>
                        <span className={`text-xs font-bold ${regStep >= s.n ? "text-white" : "text-slate-500"}`}>{s.l}</span>
                        {i === 0 && <span className="w-5 h-px bg-white/15 mx-1" />}
                      </div>
                    ))}
                  </div>
                )}
                {regStep === 1 && (<>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {t("reg_name")} <span className="ml-1 text-[10px] font-normal text-slate-500 normal-case">(tối đa 20 ký tự, chỉ chữ)</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1F6FEB] text-xl">person</span>
                    <input required type="text" value={regName}
                      onChange={(e) => setRegName(e.target.value.slice(0, 20))}
                      maxLength={20}
                      className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#1F6FEB]/50 focus:ring-1 focus:ring-[#1F6FEB]/50 transition-all placeholder:text-slate-600"
                      placeholder={t("reg_ph_name")} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1F6FEB] text-xl">mail</span>
                    <input required type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#1F6FEB]/50 focus:ring-1 focus:ring-[#1F6FEB]/50 transition-all placeholder:text-slate-600"
                      placeholder={t("reg_ph_email")} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t("reg_phone")}</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6FB585] text-xl">call</span>
                    <input required type="tel" value={regPhone} onChange={(e) => handlePhoneChange(e.target.value)}
                      maxLength={11}
                      className={`w-full bg-[#131b2c] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white ${
                        regPhoneError ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30" : "border-slate-700/50 focus:border-[#1F6FEB]/50 focus:ring-[#1F6FEB]/50"
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

                {/* ── Chọn loại tài khoản: Người tiêu dùng / Doanh nghiệp ── */}
                {pageRole !== "admin" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{lang === "en" ? "Account type" : "Loại tài khoản"}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "consumer",     icon: "person", label: lang === "en" ? "Consumer" : "Người tiêu dùng" },
                        { key: "manufacturer", icon: "domain", label: lang === "en" ? "Enterprise" : "Doanh nghiệp" },
                      ] as const).map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => { setRegRole(opt.key); setRegStep(1); }}
                          className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-bold transition ${
                            regRole === opt.key
                              ? "bg-[#1F6FEB]/15 border-[#1F6FEB]/50 text-white"
                              : "bg-[#131b2c] border-slate-700/50 text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[20px] ${regRole === opt.key ? "text-[#1F6FEB]" : ""}`}>{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                </>)}

                {/* ── Bước 1: Thông tin doanh nghiệp ── */}
                {isBusiness && regStep === 1 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <span className="material-symbols-outlined text-amber-400 text-[16px] shrink-0">business_center</span>
                      <p className="text-xs text-amber-300 font-medium">Vai trò doanh nghiệp yêu cầu thêm thông tin xác thực</p>
                    </div>

                    {/* Tên công ty */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Tên công ty / Doanh nghiệp <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1F6FEB] text-xl">apartment</span>
                        <input required={isBusiness} type="text" value={regCompany} onChange={e => setRegCompany(e.target.value)}
                          className={`w-full bg-[#131b2c] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white ${
                            !regCompany && isBusiness ? "border-amber-500/40" : "border-slate-700/50 focus:border-[#1F6FEB]/50 focus:ring-[#1F6FEB]/50"
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
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6FB585] text-xl">tag</span>
                        <input required={isBusiness} type="text" value={regTaxCode} onChange={e => setRegTaxCode(e.target.value.replace(/[^0-9-]/g,""))}
                          maxLength={14}
                          className={`w-full bg-[#131b2c] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white font-mono ${
                            regTaxCode && !/^\d{10}(\d{3})?$/.test(regTaxCode.replace(/-/g,"")) ? "border-red-500/60 focus:ring-red-500/30" : !regTaxCode && isBusiness ? "border-amber-500/40" : "border-slate-700/50 focus:border-[#1F6FEB]/50 focus:ring-[#1F6FEB]/50"
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
                        <span className="material-symbols-outlined absolute left-4 top-3.5 text-[#1F6FEB] text-xl">location_on</span>
                        <textarea required={isBusiness} value={regAddress} onChange={e => setRegAddress(e.target.value)}
                          rows={2}
                          className={`w-full bg-[#131b2c] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white resize-none ${
                            !regAddress && isBusiness ? "border-amber-500/40" : "border-slate-700/50 focus:border-[#1F6FEB]/50 focus:ring-[#1F6FEB]/50"
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
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1F6FEB] text-xl">support_agent</span>
                        <input type="tel" value={regHotline} onChange={e => setRegHotline(e.target.value)}
                          className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#1F6FEB]/50 focus:ring-1 focus:ring-[#1F6FEB]/50 transition-all placeholder:text-slate-600"
                          placeholder="VD: 1800 xxxx" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Bước 2: Cung cấp giấy tờ (chỉ Doanh nghiệp) ── */}
                {isBusiness && regStep === 2 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* ── KYC Document Upload Section ── */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3">
                        <span className="material-symbols-outlined text-amber-400 text-[16px] shrink-0">priority_high</span>
                        <p className="text-xs text-amber-300 font-medium">Bắt buộc nộp đủ cả 2 giấy tờ pháp lý (BR-01) để hoàn tất đăng ký</p>
                      </div>

                      {/* Giấy phép Kinh doanh */}
                      <div className="mb-3">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Giấy phép Kinh doanh <span className="text-red-400">*</span> <span className="text-slate-500 text-[10px] font-normal normal-case">(PDF, JPG, PNG · max 10MB)</span>
                        </label>
                        <label className={`flex items-center gap-3 w-full bg-[#131b2c] border rounded-xl py-3 px-4 cursor-pointer transition-all
                          ${uploadedKycUrls['giayphep'] ? 'border-[#4A7C5C]/40 bg-[#4A7C5C]/5' : 'border-slate-700/50 hover:border-[#1F6FEB]/40'}`}>
                          <span className={`material-symbols-outlined text-xl ${uploadedKycUrls['giayphep'] ? 'text-[#6FB585]' : 'text-amber-400'}`}>description</span>
                          <span className="text-sm flex-1 truncate text-slate-300">
                            {uploadingKyc['giayphep'] ? 'Đang tải lên...' : uploadedKycUrls['giayphep'] ? `✓ ${regGiayphep?.name}` : 'Chọn hoặc kéo thả file vào đây'}
                          </span>
                          {uploadingKyc['giayphep'] && <span className="w-4 h-4 border-2 border-[#1F6FEB] border-t-transparent rounded-full animate-spin shrink-0" />}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              e.target.value = '';
                              setRegGiayphep(f);
                              setUploadingKyc(p => ({ ...p, giayphep: true }));
                              const fd = new FormData();
                              fd.append('file', f);
                              fd.append('type', 'kyc');
                              fd.append('kycField', '__pending__'); // will be linked after registration
                              try {
                                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                const d = await res.json();
                                if (res.ok) setUploadedKycUrls(p => ({ ...p, giayphep: d.url }));
                                else showToast('❌ ' + d.error, 'error');
                              } catch { showToast('❌ Lỗi upload', 'error'); }
                              setUploadingKyc(p => ({ ...p, giayphep: false }));
                            }}
                          />
                        </label>
                      </div>

                      {/* CMND / CCCD */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          CMND / CCCD Người đại diện <span className="text-red-400">*</span> <span className="text-slate-500 text-[10px] font-normal normal-case">(PDF, JPG, PNG · max 10MB)</span>
                        </label>
                        <label className={`flex items-center gap-3 w-full bg-[#131b2c] border rounded-xl py-3 px-4 cursor-pointer transition-all
                          ${uploadedKycUrls['cmnd'] ? 'border-[#4A7C5C]/40 bg-[#4A7C5C]/5' : 'border-slate-700/50 hover:border-[#1F6FEB]/40'}`}>
                          <span className={`material-symbols-outlined text-xl ${uploadedKycUrls['cmnd'] ? 'text-[#6FB585]' : 'text-amber-400'}`}>badge</span>
                          <span className="text-sm flex-1 truncate text-slate-300">
                            {uploadingKyc['cmnd'] ? 'Đang tải lên...' : uploadedKycUrls['cmnd'] ? `✓ ${regCmnd?.name}` : 'Chọn hoặc kéo thả file vào đây'}
                          </span>
                          {uploadingKyc['cmnd'] && <span className="w-4 h-4 border-2 border-[#1F6FEB] border-t-transparent rounded-full animate-spin shrink-0" />}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              e.target.value = '';
                              setRegCmnd(f);
                              setUploadingKyc(p => ({ ...p, cmnd: true }));
                              const fd = new FormData();
                              fd.append('file', f);
                              fd.append('type', 'kyc');
                              fd.append('kycField', '__pending__');
                              try {
                                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                const d = await res.json();
                                if (res.ok) setUploadedKycUrls(p => ({ ...p, cmnd: d.url }));
                                else showToast('❌ ' + d.error, 'error');
                              } catch { showToast('❌ Lỗi upload', 'error'); }
                              setUploadingKyc(p => ({ ...p, cmnd: false }));
                            }}
                          />
                        </label>
                      </div>
                    </div>

                  </div>
                )}

                {regStep === 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Mật khẩu <span className="text-red-400">*</span>
                    <span className="ml-2 text-[10px] font-normal text-slate-500 normal-case">(12–20 ký tự · hoa + thường + số + ký tự đặc biệt)</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1F6FEB] text-xl">lock</span>
                    <input required type={showPassword ? "text" : "password"} value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value.slice(0, 20))}
                      maxLength={20} minLength={12}
                      className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-[#1F6FEB]/50 focus:ring-1 focus:ring-[#1F6FEB]/50 transition-all placeholder:text-slate-600"
                      placeholder="VD: Abc@12345678" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                  {/* NFR-SC-07: Password Strength Meter — synced với server: ≥12, ≤20 */}
                  {regPassword.length > 0 && (() => {
                    const checks = [
                      regPassword.length >= 12 && regPassword.length <= 20, // Rule 1: 12–20 ký tự (NFR-SC-07)
                      /[A-Z]/.test(regPassword),                            // Rule 2: chữ HOA
                      /[a-z]/.test(regPassword),                            // Rule 3: chữ thường
                      /\d/.test(regPassword),                               // Rule 4: chữ số
                      /[^A-Za-z0-9]/.test(regPassword),                    // Rule 5: ký tự đặc biệt
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
                          <span className={`text-[10px] font-bold ${textColors[score-1] || 'text-slate-500'}`}>
                            {score > 0 ? labels[score-1] : ''}
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            {[['12-20', checks[0]], ['HOA', checks[1]], ['thường', checks[2]], ['số', checks[3]], ['!@#', checks[4]]].map(([l, ok], i) => (
                              <span key={i} className={`text-[9px] px-1 py-0.5 rounded font-bold ${ok ? 'bg-[#4A7C5C]/20 text-[#6FB585]' : 'bg-white/5 text-slate-600'}`}>{l as string}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                )}

                {/* Footer — điều hướng 2 bước */}
                <div className="flex gap-2 mt-6">
                  {isBusiness && regStep === 2 && (
                    <button type="button" onClick={() => setRegStep(1)}
                      className="px-4 py-3.5 rounded-xl border border-white/15 text-slate-300 font-bold hover:bg-white/5 transition flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-xl">arrow_back</span>
                      {lang === "en" ? "Back" : "Quay lại"}
                    </button>
                  )}
                  <button type="submit" disabled={loading || !!regPhoneError}
                    style={{ background: '#1F6FEB' }}
                    className="flex-1 text-[#ffffff] font-bold py-3.5 rounded-xl shadow-lg shadow-[#1F6FEB]/20 transition-all flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105">
                    {loading ? (
                      <span className="animate-spin w-5 h-5 border-2 border-[#ffffff]/30 border-t-[#ffffff] rounded-full"></span>
                    ) : isBusiness && regStep === 1 ? (
                      <>{lang === "en" ? "Continue" : "Tiếp tục"} <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span></>
                    ) : (
                      <>{t("reg_btn")} <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">person_add</span></>
                    )}
                  </button>
                </div>
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
                    ${otpStep >= 1 ? "bg-[#1F6FEB] text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
                    {otpStep > 1 ? <span className="material-symbols-outlined text-[15px]">check</span> : "1"}
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${otpStep >= 1 ? "text-[#1F6FEB]" : "text-slate-600"}`}>Email</span>
                </div>
                {/* Line 1→2 */}
                <div className={`flex-1 h-0.5 mx-2 mb-3 rounded-full transition-all duration-500 ${otpStep > 1 ? "bg-[#1F6FEB]" : "bg-white/10"}`} />
                {/* Bước 2 */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${otpStep >= 2 ? "bg-[#1F6FEB] text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
                    {otpStep > 2 ? <span className="material-symbols-outlined text-[15px]">check</span> : "2"}
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${otpStep >= 2 ? "text-[#1F6FEB]" : "text-slate-600"}`}>OTP</span>
                </div>
                {/* Line 2→3 */}
                <div className={`flex-1 h-0.5 mx-2 mb-3 rounded-full transition-all duration-500 ${otpStep > 2 ? "bg-[#1F6FEB]" : "bg-white/10"}`} />
                {/* Bước 3 */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${otpStep >= 3 ? "bg-[#1F6FEB] text-white shadow-[0_0_12px_rgba(60,218,218,0.35)]" : "bg-white/10 text-slate-500"}`}>
                    {otpStep > 3 ? <span className="material-symbols-outlined text-[15px]">check</span> : "3"}
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${otpStep >= 3 ? "text-[#1F6FEB]" : "text-slate-600"}`}>Mật khẩu</span>
                </div>
              </div>

              {/* ── Bước 1: Nhập email ── */}
              {otpStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Địa chỉ Email</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1F6FEB] text-xl">contact_mail</span>
                      <input
                        type="email" value={otpEmail}
                        onChange={e => setOtpEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendOtp()}
                        className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-[#1F6FEB]/50 focus:ring-1 focus:ring-[#1F6FEB]/50 transition-all placeholder:text-slate-600"
                        placeholder="example@gmail.com"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-[#1F6FEB]/10 border border-[#1F6FEB]/20 rounded-xl">
                    <span className="material-symbols-outlined text-[#1F6FEB] text-[18px] shrink-0">mail</span>
                    <p className="text-xs text-slate-300">Mã OTP 6 chữ số sẽ được gửi qua <strong className="text-white">Gmail</strong>. Kiểm tra cả thư mục Spam nếu không thấy.</p>
                  </div>
                  <button onClick={sendOtp} disabled={loading}
                    style={{ background: '#1F6FEB' }}
                    className="w-full text-[#ffffff] font-bold py-3.5 rounded-xl shadow-lg shadow-[#1F6FEB]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 hover:brightness-105">
                    {loading
                      ? <span className="animate-spin w-5 h-5 border-2 border-[#ffffff]/30 border-t-[#ffffff] rounded-full" />
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
                            ${digit ? "border-[#1F6FEB] bg-[#1F6FEB]/10 text-cyan-300" : "border-slate-700/50 bg-[#131b2c] text-white"}
                            focus:border-[#1F6FEB] focus:ring-2 focus:ring-[#1F6FEB]/30`}
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
                        <span className="font-bold text-[#1F6FEB]">
                          {Math.floor(otpCountdown / 60).toString().padStart(2, "0")}:{(otpCountdown % 60).toString().padStart(2, "0")}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-red-400 font-medium">Mã đã hết hạn</p>
                    )}
                  </div>

                  <button onClick={verifyOtp} disabled={loading || otpCode.join("").length < 6}
                    style={{ background: '#1F6FEB' }}
                    className="w-full text-[#ffffff] font-bold py-3.5 rounded-xl shadow-lg shadow-[#1F6FEB]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 hover:brightness-105">
                    {loading
                      ? <span className="animate-spin w-5 h-5 border-2 border-[#ffffff]/30 border-t-[#ffffff] rounded-full" />
                      : <><span className="material-symbols-outlined text-xl">verified</span> Xác nhận OTP</>
                    }
                  </button>

                  {/* Gửi lại */}
                  <div className="text-center">
                    <button
                      onClick={() => { setOtpStep(1); setOtpCode(["","","","","",""]); }}
                      className="text-sm text-slate-500 hover:text-[#1F6FEB] transition-colors">
                      Không nhận được mã? <span className="underline font-medium">Gửi lại</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Bước 3: Đặt mật khẩu mới ── */}
              {otpStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-[#4A7C5C]/10 border border-[#4A7C5C]/20 rounded-xl mb-2">
                    <span className="material-symbols-outlined text-[#6FB585] text-[20px] shrink-0">verified_user</span>
                    <p className="text-xs text-emerald-300 font-medium">Xác thực thành công! Tạo mật khẩu mới cho tài khoản.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Mật khẩu mới <span className="ml-1 text-[10px] font-normal text-slate-500 normal-case">(8–20 ký tự · hoa + thường + số + ký tự đặc biệt)</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1F6FEB] text-xl">lock</span>
                      <input type={showPassword ? "text" : "password"} value={newPassword}
                        onChange={e => setNewPassword(e.target.value.slice(0, 20))}
                        minLength={8} maxLength={20}
                        className="w-full bg-[#131b2c] border border-slate-700/50 text-white rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-[#1F6FEB]/50 focus:ring-1 focus:ring-[#1F6FEB]/50 transition-all placeholder:text-slate-600"
                        placeholder="VD: Abc@1234" autoFocus />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1F6FEB] text-xl">lock_reset</span>
                      <input type={showPassword ? "text" : "password"} value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={`w-full bg-[#131b2c] border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 text-white
                          ${confirmPassword && confirmPassword !== newPassword ? "border-red-500/60 focus:ring-red-500/30" : "border-slate-700/50 focus:border-[#1F6FEB]/50 focus:ring-[#1F6FEB]/50"}`}
                        placeholder="Nhập lại mật khẩu" />
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">error</span> Mật khẩu không khớp
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={resetPassword} disabled={loading || !newPassword || !confirmPassword}
                    style={{ background: '#1F6FEB' }}
                    className="w-full text-[#ffffff] font-bold py-3.5 rounded-xl shadow-lg shadow-[#1F6FEB]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-2 hover:brightness-105">
                    {loading
                      ? <span className="animate-spin w-5 h-5 border-2 border-[#ffffff]/30 border-t-[#ffffff] rounded-full" />
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
              <div style={{ flex:1, height:1, background:'rgba(31,111,235,0.15)' }} />
              <span style={{ fontSize:10, fontWeight:600, color:'rgba(13,27,46,0.35)', letterSpacing:'0.15em', textTransform:'uppercase' }}>{t('demo_label')}</span>
              <div style={{ flex:1, height:1, background:'rgba(31,111,235,0.15)' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { role:'manufacturer', user:'nsx@vntrust.vn', label:t('demo_mfr'), color:'#1F6FEB' },
                { role:'consumer', user:'nguoitieudung@vntrust.vn', label:t('demo_con'), color:'#52c2c2' },
                { role:'admin', user:'admin@vntrust.vn', label:t('demo_admin'), color:'#C8893A' },
              ].map(d => (
                <button key={d.role} onClick={() => handleDemoLogin(d.role, d.user)} style={{ background:'rgba(13,27,46,0.04)', border:'1px solid rgba(31,111,235,0.12)', borderRadius:12, padding:'12px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer', transition:'all 0.2s' }}>
                  <div style={{ width: 22, height: 22, color: d.color }}>
                    {roleIconsSvg[d.role]}
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color:'#0d1b2e', fontFamily:'Outfit,sans-serif' }}>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
