"use client";
// UC03 — Trang NV chấp nhận lời mời + tạo tài khoản
// Truy cập qua link: /team/accept-invite?token=...
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface InvitePreview {
  email: string;
  vaiTroCty: string;
  doanhNghiep: { ten: string; loai: string; maSoThue: string };
  ngayHetHan: string;
}

const SUBROLE_LABEL: Record<string, string> = {
  company_admin: "Quản trị DN",
  staff_input:   "Nhân viên nhập liệu",
  warehouse:     "Nhân viên kho",
  viewer:        "Chỉ xem",
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ten, setTen] = useState("");
  const [soDienThoai, setSDT] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("Thiếu token mời"); setLoading(false); return; }
    (async () => {
      try {
        const r = await fetch(`/api/team/accept-invite?token=${encodeURIComponent(token)}`);
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Token không hợp lệ");
        setPreview(json);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const submit = async () => {
    if (password.length < 8) { setError("Mật khẩu tối thiểu 8 ký tự"); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ten, soDienThoai, password }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Tạo tài khoản thất bại");
      setDone(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1623] text-[#F6F1E8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 border border-[#C8A557]/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl border border-[#C8A557] text-[#C8A557] flex items-center justify-center">
            <span className="material-symbols-outlined">shield</span>
          </div>
          <span className="font-display text-xl font-bold">VN<span className="text-[#C8A557]">Trust</span></span>
        </div>

        {loading && <p className="text-center text-slate-400 py-8">Đang xác thực lời mời…</p>}

        {!loading && error && (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-5xl text-red-400 mb-3">block</span>
            <p className="text-lg font-bold text-red-300 mb-2">Lời mời không hợp lệ</p>
            <p className="text-sm text-slate-400 mb-4">{error}</p>
            <Link href="/login" className="inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10">
              Về trang đăng nhập
            </Link>
          </div>
        )}

        {!loading && preview && !done && (
          <>
            <h1 className="text-xl font-bold text-white mb-1">Bạn được mời gia nhập</h1>
            <div className="mb-5 p-4 bg-[#C8A557]/10 border border-[#C8A557]/30 rounded-xl">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Doanh nghiệp</p>
              <p className="text-base font-bold text-white">{preview.doanhNghiep.ten}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">MST: {preview.doanhNghiep.maSoThue} · Loại: {preview.doanhNghiep.loai}</p>
              <div className="mt-3 pt-3 border-t border-[#C8A557]/20 flex justify-between text-xs">
                <span className="text-slate-400">Email: <span className="text-white font-medium">{preview.email}</span></span>
                <span className="text-slate-400">Vai trò: <span className="text-[#C8A557] font-bold">{SUBROLE_LABEL[preview.vaiTroCty] || preview.vaiTroCty}</span></span>
              </div>
            </div>

            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Họ tên</label>
            <input
              type="text" value={ten} onChange={(e) => setTen(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full mt-1 mb-3 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50"
            />
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số điện thoại (tùy chọn)</label>
            <input
              type="tel" value={soDienThoai} onChange={(e) => setSDT(e.target.value)}
              placeholder="09xxxxxxxx"
              className="w-full mt-1 mb-3 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50"
            />
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mật khẩu *</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              className="w-full mt-1 mb-4 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50"
            />

            {error && <p className="text-xs text-red-300 mb-3">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] font-bold disabled:opacity-50"
            >
              {submitting ? "Đang tạo…" : "Tạo tài khoản & gia nhập"}
            </button>
          </>
        )}

        {done && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-6xl text-emerald-300 mb-3">check_circle</span>
            <p className="text-xl font-bold text-emerald-300 mb-2">Thành công!</p>
            <p className="text-sm text-slate-400">Đang chuyển sang trang đăng nhập…</p>
          </div>
        )}
      </div>
    </div>
  );
}
