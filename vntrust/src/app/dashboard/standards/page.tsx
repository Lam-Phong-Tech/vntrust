"use client";
// Thư viện Tiêu chuẩn — tra cứu ngưỡng/chỉ tiêu kiểm nghiệm theo nhóm sản phẩm.
// GET công khai (đăng nhập); thêm/sửa/xóa = admin. Backend: /api/standards (TieuChuanKiemNghiem)
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface Standard {
  id: string;
  nhomSanPham: string;
  tenChiTieu: string;
  donVi?: string | null;
  loaiNguong: string; // max | min | range | qualitative
  nguongMin?: number | null;
  nguongMax?: number | null;
  giaTriBatBuoc?: string | null;
  canCu?: string | null;
  ghiChu?: string | null;
  trangThai: string;
}

const NHOM = ["Thực phẩm", "Dược phẩm", "Mỹ phẩm", "Rau củ", "Thịt", "Thủy sản", "Đồ uống", "Khác"];

function nguongText(s: Standard): string {
  const u = s.donVi ? ` ${s.donVi}` : "";
  if (s.loaiNguong === "max") return `≤ ${s.nguongMax ?? "—"}${u}`;
  if (s.loaiNguong === "min") return `≥ ${s.nguongMin ?? "—"}${u}`;
  if (s.loaiNguong === "range") return `${s.nguongMin ?? "—"} – ${s.nguongMax ?? "—"}${u}`;
  return s.giaTriBatBuoc || "Định tính";
}

const emptyForm = { nhomSanPham: "Thực phẩm", tenChiTieu: "", donVi: "", loaiNguong: "max", nguongMin: "", nguongMax: "", giaTriBatBuoc: "", canCu: "", ghiChu: "" };

