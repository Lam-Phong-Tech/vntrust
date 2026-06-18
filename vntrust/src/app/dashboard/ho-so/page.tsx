"use client";
// Hồ sơ doanh nghiệp — trang tổng hợp xem thông tin DN + thống kê + chứng nhận + giấy phép.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface Profile {
  company: any;
  stats: { products: number; batches: number; certs: number; licenses: number };
  certs: Array<{ id: string; loai: string; soChungNhan: string; ngayCap?: string | null; ngayHetHan?: string | null; toChucCap?: string | null; trangThaiDuyet: string; hinhAnhUrl?: string | null }>;
  licenses: Array<{ id: string; tenGiayPhep: string; soGiayPhep: string; coQuanCap?: string | null; ngayCap?: string | null; ngayHetHan?: string | null; phamVi?: string | null; fileUrl?: string | null }>;
}

const STATUS = {
  verified: { label: "Đã xác thực", cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", icon: "verified_user" },
  pending: { label: "Chờ duyệt", cls: "text-amber-300 bg-amber-500/15 border-amber-500/30", icon: "schedule" },
  suspended: { label: "Bị khóa", cls: "text-red-300 bg-red-500/15 border-red-500/30", icon: "gpp_bad" },
  revoked: { label: "Thu hồi", cls: "text-red-300 bg-red-500/15 border-red-500/30", icon: "block" },
} as const;

const d = (s?: string | null) => (s ? new Date(s).toLocaleDateString("vi-VN") : "—");

export default function HoSoPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const r = localStorage.getItem("userRole");
    if (!r) { router.replace("/login"); return; }
    setUserRole(r);
    (async () => {
      try {
        const res = await fetch("/api/ho-so-doanh-nghiep", { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) { setErr(j.error || "Không tải được hồ sơ"); return; }
        setData(j);
      } catch { setErr("Lỗi kết nối"); }
      finally { setLoading(false); }
    })();
  }, [router]);

  if (!userRole) return null;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="w-10 h-10 border-2 border-[#C8A557] border-t-transparent rounded-full animate-spin" /></div>;

  if (err || !data) return (
    <div className="min-h-screen w-full p-8 max-w-3xl mx-auto text-center">
      <span className="material-symbols-outlined text-5xl text-slate-500 block mb-3">business_center</span>
      <p className="text-slate-400">{err || tr("Không có hồ sơ", "No profile")}</p>
      <Link href="/dashboard" className="inline-block mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">{tr("Quay lại", "Back")}</Link>
    </div>
  );

  const co = data.company;
  const st = (STATUS as any)[co.trangThai] || STATUS.pending;
  const initials = (co.ten || "DN").trim().split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  const STAT = [
    { label: tr("Sản phẩm", "Products"), value: data.stats.products, icon: "inventory_2", href: "/dashboard/inventory" },
    { label: tr("Lô hàng", "Batches"), value: data.stats.batches, icon: "qr_code_2", href: "/dashboard/inventory" },
    { label: tr("Chứng nhận", "Certificates"), value: data.stats.certs, icon: "workspace_premium", href: "/dashboard/certificates" },
    { label: tr("Giấy phép LH", "Licenses"), value: data.stats.licenses, icon: "verified", href: "/dashboard/kyc" },
  ];

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 pb-[100px] md:pb-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">{tr("Hồ sơ doanh nghiệp", "Business profile")}</p>
        <div className="flex gap-2 text-xs">
          <Link href="/dashboard" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">arrow_back</span>{tr("Quay lại", "Back")}</Link>
          <Link href="/dashboard/kyc" className="px-4 py-2 rounded-xl bg-[#C8A557] text-[#0B1623] font-bold hover:brightness-110 transition flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">edit</span>{tr("Cập nhật / Xác minh", "Update / Verify")}</Link>
        </div>
      </div>

      {/* Header card */}
      <div className="glass-panel border border-white/10 rounded-3xl p-6 mb-5 flex flex-col sm:flex-row items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C8A557] to-[#A6873E] text-[#0B1623] flex items-center justify-center font-black text-2xl shrink-0">{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-white font-display">{co.ten}</h1>
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.cls}`}><span className="material-symbols-outlined text-[13px]">{st.icon}</span>{st.label}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1 font-mono">MST: {co.maSoThue}</p>
          <p className="text-xs text-slate-500 mt-0.5">{co.loai === "NSX" ? tr("Nhà sản xuất", "Manufacturer") : tr("Nhà phân phối / nhập khẩu", "Distributor")} · {tr("Đăng ký", "Since")} {d(co.ngayDangKy)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STAT.map((s, i) => (
          <Link key={i} href={s.href} className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 hover:bg-white/[0.07] transition">
            <span className="material-symbols-outlined text-[22px] text-[#C8A557]">{s.icon}</span>
            <p className="text-2xl font-black text-white mt-1">{s.value}</p>
            <p className="text-[11px] text-slate-400">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Thông tin liên hệ */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[#C8A557] text-[18px]">contact_page</span>{tr("Thông tin liên hệ", "Contact info")}</h2>
          <div className="space-y-2.5 text-sm">
            {[
              { ic: "location_on", l: tr("Địa chỉ", "Address"), v: co.diaChi },
              { ic: "person", l: tr("Người đại diện", "Representative"), v: co.nguoiDaiDien },
              { ic: "call", l: "Hotline", v: co.hotline },
              { ic: "mail", l: "Email", v: co.email },
              { ic: "category", l: tr("Ngành (VSIC)", "Industry"), v: co.nganh_VSIC },
              { ic: "language", l: "Website", v: co.website },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-slate-500 text-[16px] mt-0.5">{r.ic}</span>
                <div className="min-w-0"><p className="text-[10px] text-slate-500 uppercase tracking-wider">{r.l}</p><p className="text-white break-words">{r.v || "—"}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Giấy tờ pháp lý */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[#C8A557] text-[18px]">folder_open</span>{tr("Giấy tờ pháp lý", "Legal documents")}</h2>
          <div className="space-y-2 text-sm">
            {[
              { l: tr("Giấy phép kinh doanh", "Business license"), url: co.giayphep_url },
              { l: "CMND/CCCD người đại diện", url: co.cmnd_url },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className={`material-symbols-outlined text-[18px] ${r.url ? "text-[#6FB585]" : "text-slate-500"}`}>{r.url ? "check_circle" : "remove"}</span>
                <span className="flex-1 text-slate-200">{r.l}</span>
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-cyan-400 text-xs underline">{tr("Xem", "View")}</a> : <span className="text-slate-500 text-xs">{tr("Chưa nộp", "Missing")}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chứng nhận */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 mt-5">
        <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[#C8A557] text-[18px]">workspace_premium</span>{tr("Chứng nhận", "Certificates")} ({data.certs.length})</h2>
        {data.certs.length === 0 ? <p className="text-slate-500 text-sm">{tr("Chưa có chứng nhận.", "No certificates.")}</p> : (
          <div className="space-y-2">
            {data.certs.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C8A557]/15 text-[#C8A557] border border-[#C8A557]/30 shrink-0">{c.loai}</span>
                <div className="flex-1 min-w-0"><p className="text-white text-sm truncate">{c.soChungNhan}</p><p className="text-[11px] text-slate-500">{c.toChucCap || "—"} · HSD {d(c.ngayHetHan)}</p></div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${c.trangThaiDuyet === "approved" ? "text-emerald-300 bg-emerald-500/15" : "text-amber-300 bg-amber-500/15"}`}>{c.trangThaiDuyet === "approved" ? tr("Đã duyệt", "Approved") : tr("Chờ duyệt", "Pending")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Giấy phép lưu hành */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 mt-5">
        <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[#C8A557] text-[18px]">verified</span>{tr("Giấy phép lưu hành", "Circulation licenses")} ({data.licenses.length})</h2>
        {data.licenses.length === 0 ? <p className="text-slate-500 text-sm">{tr("Chưa có giấy phép lưu hành. Thêm ở trang Xác minh DN.", "None yet. Add in the Verify page.")}</p> : (
          <div className="space-y-2">
            {data.licenses.map(l => {
              const exp = l.ngayHetHan && new Date(l.ngayHetHan) < new Date();
              return (
                <div key={l.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="material-symbols-outlined text-[#C8A557] text-[18px] mt-0.5 shrink-0">workspace_premium</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{l.tenGiayPhep}</p>
                    <p className="text-[11px] text-slate-400 truncate">Số: <span className="font-mono">{l.soGiayPhep}</span>{l.coQuanCap ? ` · ${l.coQuanCap}` : ""}{l.phamVi ? ` · ${l.phamVi}` : ""}</p>
                    <p className="text-[10px] text-slate-500">Cấp {d(l.ngayCap)} · HSD {d(l.ngayHetHan)} {exp && <span className="text-red-400 font-bold">(Hết hạn)</span>} {l.fileUrl && <a href={l.fileUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline ml-1">Xem ảnh</a>}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
