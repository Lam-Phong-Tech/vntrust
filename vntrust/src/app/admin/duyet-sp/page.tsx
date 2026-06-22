"use client";
// #23: Trang admin Duyệt Sản phẩm & Lô hàng — phê duyệt/từ chối CHỨNG NHẬN (gate SP/lô
// đi vào hoạt động + verify). Dùng API /api/certificates sẵn có (GET + PATCH admin-only).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Toast } from "@/components/Toast";

interface Cert {
  id: string;
  loai: string;
  soChungNhan: string;
  ngayCap: string;
  ngayHetHan: string;
  toChucCap?: string | null;
  hinhAnhUrl?: string | null;
  trangThaiDuyet: string;
  ghiChuAdmin?: string | null;
  sanPham?: { ten: string; maSKU: string; doanhNghiep?: { ten: string } | null } | null;
  loHang?: { maLo: string } | null;
}

const FILTERS: Array<{ key: "pending" | "approved" | "rejected" | "all"; vi: string; en: string }> = [
  { key: "pending", vi: "Chờ duyệt", en: "Pending" },
  { key: "approved", vi: "Đã duyệt", en: "Approved" },
  { key: "rejected", vi: "Từ chối", en: "Rejected" },
  { key: "all", vi: "Tất cả", en: "All" },
];

export default function DuyetSpPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const fetchCerts = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/certificates?status=${filter}`, { cache: "no-store" });
      const d = await r.json();
      setCerts(Array.isArray(d.certs) ? d.certs : []);
    } catch { setCerts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") { router.replace("/dashboard"); return; }
    fetchCerts();
  }, [filter]);

  const act = async (id: string, action: "approve" | "reject", ghiChuAdmin?: string) => {
    setBusy(id);
    try {
      const r = await fetch("/api/certificates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ghiChuAdmin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lỗi");
      showToast(action === "approve" ? tr("✓ Đã phê duyệt", "✓ Approved") : tr("✓ Đã từ chối", "✓ Rejected"), true);
      fetchCerts();
    } catch (e: any) { showToast("✗ " + e.message, false); }
    finally { setBusy(null); }
  };

  const handleReject = (c: Cert) => {
    const note = window.prompt(
      tr(`Lý do từ chối chứng nhận ${c.soChungNhan}:`, `Reason to reject ${c.soChungNhan}:`), "");
    if (note === null) return;
    act(c.id, "reject", note.trim() || "Không đạt yêu cầu");
  };

  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
  const badge = (st: string) =>
    st === "approved" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : st === "rejected" ? "bg-red-500/20 text-red-400 border-red-500/30"
        : "bg-amber-500/20 text-amber-300 border-amber-500/30";

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-white font-headline">{tr("Duyệt Sản phẩm & Lô hàng", "Approve Products & Batches")}</h1>
        <p className="text-sm text-slate-400 mt-1">
          {tr("Phê duyệt / từ chối chứng nhận của sản phẩm & lô hàng. Chỉ chứng nhận đã duyệt mới giúp sản phẩm xác thực được (genuine).",
            "Approve / reject product & batch certificates. Only approved certificates make products verifiable.")}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${filter === f.key ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"}`}>
            {tr(f.vi, f.en)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <span className="material-symbols-outlined text-5xl mb-3 block">fact_check</span>
          {tr("Không có chứng nhận nào", "No certificates")}
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map(c => (
            <div key={c.id} className="glass-panel border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row gap-4">
              {/* Ảnh chứng nhận */}
              <div className="w-full sm:w-32 h-32 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                {c.hinhAnhUrl
                  ? (c.hinhAnhUrl.endsWith(".pdf")
                    ? <a href={c.hinhAnhUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center text-red-400">
                        <span className="material-symbols-outlined text-[34px]">picture_as_pdf</span>
                        <span className="text-[10px]">{tr("Xem PDF", "View PDF")}</span>
                      </a>
                    : <a href={c.hinhAnhUrl} target="_blank" rel="noreferrer" className="block w-full h-full">
                        <img src={c.hinhAnhUrl} alt={c.soChungNhan} className="w-full h-full object-cover" />
                      </a>)
                  : <span className="material-symbols-outlined text-slate-500 text-[34px]">image_not_supported</span>}
              </div>

              {/* Thông tin */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-full text-[10px] font-bold">{c.loai}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge(c.trangThaiDuyet)}`}>
                    {c.trangThaiDuyet === "approved" ? tr("Đã duyệt", "Approved") : c.trangThaiDuyet === "rejected" ? tr("Từ chối", "Rejected") : tr("Chờ duyệt", "Pending")}
                  </span>
                </div>
                <p className="font-bold text-white text-sm">{tr("Chứng nhận", "Certificate")}: <span className="font-mono">{c.soChungNhan}</span></p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {c.sanPham ? <>{tr("Sản phẩm", "Product")}: <b className="text-slate-300">{c.sanPham.ten}</b> ({c.sanPham.maSKU})</>
                    : c.loHang ? <>{tr("Lô hàng", "Batch")}: <b className="text-slate-300">{c.loHang.maLo}</b></>
                    : tr("Không gắn SP/lô", "No product/batch")}
                </p>
                {c.sanPham?.doanhNghiep?.ten && <p className="text-xs text-slate-500 mt-0.5">{tr("Doanh nghiệp", "Enterprise")}: {c.sanPham.doanhNghiep.ten}</p>}
                <p className="text-[11px] text-slate-500 mt-1">{tr("Cấp", "Issued")}: {fmt(c.ngayCap)} · {tr("HSD", "Exp")}: {fmt(c.ngayHetHan)}{c.toChucCap ? ` · ${c.toChucCap}` : ""}</p>
                {c.ghiChuAdmin && <p className="text-[11px] text-red-400 mt-1">{tr("Ghi chú admin", "Admin note")}: {c.ghiChuAdmin}</p>}
              </div>

              {/* Hành động */}
              {c.trangThaiDuyet !== "approved" && (
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button onClick={() => act(c.id, "approve")} disabled={busy === c.id}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>{tr("Duyệt", "Approve")}
                  </button>
                  {c.trangThaiDuyet !== "rejected" && (
                    <button onClick={() => handleReject(c)} disabled={busy === c.id}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/25 rounded-xl text-xs font-bold hover:bg-red-500/25 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">block</span>{tr("Từ chối", "Reject")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