export default function StandardsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [items, setItems] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [nhom, setNhom] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const r = localStorage.getItem("userRole");
    if (!r) { router.replace("/login"); return; }
    setUserRole(r);
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (nhom) p.set("nhomSanPham", nhom);
      const r = await fetch(`/api/standards?${p}`, { cache: "no-store" });
      const d = await r.json();
      setItems(d.standards || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [nhom]);
  useEffect(() => { if (userRole) fetchData(); }, [userRole, fetchData]);

  const isAdmin = userRole === "admin";
  const filtered = items.filter(s =>
    !search || s.tenChiTieu.toLowerCase().includes(search.toLowerCase()) || (s.canCu || "").toLowerCase().includes(search.toLowerCase())
  );
  const groups = NHOM.filter(g => items.some(s => s.nhomSanPham === g)).concat(
    [...new Set(items.map(s => s.nhomSanPham))].filter(g => !NHOM.includes(g))
  );

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal("add"); };
  const openEdit = (s: Standard) => {
    setForm({ nhomSanPham: s.nhomSanPham, tenChiTieu: s.tenChiTieu, donVi: s.donVi || "", loaiNguong: s.loaiNguong, nguongMin: s.nguongMin ?? "", nguongMax: s.nguongMax ?? "", giaTriBatBuoc: s.giaTriBatBuoc || "", canCu: s.canCu || "", ghiChu: s.ghiChu || "" });
    setEditId(s.id); setModal("edit");
  };

  const save = async () => {
    if (!form.tenChiTieu.trim()) { showToast("Nhập tên chỉ tiêu", false); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        nguongMin: form.nguongMin === "" ? null : Number(form.nguongMin),
        nguongMax: form.nguongMax === "" ? null : Number(form.nguongMax),
        giaTriBatBuoc: form.giaTriBatBuoc || null,
      };
      const r = await fetch("/api/standards", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lưu thất bại");
      showToast(editId ? "✅ Đã cập nhật tiêu chuẩn" : "✅ Đã thêm tiêu chuẩn", true);
      setModal(null); await fetchData();
    } catch (e: any) { showToast("❌ " + e.message, false); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Xóa tiêu chuẩn này?")) return;
    try {
      const r = await fetch(`/api/standards?id=${id}`, { method: "DELETE" });
      if (r.ok) { showToast("Đã xóa", true); await fetchData(); }
      else showToast("Xóa thất bại", false);
    } catch { showToast("Lỗi xóa", false); }
  };

  if (!userRole) return null;

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 pb-[100px] md:pb-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">{tr("Tham chiếu chất lượng", "Quality reference")}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">{tr("Thư viện Tiêu chuẩn", "Standards Library")}</h1>
          <p className="text-sm text-slate-400 mt-1">{tr("Tra cứu ngưỡng/chỉ tiêu kiểm nghiệm bắt buộc theo nhóm sản phẩm (QCVN/TCVN…).", "Look up mandatory test thresholds by product group (QCVN/TCVN…).")}</p>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/dashboard" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>{tr("Quay lại", "Back")}
          </Link>
          {isAdmin && (
            <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#C8A557] text-[#0B1623] font-bold hover:brightness-110 transition flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">add</span>{tr("Thêm tiêu chuẩn", "Add")}
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("Tìm chỉ tiêu, căn cứ (QCVN/TCVN)…", "Search indicator, basis…")}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557]/50" />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
        </div>
        <select value={nhom} onChange={e => setNhom(e.target.value)} className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50">
          <option value="">{tr("Tất cả nhóm SP", "All groups")}</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-bold">{tr("Nhóm SP", "Group")}</th>
                <th className="px-4 py-3 font-bold">{tr("Chỉ tiêu", "Indicator")}</th>
                <th className="px-4 py-3 font-bold">{tr("Ngưỡng cho phép", "Threshold")}</th>
                <th className="px-4 py-3 font-bold">{tr("Căn cứ", "Basis")}</th>
                {isAdmin && <th className="px-4 py-3 font-bold text-right">{tr("Thao tác", "Actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-10 text-center text-slate-400">{tr("Đang tải…", "Loading…")}</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-10 text-center text-slate-400">{tr("Chưa có tiêu chuẩn nào", "No standards yet")}</td></tr>}
              {!loading && filtered.map(s => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3"><span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C8A557]/15 text-[#C8A557] border border-[#C8A557]/30">{s.nhomSanPham}</span></td>
                  <td className="px-4 py-3 text-white font-medium">{s.tenChiTieu}</td>
                  <td className="px-4 py-3 font-mono text-emerald-300">{nguongText(s)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.canCu || "—"}{s.ghiChu ? <span className="block text-slate-500">{s.ghiChu}</span> : null}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-[#C8A557]" title="Sửa"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                        <button onClick={() => del(s.id)} className="text-slate-400 hover:text-red-400" title="Xóa"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mt-3">{tr("Hệ thống Hậu kiểm dùng các ngưỡng này để tự đối chiếu kết quả kiểm nghiệm sản phẩm.", "Post-market control uses these thresholds to auto-check product test results.")}</p>

      {/* Admin modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-[#0B1623] border border-[#C8A557]/30 rounded-2xl w-full max-w-lg max-h-[88dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">{modal === "add" ? tr("Thêm tiêu chuẩn", "Add standard") : tr("Sửa tiêu chuẩn", "Edit standard")}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Nhóm sản phẩm</label>
                  <select value={form.nhomSanPham} onChange={e => setForm((f: any) => ({ ...f, nhomSanPham: e.target.value }))} className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50">
                    {NHOM.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Đơn vị</label>
                  <input value={form.donVi} onChange={e => setForm((f: any) => ({ ...f, donVi: e.target.value }))} placeholder="mg/kg, ppm, CFU/g, %" className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#C8A557]/50" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Tên chỉ tiêu *</label>
                <input value={form.tenChiTieu} onChange={e => setForm((f: any) => ({ ...f, tenChiTieu: e.target.value }))} placeholder="VD: Chì (Pb), Cadimi, E.coli, Dư lượng thuốc BVTV" className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#C8A557]/50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Loại ngưỡng</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[["max", "Tối đa ≤"], ["min", "Tối thiểu ≥"], ["range", "Khoảng"], ["qualitative", "Định tính"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setForm((f: any) => ({ ...f, loaiNguong: v }))} className={`py-2 rounded-lg text-xs font-bold border transition ${form.loaiNguong === v ? "bg-[#C8A557] text-[#0B1623] border-[#C8A557]" : "bg-white/5 border-white/10 text-slate-300"}`}>{l}</button>
                  ))}
                </div>
              </div>
              {form.loaiNguong === "qualitative" ? (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Giá trị bắt buộc</label>
                  <input value={form.giaTriBatBuoc} onChange={e => setForm((f: any) => ({ ...f, giaTriBatBuoc: e.target.value }))} placeholder="VD: Âm tính / Không phát hiện" className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#C8A557]/50" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(form.loaiNguong === "min" || form.loaiNguong === "range") && (
                    <div><label className="text-[10px] text-slate-500 uppercase tracking-wider">Ngưỡng Min</label>
                      <input type="number" step="any" value={form.nguongMin} onChange={e => setForm((f: any) => ({ ...f, nguongMin: e.target.value }))} className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50" /></div>
                  )}
                  {(form.loaiNguong === "max" || form.loaiNguong === "range") && (
                    <div><label className="text-[10px] text-slate-500 uppercase tracking-wider">Ngưỡng Max</label>
                      <input type="number" step="any" value={form.nguongMax} onChange={e => setForm((f: any) => ({ ...f, nguongMax: e.target.value }))} className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50" /></div>
                  )}
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Căn cứ pháp lý</label>
                <input value={form.canCu} onChange={e => setForm((f: any) => ({ ...f, canCu: e.target.value }))} placeholder="VD: QCVN 8-2:2011/BYT, TCVN 7596:2007" className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#C8A557]/50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Ghi chú</label>
                <input value={form.ghiChu} onChange={e => setForm((f: any) => ({ ...f, ghiChu: e.target.value }))} className="w-full mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50" />
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t border-white/10">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10">{tr("Hủy", "Cancel")}</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#C8A557] text-[#0B1623] text-sm font-bold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">{saving ? "progress_activity" : "save"}</span>{saving ? tr("Đang lưu…", "Saving…") : tr("Lưu", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-[90px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-bold border shadow-lg backdrop-blur ${toast.ok ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" : "bg-red-500/15 border-red-500/40 text-red-200"}`}>{toast.msg}</div>
      )}
    </div>
  );
}
