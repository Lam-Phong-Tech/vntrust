"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface DonChuyenHang {
  id: string;
  trangThai: string;
  ghiChu?: string;
  hinhAnhUrls?: string;
  adminNote?: string;
  nsdDoanhNghiepId?: string | null;
  thoiGian: string;
  loHang: {
    id: string;
    maLo: string;
    soLuong: number;
    sanPham: { ten: string; maSKU: string; doanhNghiep: { ten: string } };
  };
}

interface NhaPhaPhoiItem { id: string; tenDoanhNghiep: string; maSoThue: string; }

interface LoHang {
  id: string;
  maLo: string;
  ngaySanXuat: string;
  hanDung: string;
  soLuong: number;
  trangThai: string;
  sanPham: {
    ten: string;
    maSKU: string;
    doanhNghiep: { ten: string };
  };
  _count: { uids: number };
}

const TRANG_THAI_KEYS: Record<string, { labelKey: string; icon: string; cls: string }> = {
  active:              { labelKey: "dist_ready",        icon: "inventory",        cls: "text-blue-300 bg-[#C8A557]/15 border-[#C8A557]/30" },
  distributed:         { labelKey: "dist_shipped",      icon: "local_shipping",   cls: "text-emerald-300 bg-[#4A7C5C]/15 border-[#4A7C5C]/30" },
  suspended:           { labelKey: "dist_locked",       icon: "lock",             cls: "text-red-400 bg-red-500/15 border-red-500/30" },
  pending_review:      { labelKey: "dist_pending_admin",icon: "hourglass_top",    cls: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30" },
  pending_distributor: { labelKey: "dist_pending_dist", icon: "pending",          cls: "text-purple-300 bg-[#C8A557]/15 border-[#C8A557]/30" },
  ready:               { labelKey: "dist_received",     icon: "check_circle",     cls: "text-cyan-300 bg-[#C8A557]/15 border-[#C8A557]/30" },
  confirmed:           { labelKey: "dist_confirmed",    icon: "thumb_up",         cls: "text-emerald-300 bg-[#4A7C5C]/15 border-[#4A7C5C]/30" },
  rejected:            { labelKey: "dist_rejected",     icon: "cancel",           cls: "text-red-400 bg-red-500/15 border-red-500/30" },
};

export default function DistributionPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === 'en' ? en : vi);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [batches, setBatches] = useState<LoHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchDist, setSearchDist] = useState("");
  const [actionBatch, setActionBatch] = useState<LoHang | null>(null);
  const [newStatus, setNewStatus] = useState<string>("distributed");
  const [khuVuc, setKhuVuc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleteBatch, setDeleteBatch] = useState<LoHang | null>(null);
  // Transfer order state
  const [transferBatch, setTransferBatch] = useState<LoHang | null>(null);
  const [transferForm, setTransferForm] = useState({ ghiChu: "", hinhAnhUrls: "", nsdId: "" });
  const [adminAssignNsdId, setAdminAssignNsdId] = useState("");
  const [doanhNghiepId, setDoanhNghiepId] = useState("");
  const [nsdList, setNsdList] = useState<NhaPhaPhoiItem[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [previewImg, setPreviewImg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Transfer orders (đơn chuyển hàng)
  const [orders, setOrders] = useState<DonChuyenHang[]>([]);
  const [viewOrder, setViewOrder] = useState<DonChuyenHang | null>(null);

  const [pageBatch, setPageBatch] = useState(1);
  const [pageOrder, setPageOrder] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<{ id: string; action: 'reject' | 'reject_distributor' } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper: read doanhNghiepId from localStorage OR browser cookie
  const getDoanhNghiepId = useCallback(() => {
    if (typeof window === "undefined") return "";
    const fromLS = localStorage.getItem("doanhNghiepId") || "";
    if (fromLS) return fromLS;
    const match = document.cookie.match(/(?:^|;\\s*)doanhNghiepId=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, []);

  const fetchData = async (role?: string, dnId?: string) => {
    setLoading(true);
    try {
      const r = role || userRole || "";
      const d = dnId || doanhNghiepId || "";
      const res = await fetch("/api/distribution?role=" + r + "&doanhNghiepId=" + d);
      const data = await res.json();
      setBatches(data.batches || []);
      // Load transfer orders
      if (r) {
        const o = await fetch("/api/don-chuyen-hang?role=" + r + "&doanhNghiepId=" + d);
        const od = await o.json();
        let orderList = od.orders || [];
        // Fallback: nếu importer có doanhNghiepId nhưng không có đơn, thử lại không có filter ID
        if (r === 'importer' && d && orderList.length === 0) {
          const o2 = await fetch("/api/don-chuyen-hang?role=importer");
          const od2 = await o2.json();
          orderList = od2.orders || [];
        }
        setOrders(orderList);
      }
    } catch {
      setBatches([]);
    }
    setLoading(false);
  };

  const handleDeleteBatch = async () => {
    if (!deleteBatch) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${deleteBatch.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi xóa lô hàng");
      showToast(`✓ ${json.message}`, true);
      setDeleteBatch(null);
      fetchData();
    } catch (e: any) {
      showToast("✗ " + e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchNsdList = async () => {
    try {
      const r = await fetch("/api/kyc?list_distributors=true");
      const d = await r.json();
      setNsdList((d.companies || d.doanhNghieps || []).map((c: any) => ({
        id: c.id, tenDoanhNghiep: c.ten || c.tenDoanhNghiep, maSoThue: c.maSoThue
      })));
    } catch {}
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) {
        setTransferForm(f => ({ ...f, hinhAnhUrls: d.url }));
        setPreviewImg(d.url);
      } else showToast("✗ Upload thất bại", false);
    } catch { showToast("✗ Lỗi upload", false); }
    setUploadingImg(false);
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (!["admin", "manufacturer", "importer"].includes(role)) {
      router.replace("/dashboard");
      return;
    }
    const dnId = getDoanhNghiepId();
    if (dnId && !localStorage.getItem("doanhNghiepId")) localStorage.setItem("doanhNghiepId", dnId);
    setDoanhNghiepId(dnId);
    setUserRole(role);
    fetchData(role, dnId);
    // Fetch danh sách NPP cho NSX và Admin (để chọn khi tạo/duyệt đơn)
    if (role === 'manufacturer' || role === 'admin') fetchNsdList();
  }, []);

  const handleActivate = async () => {
    if (!actionBatch) return;
    setSubmitting(true);
    const res = await fetch("/api/distribution", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loHangId: actionBatch.id, trangThai: newStatus, khuVucPhanPhoi: khuVuc }),
    });
    const data = await res.json();
    if (!res.ok) { showToast("✗ " + data.error, false); }
    else {
      showToast(`✓ Đã cập nhật lô ${actionBatch.maLo}`, true);
      setActionBatch(null);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleTransfer = async () => {
    if (!transferBatch) return;
    setSubmitting(true);
    const imgs = transferForm.hinhAnhUrls ? [transferForm.hinhAnhUrls] : [];
    const res = await fetch("/api/don-chuyen-hang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loHangId: transferBatch.id,
        nsxDoanhNghiepId: doanhNghiepId,
        nsdDoanhNghiepId: transferForm.nsdId || null,
        ghiChu: transferForm.ghiChu,
        hinhAnhUrls: imgs,
        khuVucPhanPhoi: khuVuc,
      }),
    });
    const data = await res.json();
    if (!res.ok) showToast("✗ " + data.error, false);
    else {
      showToast("✓ Đã gửi đơn — đang chờ Admin duyệt", true);
      setTransferBatch(null);
      setTransferForm({ ghiChu: "", hinhAnhUrls: "", nsdId: "" });
      setPreviewImg("");
      fetchData(userRole || undefined, doanhNghiepId);
    }
    setSubmitting(false);
  };

  const handleOrderAction = async (orderId: string, action: string, note?: string, assignNsdId?: string) => {
    setSubmitting(true);
    const res = await fetch("/api/don-chuyen-hang", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, action, adminNote: note || "", assignNsdId }),
    });
    const d = await res.json();
    if (!res.ok) showToast("✗ " + d.error, false);
    else {
      const labels: Record<string, string> = {
        approve: "✓ Đã duyệt — chuyển sang nhà phân phối",
        reject: "✗ Đã từ chối đơn hàng",
        reject_distributor: "✗ Đã từ chối tiếp nhận — Admin & NSX đã được thông báo",
        confirm_shipment: "✓ Đã nhận đơn — chuẩn bị vận chuyển",
        confirm_receipt: "✓ Đã tiếp nhận lô hàng",
        delivered: "✓ Đã xác nhận giao hàng thành công",
      };
      showToast(labels[action] || "✓ Thành công", action !== "reject" && action !== "reject_distributor");
      setViewOrder(null);
      setRejectTarget(null);
      setRejectReason("");
      fetchData(userRole || undefined, doanhNghiepId);
    }
    setSubmitting(false);
  };

  const filtered = batches
    .filter(b => filterStatus === "all"
      || b.trangThai === filterStatus
      || (filterStatus === "active" && b.trangThai === "approved"))
    .filter(b => {
      const q = searchDist.trim().toLowerCase();
      if (!q) return true;
      return [
        b.maLo,
        b.sanPham?.ten,
        b.sanPham?.maSKU,
        b.sanPham?.doanhNghiep?.ten,
      ].some(v => (v || "").toLowerCase().includes(q));
    });

  const paginatedFiltered = filtered.slice((pageBatch - 1) * ITEMS_PER_PAGE, pageBatch * ITEMS_PER_PAGE);
  const paginatedOrders = orders.slice((pageOrder - 1) * ITEMS_PER_PAGE, pageOrder * ITEMS_PER_PAGE);

  // Reset về trang 1 khi tìm kiếm thay đổi
  useEffect(() => { setPageBatch(1); }, [searchDist]);

  if (!userRole) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl ${toast.ok ? "bg-[#4A7C5C]" : "bg-red-600"} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {t("cmn_dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#C8A557]">local_shipping</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display">{t("dist_title")}</h1>
              <p className="text-sm text-slate-400">{t("dist_sub")}</p>
            </div>
          </div>
        </div>
        {userRole !== 'importer' && (
        <div className="flex gap-2">
          {["all", "active", "distributed", "suspended"].map(s => (
            <button key={s} onClick={() => { setFilterStatus(s); setPageBatch(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                filterStatus === s ? "bg-[#C8A557] text-white border-[#C8A557]" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}>
              {s === "all" ? t("dist_all") : t(TRANG_THAI_KEYS[s]?.labelKey || "dist_all")}
            </button>
          ))}
        </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: t("dist_total"),   value: batches.length, icon: "inbox", color: "text-white" },
          { label: t("dist_ready"),   value: batches.filter(b => b.trangThai === "active" || b.trangThai === "approved").length, icon: "inventory", color: "text-[#C8A557]" },
          { label: t("dist_shipped"), value: batches.filter(b => b.trangThai === "distributed").length, icon: "local_shipping", color: "text-[#6FB585]" },
          { label: t("dist_locked"),  value: batches.filter(b => b.trangThai === "suspended").length, icon: "lock", color: "text-red-400" },
        ].map((s, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4">
            <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">search</span>
        <input
          type="text"
          value={searchDist}
          onChange={e => setSearchDist(e.target.value)}
          placeholder={tr("Tìm đơn chuyển hàng...", "Search shipping orders...")}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] transition"
        />
        {searchDist && (
          <button
            onClick={() => setSearchDist("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label={tr("Xoá tìm kiếm", "Clear search")}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Batch list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#C8A557]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3 block">inventory_2</span>
          {tr("Chưa có lô hàng nào trong danh sách phân phối. Hãy tạo lô hàng ở tab ", "No batches in distribution list. Create a batch in the ")}<Link href="/dashboard/inventory" className="text-[#C8A557] underline">{tr("Sản phẩm & Lô hàng", "Products & Batches")}</Link>{tr(".", " tab.")}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {paginatedFiltered.map(batch => {
            const statusInfo = TRANG_THAI_KEYS[batch.trangThai] || TRANG_THAI_KEYS.active;
            const expired = new Date(batch.hanDung) < new Date();
            return (
              <div key={batch.id} className="glass-panel border border-white/10 rounded-2xl p-5 hover:border-white/20 transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-300">inventory_2</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-cyan-300">{batch.maLo}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${statusInfo.cls}`}>
                          <span className="material-symbols-outlined text-[12px]">{statusInfo.icon}</span>
                          {t(statusInfo.labelKey)}
                        </span>
                        {expired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border bg-red-500/10 text-red-400 border-red-500/20">
                            <span className="material-symbols-outlined text-[12px]">warning</span> Hết hạn
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white mt-0.5">{batch.sanPham.ten} <span className="text-slate-400 text-xs">({batch.sanPham.maSKU})</span></p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        NSX: {batch.sanPham.doanhNghiep?.ten} · 
                        SX: {new Date(batch.ngaySanXuat).toLocaleDateString("vi-VN")} · 
                        HSD: {new Date(batch.hanDung).toLocaleDateString("vi-VN")} · 
                        {batch._count.uids.toLocaleString()} tem QR
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {/* Chuyển đơn — chỉ khi active + là NSX */}
                    {batch.trangThai === "active" && userRole === "manufacturer" && (
                      <button
                        onClick={() => { setTransferBatch(batch); setTransferForm({ ghiChu: "", hinhAnhUrls: "", nsdId: "" }); setPreviewImg(""); setKhuVuc(""); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#C8A557]/20 text-cyan-300 border border-[#C8A557]/30 rounded-xl text-xs font-bold hover:bg-[#C8A557]/30 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        Gửi đơn & Xuất kho
                      </button>
                    )}
                    {/* Nút Xuất kho cũ đã được gộp vào Gửi đơn */}
                    {batch.trangThai === "distributed" || ["pending_review","pending_distributor","ready"].includes(batch.trangThai) ? null : (
                      batch.trangThai !== "active" ? (
                        <button
                          onClick={() => { setActionBatch(batch); setNewStatus("active"); setKhuVuc(""); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#C8A557]/20 text-blue-300 border border-[#C8A557]/30 rounded-xl text-xs font-bold hover:bg-[#C8A557]/30 transition"
                        >
                          <span className="material-symbols-outlined text-[16px]">refresh</span>
                          Đặt lại
                        </button>
                      ) : null
                    )}
                    {!["pending_review","pending_distributor","ready","suspended"].includes(batch.trangThai) && (
                      <button
                        onClick={() => { setActionBatch(batch); setNewStatus("suspended"); setKhuVuc(""); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold hover:bg-red-500/30 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                        Khóa
                      </button>
                    )}
                    {expired && userRole !== 'admin' && (
                      <button
                        onClick={() => setDeleteBatch(batch)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold hover:bg-red-500/40 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button onClick={() => setPageBatch(p => Math.max(1, p - 1))} disabled={pageBatch === 1} className="px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30 border border-white/10">{tr("Trước", "Prev")}</button>
              <span className="text-slate-400 text-sm">Trang {pageBatch} / {Math.ceil(filtered.length / ITEMS_PER_PAGE)}</span>
              <button onClick={() => setPageBatch(p => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))} disabled={pageBatch === Math.ceil(filtered.length / ITEMS_PER_PAGE)} className="px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30 border border-white/10">Sau</button>
            </div>
          )}
        </div>
      )}

      {/* ── Transfer Orders Panel ── */}
      {(orders.length > 0 || userRole === 'importer') && (
        <div className="mt-10">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C8A557]">swap_horiz</span>
            {userRole === "manufacturer" ? "Đơn chuyển hàng (gửi & nhận)" : userRole === "importer" ? "Lô hàng được chuyển đến" : "Tất cả đơn chuyển hàng"}
          </h2>
          <div className="flex flex-col gap-4">
            {orders.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                Hiện tại chưa có đơn hàng nào được chuyển đến.
              </div>
            ) : paginatedOrders.map(ord => {
              const SC: Record<string,string> = {
                pending_review: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30",
                pending_distributor: "text-purple-300 bg-[#C8A557]/15 border-[#C8A557]/30",
                confirmed: "text-emerald-300 bg-[#4A7C5C]/15 border-[#4A7C5C]/30",
                ready: "text-cyan-300 bg-[#C8A557]/15 border-[#C8A557]/30",
                distributed: "text-teal-300 bg-[#C8A557]/15 border-[#C8A557]/30",
                rejected: "text-red-400 bg-red-500/15 border-red-500/30",
              };
              const SL: Record<string,string> = {
                pending_review: "Chờ Admin duyệt",
                pending_distributor: "Chờ xác nhận",
                confirmed: "Đã xác nhận",
                ready: "Sẵn sàng giao",
                distributed: "Đã hoàn thành",
                rejected: "Bị từ chối",
              };
              // Doanh nghiệp đóng vai bên NHẬN khi đơn được gửi đến mình (nsd === DN của mình)
              const isReceiver = userRole==="importer" || (userRole==="manufacturer" && !!doanhNghiepId && ord.nsdDoanhNghiepId === doanhNghiepId);
              const canAct = (userRole==="admin" && ord.trangThai==="pending_review") ||
                             (isReceiver && ["pending_distributor","ready","confirmed"].includes(ord.trangThai));
              return (
                <div key={ord.id} className="glass-panel border border-white/10 rounded-2xl p-5 hover:border-white/20 transition">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-slate-300">swap_horiz</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-cyan-300">{ord.loHang.maLo}</span>
                          <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border " + (SC[ord.trangThai]||"text-slate-300 bg-white/5 border-white/10")}>{SL[ord.trangThai]||ord.trangThai}</span>
                        </div>
                        <p className="text-sm text-white mt-0.5">{ord.loHang.sanPham.ten}</p>
                        <p className="text-xs text-slate-500">NSX: {ord.loHang.sanPham.doanhNghiep.ten} · {new Date(ord.thoiGian).toLocaleDateString("vi-VN")}</p>
                        {ord.ghiChu && <p className="text-xs text-slate-400 mt-0.5 italic">"{ord.ghiChu}"</p>}
                        {ord.adminNote && <p className="text-xs text-red-400 mt-0.5">❌ {ord.adminNote}</p>}
                      </div>
                    </div>
                    {canAct && (
                      <button onClick={() => setViewOrder(ord)} className="flex items-center gap-1.5 px-4 py-2 bg-[#C8A557]/20 text-cyan-300 border border-[#C8A557]/30 rounded-xl text-xs font-bold hover:bg-[#C8A557]/30 transition shrink-0">
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        {userRole==="admin" ? "Xem & Duyệt" : "Xem & Xác nhận"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {orders.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button onClick={() => setPageOrder(p => Math.max(1, p - 1))} disabled={pageOrder === 1} className="px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30 border border-white/10">{tr("Trước", "Prev")}</button>
              <span className="text-slate-400 text-sm">Trang {pageOrder} / {Math.ceil(orders.length / ITEMS_PER_PAGE)}</span>
              <button onClick={() => setPageOrder(p => Math.min(Math.ceil(orders.length / ITEMS_PER_PAGE), p + 1))} disabled={pageOrder === Math.ceil(orders.length / ITEMS_PER_PAGE)} className="px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30 border border-white/10">Sau</button>
            </div>
          )}

        </div>
      )}

      {/* Action modal */}
      {actionBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setActionBatch(null)}>
          <div className="bg-[#0B1623] border border-white/10 rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">
              {newStatus === "distributed" ? "Xuất kho lô hàng" : newStatus === "active" ? "Kích hoạt lại" : "Khóa lô hàng"}
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              Lô: <span className="font-mono font-bold text-cyan-300">{actionBatch.maLo}</span> — {actionBatch.sanPham.ten}
            </p>
            {newStatus === "distributed" && (
              <div className="mb-5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Khu vực phân phối (tuỳ chọn)
                </label>
                <input
                  value={khuVuc}
                  onChange={e => setKhuVuc(e.target.value)}
                  placeholder="VD: TP.HCM, Miền Nam, siêu thị X..."
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557]"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setActionBatch(null)} className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">{tr("Huỷ", "Cancel")}</button>
              <button onClick={handleActivate} disabled={submitting}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                  newStatus === "distributed" ? "bg-[#4A7C5C] hover:bg-[#4A7C5C] text-white"
                    : newStatus === "active" ? "bg-[#C8A557] hover:bg-[#C8A557] text-white"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}>
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Transfer order modal - UPGRADED */}
      {transferBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTransferBatch(null)}>
          <div className="bg-[#0B1623] border border-[#C8A557]/20 rounded-3xl p-7 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#C8A557]">send</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Chuyển đơn & Xuất kho</h3>
                <p className="text-xs text-slate-400">Lô: <span className="font-mono text-cyan-300">{transferBatch.maLo}</span> — {transferBatch.sanPham.ten} ({transferBatch._count.uids.toLocaleString()} tem)</p>
              </div>
            </div>
            <div className="glass-panel border border-[#C8A557]/20 rounded-xl p-3 flex gap-2 mb-4">
              <span className="material-symbols-outlined text-[#C8A557] text-[16px] mt-0.5">info</span>
              <p className="text-xs text-amber-300">Đơn sẽ gửi Admin duyệt trước → Admin duyệt → Nhà phân phối tiếp nhận → Giao hàng.</p>
            </div>
            <div className="space-y-4">
              {/* NSD selection */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nhà phân phối tiếp nhận <span className="text-slate-600 font-normal">(tuỳ chọn)</span></label>
                <select
                  value={transferForm.nsdId}
                  onChange={e => setTransferForm(f => ({ ...f, nsdId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A557]"
                >
                  <option value="">— Để Admin chỉ định sau —</option>
                  {nsdList.map(n => (
                    <option key={n.id} value={n.id}>{n.tenDoanhNghiep} ({n.maSoThue})</option>
                  ))}
                </select>
              </div>
              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Khu vực phân phối <span className="text-slate-600 font-normal">(tuỳ chọn)</span></label>
                <input
                  type="text"
                  placeholder="VD: TP.HCM, Miền Nam, siêu thị X..."
                  value={khuVuc}
                  onChange={e => setKhuVuc(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A557]"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Ghi chú / Mô tả đơn hàng</label>
                <textarea
                  value={transferForm.ghiChu}
                  onChange={e => setTransferForm(f => ({ ...f, ghiChu: e.target.value }))}
                  rows={3} placeholder="Yêu cầu đặc biệt, điều kiện bảo quản..."
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] resize-none"
                />
              </div>
              {/* Image upload */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Ảnh lô hàng <span className="text-slate-600 font-normal">(tuỳ chọn)</span></label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                />
                {previewImg ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img src={previewImg} alt="preview" className="w-full h-36 object-cover" />
                    <button onClick={() => { setPreviewImg(""); setTransferForm(f => ({ ...f, hinhAnhUrls: "" })); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full text-white text-xs flex items-center justify-center">✕</button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImg}
                    className="w-full border-2 border-dashed border-white/20 rounded-xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-[#C8A557]/40 hover:text-cyan-300 transition disabled:opacity-50">
                    {uploadingImg ? <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#C8A557]" /> : <span className="material-symbols-outlined text-3xl">upload</span>}
                    <span className="text-xs">{uploadingImg ? "Đang tải..." : "Nhấn để chọn ảnh lô hàng"}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setTransferBatch(null); setPreviewImg(""); }} className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">{tr("Huỷ", "Cancel")}</button>
              <button onClick={handleTransfer} disabled={submitting || uploadingImg}
                className="flex-1 py-3 bg-gradient-to-r from-[#C8A557] to-[#E4D2A1] hover:from-[#C8A557] hover:to-cyan-300 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                <span className="material-symbols-outlined text-[16px]">send</span> Gửi đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Xác nhận xóa lô hàng ── */}
      {deleteBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteBatch(null)}>
          <div className="bg-[#142235] border border-red-500/30 rounded-3xl shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
              </div>
              <h2 className="text-xl font-bold text-white">{tr("Xác nhận xóa lô hàng", "Confirm batch deletion")}</h2>
              <p className="text-slate-400 text-sm mt-2">
                Lô <span className="font-mono font-bold text-white">{deleteBatch.maLo}</span> và
                toàn bộ <span className="text-red-400 font-bold">{deleteBatch._count.uids.toLocaleString()} tem QR</span> sẽ bị xóa vĩnh viễn.
              </p>
              <p className="text-xs text-red-400 mt-2 font-bold">Hành động này không thể hoàn tác!</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteBatch(null)}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">{tr("Hủy", "Cancel")}</button>
              <button onClick={handleDeleteBatch} disabled={submitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Chi tiết & Xử lý đơn chuyển hàng ── */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewOrder(null)}>
          <div className="bg-[#0B1623] border border-white/10 rounded-3xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                viewOrder.trangThai === 'pending_review' ? 'bg-[#C8A557]/20 border-[#C8A557]/30' :
                viewOrder.trangThai === 'pending_distributor' ? 'bg-[#C8A557]/20 border-[#C8A557]/30' :
                viewOrder.trangThai === 'confirmed' ? 'bg-[#C8A557]/20 border-[#C8A557]/30' :
                viewOrder.trangThai === 'distributed' ? 'bg-[#4A7C5C]/20 border-[#4A7C5C]/30' :
                viewOrder.trangThai === 'rejected' ? 'bg-red-500/20 border-red-500/30' :
                'bg-white/10 border-white/20'
              }`}>
                <span className="material-symbols-outlined text-xl text-white">swap_horiz</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Chi tiết đơn chuyển hàng</h3>
                <p className="text-xs text-slate-400">Mã lô: <span className="font-mono text-cyan-300">{viewOrder.loHang.maLo}</span></p>
              </div>
            </div>

            {/* Info grid */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 text-sm mb-5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sản phẩm:</span>
                <span className="text-white font-medium">{viewOrder.loHang.sanPham.ten}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Nhà sản xuất:</span>
                <span className="text-white">{viewOrder.loHang.sanPham.doanhNghiep.ten}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Số lượng:</span>
                <span className="text-white font-mono">{viewOrder.loHang.soLuong.toLocaleString()} sản phẩm</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Thời gian tạo:</span>
                <span className="text-white">{new Date(viewOrder.thoiGian).toLocaleString("vi-VN")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Trạng thái:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                  viewOrder.trangThai === 'pending_review' ? 'text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30' :
                  viewOrder.trangThai === 'pending_distributor' ? 'text-purple-300 bg-[#C8A557]/15 border-[#C8A557]/30' :
                  viewOrder.trangThai === 'confirmed' ? 'text-cyan-300 bg-[#C8A557]/15 border-[#C8A557]/30' :
                  viewOrder.trangThai === 'distributed' ? 'text-emerald-300 bg-[#4A7C5C]/15 border-[#4A7C5C]/30' :
                  viewOrder.trangThai === 'rejected' ? 'text-red-400 bg-red-500/15 border-red-500/30' :
                  'text-slate-300 bg-white/10 border-white/20'
                }`}>
                  {{
                    pending_review: '⏳ Chờ Admin duyệt',
                    pending_distributor: '📬 Chờ NPP xác nhận',
                    confirmed: '🚚 Đang vận chuyển',
                    distributed: '✅ Đã giao thành công',
                    rejected: '❌ Bị từ chối',
                  }[viewOrder.trangThai] || viewOrder.trangThai}
                </span>
              </div>
              {viewOrder.ghiChu && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">Ghi chú:</span>
                  <span className="text-white text-right">{viewOrder.ghiChu}</span>
                </div>
              )}
              {viewOrder.adminNote && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">Lý do:</span>
                  <span className="text-red-300 text-right">{viewOrder.adminNote}</span>
                </div>
              )}
            </div>

            {/* Ảnh lô hàng */}
            {viewOrder.hinhAnhUrls && (() => { try { const u = JSON.parse(viewOrder.hinhAnhUrls!); return u[0] ? <img src={u[0]} alt="lot" className="w-full h-40 object-cover rounded-xl mb-4 border border-white/10" /> : null; } catch { return null; } })()}

            {/* Hướng dẫn luồng xử lý */}
            <div className="glass-panel border border-white/10 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-400 font-bold mb-1">Luồng xử lý:</p>
              <div className="flex items-center gap-1 flex-wrap">
                {['NSX gửi đơn','Admin duyệt','NPP nhận đơn','Đang vận chuyển','Hoàn thành'].map((step, i) => {
                  const done = (i === 0) ||
                    (i === 1 && ['pending_distributor','confirmed','distributed'].includes(viewOrder.trangThai)) ||
                    (i === 2 && ['confirmed','distributed'].includes(viewOrder.trangThai)) ||
                    (i === 3 && ['confirmed','distributed'].includes(viewOrder.trangThai)) ||
                    (i === 4 && viewOrder.trangThai === 'distributed');
                  const current = (i === 1 && viewOrder.trangThai === 'pending_review') ||
                    (i === 2 && viewOrder.trangThai === 'pending_distributor') ||
                    (i === 3 && viewOrder.trangThai === 'confirmed');
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        done ? 'bg-[#4A7C5C]/20 text-emerald-300' :
                        current ? 'bg-[#C8A557]/20 text-amber-300' :
                        'bg-white/5 text-slate-500'
                      }`}>{step}</span>
                      {i < 4 && <span className="text-slate-600 text-[10px]">→</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin: chỉ định nhà phân phối khi pending_review và chưa có NPP */}
            {userRole === "admin" && viewOrder.trangThai === "pending_review" && (
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Chỉ định Nhà phân phối <span className="text-red-400">*</span>
                </label>
                <select
                  value={adminAssignNsdId}
                  onChange={e => setAdminAssignNsdId(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A557]"
                >
                  <option value="">— Chọn Nhà phân phối —</option>
                  {nsdList.map(n => (
                    <option key={n.id} value={n.id}>{n.tenDoanhNghiep}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {/* ── Admin: Duyệt hoặc Từ chối ── */}
              {userRole === "admin" && viewOrder.trangThai === "pending_review" && (<>
                <button onClick={() => {
                  const finalNsd = adminAssignNsdId || viewOrder.nsdDoanhNghiepId;
                  if (!finalNsd) { showToast("✗ Vui lòng chọn Nhà phân phối tiếp nhận!", false); return; }
                  handleOrderAction(viewOrder.id, "approve", undefined, adminAssignNsdId || undefined);
                }} disabled={submitting}
                  className="flex-[2] py-3 bg-[#4A7C5C] hover:bg-[#4A7C5C] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Duyệt & Gửi cho NPP
                </button>
                <button onClick={() => { setRejectTarget({ id: viewOrder.id, action: 'reject' }); setRejectReason(""); }} disabled={submitting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Từ chối
                </button>
              </>)}

              {/* ── Importer: Nhận đơn hoặc Từ chối (pending_distributor) ── */}
              {(userRole === "importer" || (userRole === "manufacturer" && !!doanhNghiepId && viewOrder.nsdDoanhNghiepId === doanhNghiepId)) && viewOrder.trangThai ==="pending_distributor" && (<>
                <button onClick={() => handleOrderAction(viewOrder.id, "confirm_shipment")} disabled={submitting}
                  className="flex-[2] py-3 bg-[#C8A557] hover:bg-[#C8A557] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> : null}
                  <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                  Nhận đơn vận chuyển
                </button>
                <button onClick={() => { setRejectTarget({ id: viewOrder.id, action: 'reject_distributor' }); setRejectReason(""); }} disabled={submitting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Từ chối
                </button>
              </>)}

              {/* ── Importer: Xác nhận đã giao hàng (confirmed) ── */}
              {(userRole === "importer" || (userRole === "manufacturer" && !!doanhNghiepId && viewOrder.nsdDoanhNghiepId === doanhNghiepId)) && viewOrder.trangThai ==="confirmed" && (
                <button onClick={() => handleOrderAction(viewOrder.id, "delivered")} disabled={submitting}
                  className="flex-[2] py-3 bg-[#4A7C5C] hover:bg-[#4A7C5C] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> : null}
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  Xác nhận đã giao hàng
                </button>
              )}

              {/* ── Importer: ready → delivered (old flow) ── */}
              {(userRole === "importer" || (userRole === "manufacturer" && !!doanhNghiepId && viewOrder.nsdDoanhNghiepId === doanhNghiepId)) && viewOrder.trangThai ==="ready" && (
                <button onClick={() => handleOrderAction(viewOrder.id, "delivered")} disabled={submitting}
                  className="flex-[2] py-3 bg-[#4A7C5C] hover:bg-[#4A7C5C] text-white rounded-xl text-sm font-bold transition disabled:opacity-50">
                  ✓ Đã giao hàng
                </button>
              )}

              <button onClick={() => setViewOrder(null)} className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nhập lý do từ chối ── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>
          <div className="bg-[#1a0a0a] border border-red-500/30 rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-400">cancel</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {rejectTarget.action === 'reject' ? 'Từ chối đơn hàng' : 'Từ chối nhận đơn vận chuyển'}
                </h3>
                <p className="text-xs text-slate-400">
                  {rejectTarget.action === 'reject'
                    ? 'Lô hàng sẽ được trả về trạng thái Active, NSX được thông báo.'
                    : 'Admin và NSX sẽ được thông báo để chọn NPP khác.'}
                </p>
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Lý do từ chối <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                placeholder={rejectTarget.action === 'reject'
                  ? 'VD: Lô hàng không đủ chứng từ, sai thông tin...'
                  : 'VD: Hiện tại xe không đủ, khu vực quá xa, đang có việc phát sinh...'}
                className="w-full bg-white/5 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-400 resize-none"
              />
              {!rejectReason.trim() && (
                <p className="text-xs text-red-400 mt-1">{tr("Vui lòng nhập lý do từ chối", "Please enter rejection reason")}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">
                Huỷ
              </button>
              <button
                onClick={() => {
                  if (!rejectReason.trim()) { showToast("✗ Vui lòng nhập lý do từ chối", false); return; }
                  handleOrderAction(rejectTarget.id, rejectTarget.action, rejectReason.trim());
                }}
                disabled={submitting || !rejectReason.trim()}
                className="flex-[2] py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> : null}
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
