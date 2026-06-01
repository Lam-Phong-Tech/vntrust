"use client";
import { Toast } from "@/components/Toast";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface Transaction {
  id: string;
  loaiGD: string;
  soLuong: number;
  viTri?: string;
  nguoiThuc: string;
  ghiChu?: string;
  thoiGian: string;
  loHang: {
    maLo: string;
    sanPham: { ten: string; maSKU: string };
  };
}

interface Stats { totalNhap: number; totalXuat: number; tonKho: number; }

interface LoHang {
  id: string;
  maLo: string;
  trangThai: string;
  sanPham: { ten: string; maSKU: string };
}

const LOAI_GD_KEYS: Record<string, { labelKey: string; icon: string; cls: string; arrow: string }> = {
  NHAP_KHO:   { labelKey: "wh_filter_in",   icon: "download",    cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", arrow: "↓" },
  XUAT_KHO:   { labelKey: "wh_filter_out",  icon: "upload",      cls: "text-blue-300 bg-blue-500/15 border-blue-500/30",         arrow: "↑" },
  CHUYEN_KHO: { labelKey: "wh_filter_move", icon: "swap_horiz",  cls: "text-purple-300 bg-purple-500/15 border-purple-500/30",   arrow: "⇄" },
};

export default function WarehousePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ totalNhap: 0, totalXuat: 0, tonKho: 0 });
  const [batches, setBatches] = useState<LoHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ loaiGD: "NHAP_KHO" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper: read doanhNghiepId from localStorage OR browser cookie (whichever available)
  const getDoanhNghiepId = useCallback(() => {
    const fromLS = localStorage.getItem("doanhNghiepId") || "";
    if (fromLS) return fromLS;
    // Fallback: read directly from cookie (set by login API)
    const match = document.cookie.match(/(?:^|;\\s*)doanhNghiepId=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const role = localStorage.getItem("userRole") || "";
    const doanhNghiepId = getDoanhNghiepId();
    const params = new URLSearchParams({ role });
    if (doanhNghiepId) params.set("doanhNghiepId", doanhNghiepId);
    try {
      const res = await fetch(`/api/warehouse?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setStats(data.stats || { totalNhap: 0, totalXuat: 0, tonKho: 0 });
    } catch {
      setTransactions([]);
    }
    setLoading(false);
  }, [getDoanhNghiepId]);

  const fetchBatches = async () => {
    const role = localStorage.getItem("userRole") || "";
    const doanhNghiepId = getDoanhNghiepId();
    // Sync to localStorage if found from cookie (so future reads work)
    if (doanhNghiepId && !localStorage.getItem("doanhNghiepId")) {
      localStorage.setItem("doanhNghiepId", doanhNghiepId);
    }
    try {
      const params = new URLSearchParams({ role });
      if (doanhNghiepId) params.set("doanhNghiepId", doanhNghiepId);
      const res = await fetch(`/api/distribution?${params}`);
      const data = await res.json();
      // Show batches that can be transacted: approved (chờ nhập kho) + active (đang hoạt động)
      const active = (data.batches || []).filter((b: any) =>
        ["approved", "active"].includes(b.trangThai)
      );
      setBatches(active.map((b: any) => ({
        id: b.id,
        maLo: b.maLo,
        trangThai: b.trangThai,
        sanPham: { ten: b.sanPham?.ten || "?", maSKU: b.sanPham?.maSKU || "" },
      })));
    } catch {
      setBatches([]);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (!["admin", "manufacturer", "importer"].includes(role)) { router.replace("/dashboard"); return; }
    setUserRole(role);
    fetchData();
    fetchBatches();
  }, []);

  // Selected batch info
  const selectedBatch = batches.find(b => b.id === form.loHangId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.loHangId || !form.loaiGD || !form.soLuong) {
      showToast("✗ Vui lòng điền đầy đủ trường bắt buộc (*)", false);
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/warehouse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) showToast("✗ " + data.error, false);
    else {
      const msg = form.loaiGD === "XUAT_KHO"
        ? "✓ Xuất kho thành công — Đơn đang chờ Admin duyệt trước khi chuyển NPP"
        : "✓ Ghi giao dịch kho thành công";
      showToast(msg, true);
      setModal(false);
      setForm({ loaiGD: "NHAP_KHO" });
      fetchData();
      fetchBatches(); // Refresh batch list
    }
    setSubmitting(false);
  };

  const filtered = transactions.filter(t => filterType === "all" || t.loaiGD === filterType);

  if (!userRole) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {t("cmn_dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-400">warehouse</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline">{t("wh_title")}</h1>
              <p className="text-sm text-slate-400">{t("wh_sub")}</p>
            </div>
          </div>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl font-bold text-sm transition active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("wh_log_tx")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: t("wh_total_in"),  value: stats.totalNhap.toLocaleString(), icon: "download",  color: "text-emerald-400" },
          { label: t("wh_total_out"), value: stats.totalXuat.toLocaleString(), icon: "upload",    color: "text-blue-400" },
          { label: t("wh_balance"),   value: stats.tonKho.toLocaleString(),    icon: "inventory", color: stats.tonKho >= 0 ? "text-white" : "text-red-400" },
        ].map((s, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4">
            <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[["all", t("wh_filter_all")], ["NHAP_KHO", t("wh_filter_in")], ["XUAT_KHO", t("wh_filter_out")], ["CHUYEN_KHO", t("wh_filter_move")]].map(([k, l]) => (
          <button key={k} onClick={() => setFilterType(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filterType === k ? "bg-cyan-500/25 text-cyan-200 border-cyan-400/50" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3 block">warehouse</span>
          <p className="font-bold text-white mb-2">{t("wh_no_tx")}</p>
          <button onClick={() => setModal(true)}
            className="mt-2 px-5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl font-bold text-sm transition active:scale-95">
            + {t("wh_log_first")}
          </button>
        </div>
      ) : (
        <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-white/5">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-5 py-3">Loại GD</th>
                  <th className="px-5 py-3">Lô hàng / Sản phẩm</th>
                  <th className="px-5 py-3">Mã lô</th>
                  <th className="px-5 py-3">Số lượng</th>
                  <th className="px-5 py-3">Vị trí</th>
                  <th className="px-5 py-3">Người thực hiện</th>
                  <th className="px-5 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(tx => {
                  const gd = LOAI_GD_KEYS[tx.loaiGD] || LOAI_GD_KEYS.NHAP_KHO;
                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border ${gd.cls}`}>
                          <span className="material-symbols-outlined text-[13px]">{gd.icon}</span>
                          {t(gd.labelKey)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-white">{tx.loHang.sanPham.ten}</p>
                        <p className="text-xs text-slate-400">{tx.loHang.sanPham.maSKU}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                          {tx.loHang.maLo}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-lg font-black ${gd.arrow === "↓" ? "text-emerald-400" : gd.arrow === "↑" ? "text-blue-400" : "text-purple-400"}`}>
                          {gd.arrow} {tx.soLuong.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {tx.viTri ? (
                          <span className="text-sm text-slate-300 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-slate-500">location_on</span>
                            {tx.viTri}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-300">{tx.nguoiThuc}</td>
                      <td className="px-5 py-3 text-xs text-slate-400">{new Date(tx.thoiGian).toLocaleString("vi-VN")}</td>
                    </tr>
                  );
                 })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BottomSheetModal
        open={modal}
        onClose={() => { setModal(false); setForm({ loaiGD: "NHAP_KHO" }); }}
        title="Ghi Giao dịch Kho"
        icon="warehouse"
        iconBg="bg-cyan-500/20"
        iconColor="text-cyan-400"
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex gap-2">
              <span className="material-symbols-outlined text-[14px] shrink-0">info</span>
              Theo FR-BAT-05: Ghi nhận đầy đủ timestamp tự động, vị trí kho (tùy chọn), người thực hiện vào audit log.
            </div>

            {form.loaiGD === "XUAT_KHO" && (
              <div className="p-3 bg-[#C8A557]/10 border border-[#C8A557]/20 rounded-xl text-xs text-amber-300 flex gap-2">
                <span className="material-symbols-outlined text-[14px] shrink-0">local_shipping</span>
                <span>Thao tác này đồng thời tạo Đơn chuyển hàng. Đơn sẽ được gửi cho <strong>Admin duyệt trước</strong>, sau đó mới tới Nhà phân phối.</span>
              </div>
            )}

            {/* Batch selector */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Lô hàng <span className="text-red-400">*</span>
                <span className="ml-2 text-slate-500 font-normal normal-case">(chỉ hiện lô đang hoạt động)</span>
              </label>
              <select
                value={form.loHangId || ""}
                onChange={e => setForm(f => ({ ...f, loHangId: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">— Chọn lô hàng —</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.maLo} — {b.sanPham.ten} {b.trangThai === "approved" ? "(Chưa nhập kho)" : "(Đang hoạt động)"}
                  </option>
                ))}
              </select>
              {batches.length === 0 && (
                <p className="text-xs text-[#C8A557] mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  Chưa có lô nào ở trạng thái hoạt động. Vui lòng kiểm tra mục Sản phẩm &amp; Lô hàng.
                </p>
              )}
            </div>

            {selectedBatch && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Mã lô</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                  <span className="material-symbols-outlined text-cyan-400 text-[18px]">qr_code</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">{selectedBatch.maLo}</span>
                  <span className="ml-auto text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Tự động</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Loại giao dịch <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.loaiGD}
                  onChange={e => setForm(f => ({ ...f, loaiGD: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="NHAP_KHO">↓ Nhập kho</option>
                  <option value="XUAT_KHO">↑ Xuất kho</option>
                  <option value="CHUYEN_KHO">⇄ Chuyển kho</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Số lượng <span className="text-red-400">*</span>
                </label>
                <input
                  type="number" min="1"
                  value={form.soLuong || ""}
                  onChange={e => setForm(f => ({ ...f, soLuong: e.target.value }))}
                  required placeholder="VD: 1000"
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Địa chỉ kho (FR-BAT-05)</label>
              <input
                value={form.viTri || ""}
                onChange={e => setForm(f => ({ ...f, viTri: e.target.value }))}
                placeholder="VD: Kho A, 12 Nguyễn Thị Minh Khai, Q.1, TP.HCM"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Ghi chú</label>
              <textarea
                value={form.ghiChu || ""}
                onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))}
                rows={2} placeholder="Lý do nhập/xuất, người giao nhận, xe số..."
                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-white/10 bg-[#0f1e33] sticky bottom-0">
            <button type="button"
              onClick={() => { setModal(false); setForm({ loaiGD: "NHAP_KHO" }); }}
              className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition"
            >Huỷ</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-cyan-300" />}
              {t("wh_confirm")}
            </button>
          </div>
        </form>
      </BottomSheetModal>
    </div>
  );
}
