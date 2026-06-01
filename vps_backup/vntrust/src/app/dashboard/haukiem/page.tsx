"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLogs } from "@/hooks/useLogs";
import { useLanguage } from "@/contexts/LanguageContext";

interface SanPham {
  id: string;
  ten: string;
  maSKU: string;
}

interface LoHang {
  id: string;
  maLo: string;
}

interface HauKiem {
  id: string;
  doiTuongLayMau: string;
  coSoPhanTich: string;
  ngayLayMau: string;
  ngayPhanTich: string;
  ketQua: string;
  chiTieuVuotNguong: string | null;
  fileDinhKem: string | null;
  trangThaiXacMinh: string;
  ghiChu: string | null;
  ngayTao: string;
  sanPham: SanPham | null;
  loHang: LoHang | null;
}

interface ChungNhan {
  id: string;
  loai: string;
  soChungNhan: string;
  ngayCap: string;
  ngayHetHan: string;
  toChucCap: string;
  hinhAnhUrl: string | null;
  trangThaiDuyet: string;
  sanPham: { ten: string; maSKU: string; doanhNghiep: { ten: string } };
}

export default function HauKiemPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'haukiem' | 'certs'>('haukiem');
  const [data, setData] = useState<HauKiem[]>([]);
  const [certs, setCerts] = useState<ChungNhan[]>([]);
  
  const [pageHk, setPageHk] = useState(1);
  const [pageCert, setPageCert] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const { addLog } = useLogs();

  const [sanPhams, setSanPhams] = useState<SanPham[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  // Admin verify modal state
  const [verifyModal, setVerifyModal] = useState<{ hk: HauKiem; action: 'verify' | 'reject' } | null>(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  // Form states
  const [form, setForm] = useState<Record<string, any>>({
    ketQua: 'dambao',
    doiTuongLayMau: 'doanhnghiep',
  });

  const fetchData = () => {
    setLoading(true);
    const role = localStorage.getItem('userRole') || '';
    const doanhNghiepId = localStorage.getItem('doanhNghiepId') || '';
    const params = new URLSearchParams({ role });
    if (doanhNghiepId) params.set('doanhNghiepId', doanhNghiepId);
    fetch(`/api/haukiem?${params}`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchCerts = () => {
    fetch("/api/certificates?status=all")
      .then(r => r.json())
      .then(d => { setCerts(d.certs || []); })
      .catch(e => console.error(e));
  };

  const fetchSanPhams = () => {
    fetch("/api/inventory")
      .then(r => r.json())
      .then(d => { setSanPhams(d?.sanPhams || []); })
      .catch(e => console.error(e));
  }

  useEffect(() => { 
    const role = localStorage.getItem('userRole') || '';
    setUserRole(role);
    fetchData();
    fetchSanPhams(); 
    fetchCerts();
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    if (form.ngayLayMau && form.ngayPhanTich) {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // end of today
      const sampleDate = new Date(form.ngayLayMau + 'T00:00:00');
      const resultDate = new Date(form.ngayPhanTich + 'T00:00:00');

      if (sampleDate > today) {
        showToast(t("hk_err_future_sample"), false);
        return;
      }
      if (resultDate < sampleDate) {
        showToast(t("hk_err_result_before_sample"), false);
        return;
      }
    }
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/haukiem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("hk_err_unknown"));
      showToast(t("hk_success_add"), true);
      addLog({
        action: "Tải lên kết quả hậu kiểm",
        user: localStorage.getItem('userName') || 'Người dùng',
        ip: "10.0.0.5",
        status: form.ketQua === 'dambao' ? 'success' : 'warning'
      });
      setModal(false);
      setForm({ ketQua: 'dambao', doiTuongLayMau: 'doanhnghiep' });
      fetchData();
    } catch (e: any) {
      showToast("✗ " + e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch("/api/certificates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi duyệt');
      showToast(action === 'approve' ? 'Đã phê duyệt chứng nhận' : 'Đã từ chối chứng nhận', true);
      fetchCerts();
    } catch (e: any) {
      showToast("✗ " + e.message, false);
    }
  };

  const handleVerifyHauKiem = async () => {
    if (!verifyModal) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/haukiem', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: verifyModal.hk.id, action: verifyModal.action, ghiChuAdmin: verifyNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi xác minh');
      const label = verifyModal.action === 'verify' ? '✓ Đã xác minh kết quả hậu kiểm' : '✓ Đã từ chối kết quả hậu kiểm';
      showToast(label, true);
      if (verifyModal.action === 'verify' && verifyModal.hk.ketQua === 'khongdambao') {
        showToast('⚠️ Đã tạo cảnh báo Nghiêm trọng vì kết quả vượt ngưỡng!', false);
      }
      setVerifyModal(null);
      setVerifyNote('');
      fetchData();
    } catch (e: any) {
      showToast('✗ ' + e.message, false);
    } finally {
      setVerifying(false);
    }
  };

  const doiTuongLabel = (dt: string) => {
    switch (dt) {
      case 'doanhnghiep': return t("hk_entity_biz");
      case 'nguoitieudung': return t("hk_entity_consumer");
      case 'doituongthu3': return t("hk_entity_3rd");
      default: return dt;
    }
  }

  const statusBadge = (st: string) => {
    switch (st) {
      case "verified": return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">{t("hk_verified")}</span>;
      case "pending": return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">{t("hk_pending")}</span>;
      case "rejected": return <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">{t("hk_rejected")}</span>;
      default: return null;
    }
  }

  const paginatedHk = data.slice((pageHk - 1) * ITEMS_PER_PAGE, pageHk * ITEMS_PER_PAGE);
  const paginatedCerts = certs.slice((pageCert - 1) * ITEMS_PER_PAGE, pageCert * ITEMS_PER_PAGE);

  return (
    <div className="flex transparent font-body ">
      

      <main className="mx-auto max-w-7xl w-full flex-1 p-8 lg:p-12 overflow-x-hidden min-h-[calc(100vh-80px)] transparent">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <p className="font-label text-xs font-bold text-primary tracking-[0.2em] uppercase mb-2">{t("hk_label")}</p>
            <h1 className="font-headline text-4xl font-extrabold text-white tracking-tight">{t("qual_post")}</h1>
            
            <div className="flex gap-4 mt-6 border-b border-white/10 pb-1">
              <button onClick={() => setActiveTab('haukiem')} className={`pb-2 px-2 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'haukiem' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'}`}>
                Kết quả Phân tích
              </button>
              <button onClick={() => setActiveTab('certs')} className={`pb-2 px-2 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'certs' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'}`}>
                Chứng nhận Chất lượng
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModal(true)}
              className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Upload Kết quả Phân tích
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : activeTab === 'haukiem' ? (
          !data.length ? (
            <div className="flex flex-col items-center justify-center h-80 bg-white/5 glass-panel text-white rounded-3xl border border-dashed border-white/20 gap-4">
              <span className="material-symbols-outlined text-5xl text-slate-300">biotech</span>
              <p className="text-slate-300 font-bold">{t("hk_no_data")}</p>
              <p className="text-sm text-slate-400">{t("hk_no_data_sub")}</p>
              <button onClick={() => setModal(true)}
                className="mt-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition">
                + Tải lên Kết quả
              </button>
            </div>
          ) : (
            <div className="bg-white/5 glass-panel text-white rounded-3xl shadow-sm border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1000px]">
                <thead>
                  <tr className="transparent text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 sm:px-6 py-4 min-w-[280px]">{t("hk_col_product")}</th>
                    <th className="px-4 sm:px-6 py-4">{t("hk_col_lab")}</th>
                    <th className="px-4 sm:px-6 py-4">{t("hk_col_entity")}</th>
                    <th className="px-4 sm:px-6 py-4">{t("hk_col_result")}</th>
                    <th className="px-4 sm:px-6 py-4 whitespace-nowrap">{t("hk_col_verify")}</th>
                     {userRole === 'admin' && (
                       <th className="px-4 sm:px-6 py-4 whitespace-nowrap">Hành động</th>
                     )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedHk.map(hk => (
                    <tr key={hk.id} className="hover:transparent/70 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        {hk.sanPham ? (
                          <>
                            <p className="font-bold text-sm">{hk.sanPham.ten}</p>
                            <p className="text-xs text-slate-300 font-mono mt-0.5">{hk.sanPham.maSKU}</p>
                          </>
                        ) : <p className="text-slate-400 text-sm italic">{t("hk_unknown")}</p>}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <p className="text-sm font-semibold whitespace-nowrap">{hk.coSoPhanTich}</p>
                        <p className="text-xs text-slate-300 mt-0.5 whitespace-nowrap">{new Date(hk.ngayPhanTich).toLocaleDateString("vi-VN")}</p>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-200 whitespace-nowrap">
                           <span className="material-symbols-outlined text-sm">{hk.doiTuongLayMau === 'nguoitieudung' ? 'person' : hk.doiTuongLayMau === 'doanhnghiep' ? 'business' : 'local_police'}</span>
                           {doiTuongLabel(hk.doiTuongLayMau)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {hk.ketQua === 'dambao' ? (
                          <div className="flex items-center gap-1 text-emerald-400 text-sm font-bold whitespace-nowrap">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Đạt chuẩn
                          </div>
                        ) : (
                          <div className="flex flex-col items-start text-red-400 text-sm font-bold">
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              Vuợt ngưỡng
                            </div>
                            <p className="text-[10px] text-red-400 font-normal mt-1 max-w-[120px] leading-tight">{hk.chiTieuVuotNguong}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                         {statusBadge(hk.trangThaiXacMinh)}
                      </td>
                      {userRole === 'admin' && (
                        <td className="px-4 sm:px-6 py-4">
                          {hk.trangThaiXacMinh === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setVerifyModal({ hk, action: 'verify' }); setVerifyNote(''); }}
                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition whitespace-nowrap flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[13px]">verified</span>
                                Xác minh
                              </button>
                              <button
                                onClick={() => { setVerifyModal({ hk, action: 'reject' }); setVerifyNote(''); }}
                                className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/25 transition whitespace-nowrap flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[13px]">cancel</span>
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Đã xử lý</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center gap-4 p-4 border-t border-white/10">
                <button onClick={() => setPageHk(p => Math.max(1, p - 1))} disabled={pageHk === 1} className="px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30">Trước</button>
                <span className="text-slate-400 text-sm">Trang {pageHk} / {Math.ceil(data.length / ITEMS_PER_PAGE)}</span>
                <button onClick={() => setPageHk(p => Math.min(Math.ceil(data.length / ITEMS_PER_PAGE), p + 1))} disabled={pageHk === Math.ceil(data.length / ITEMS_PER_PAGE)} className="px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30">Sau</button>
              </div>
            )}

            </div>
          )
        ) : (
          <div className="space-y-6">
            {certs.map(cn => (
            <div key={cn.id} className="bg-white/5 glass-panel text-white rounded-3xl shadow-sm border border-white/10 overflow-hidden flex flex-col md:flex-row">
                {/* Certificate image — always show area */}
                <div className="w-full md:w-44 shrink-0 bg-black/20 flex items-center justify-center min-h-[140px] md:min-h-full">
                  {cn.hinhAnhUrl ? (
                    <img
                      src={cn.hinhAnhUrl}
                      alt={cn.soChungNhan}
                      className="w-full h-44 md:h-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        el.parentElement!.innerHTML = `<div class="flex flex-col items-center justify-center p-4 text-slate-400 text-center">
                          <span class="material-symbols-outlined text-4xl mb-2">workspace_premium</span>
                          <p class="text-xs">Không tải được ảnh</p>
                        </div>`;
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-slate-400 text-center">
                      <span className="material-symbols-outlined text-4xl mb-2">workspace_premium</span>
                      <p className="text-xs">Chưa có ảnh</p>
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold text-[10px] tracking-widest uppercase rounded-full border border-emerald-500/20">{cn.loai}</span>
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full border ${cn.trangThaiDuyet === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : cn.trangThaiDuyet === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {cn.trangThaiDuyet === 'approved' ? 'Đã duyệt' : cn.trangThaiDuyet === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                      </span>
                    </div>
                    <h3 className="font-headline font-bold text-xl text-white mb-1">{cn.soChungNhan}</h3>
                    <p className="text-sm text-slate-300 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">business</span> {cn.sanPham?.doanhNghiep?.ten} — SP: {cn.sanPham?.ten}</p>
                    <p className="text-xs text-slate-400 mt-2">Cấp bởi: {cn.toChucCap || 'N/A'}</p>
                    <p className="text-xs text-slate-400 mt-1">Hạn: {new Date(cn.ngayCap).toLocaleDateString()} - {new Date(cn.ngayHetHan).toLocaleDateString()}</p>
                  </div>
                  {cn.hinhAnhUrl && (
                    <a href={cn.hinhAnhUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition self-start border border-white/20">
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      Xem ảnh chứng nhận
                    </a>
                  )}
                  
                  {cn.trangThaiDuyet === 'pending' && typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                      <button onClick={() => handleApprove(cn.id, 'approve')} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition">Phê duyệt</button>
                      <button onClick={() => handleApprove(cn.id, 'reject')} className="px-4 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30 rounded-lg text-sm font-bold transition">Từ chối</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white/5 glass-panel text-white rounded-3xl shadow-2xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-headline">{t("hk_upload_btn")}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("hk_field_product")}</label>
                <select value={form.sanPhamId || ""} onChange={e => setForm(f => ({ ...f, sanPhamId: e.target.value }))}
                  className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition bg-white/5 glass-panel text-white">
                  <option value="">{t("hk_select_product")}</option>
                  {sanPhams.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.ten} ({sp.maSKU})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("hk_field_lab")}</label>
                    <input value={form.coSoPhanTich || ""} onChange={e => setForm(f => ({ ...f, coSoPhanTich: e.target.value }))}
                      className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      placeholder="VD: Viện kiểm nghiệm quốc gia..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("hk_field_sender")}</label>
                    <select value={form.doiTuongLayMau} onChange={e => setForm(f => ({ ...f, doiTuongLayMau: e.target.value }))}
                      className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition bg-white/5 glass-panel text-white">
                      <option value="doanhnghiep">{t("hk_entity_biz")}</option>
                      <option value="nguoitieudung">{t("hk_entity_consumer")}</option>
                      <option value="doituongthu3">{t("hk_entity_3rd")}</option>
                    </select>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("hk_field_sample_date")}</label>
                  <input type="date" value={form.ngayLayMau || ""} onChange={e => setForm(f => ({ ...f, ngayLayMau: e.target.value }))}
                    className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("hk_field_result_date")}</label>
                  <input type="date" value={form.ngayPhanTich || ""} onChange={e => setForm(f => ({ ...f, ngayPhanTich: e.target.value }))}
                    className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("hk_field_result_summary")}</label>
                <div className="flex gap-4">
                   <label className="flex items-center gap-2">
                      <input type="radio" name="ketQua" value="dambao" checked={form.ketQua === 'dambao'} onChange={e => setForm(f => ({ ...f, ketQua: e.target.value }))} />
                      <span className="text-sm font-semibold text-emerald-700">{t("hk_result_pass")}</span>
                   </label>
                   <label className="flex items-center gap-2">
                      <input type="radio" name="ketQua" value="khongdambao" checked={form.ketQua === 'khongdambao'} onChange={e => setForm(f => ({ ...f, ketQua: e.target.value }))} />
                      <span className="text-sm font-semibold text-red-700">{t("hk_result_fail")}</span>
                   </label>
                </div>
              </div>

              {form.ketQua === 'khongdambao' && (
                 <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("hk_field_exceed")}</label>
                     <textarea value={form.chiTieuVuotNguong || ""} onChange={e => setForm(f => ({ ...f, chiTieuVuotNguong: e.target.value }))}
                       className="w-full border border-red-400/60 rounded-xl px-4 py-3 text-sm bg-red-950/30 text-red-200 placeholder:text-red-400/60 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 transition resize-none"
                       rows={2} placeholder="Nêu rõ chất phân tích nào vượt ngưỡng bao nhiêu..." />
                  </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setModal(false)}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-200 hover:transparent transition">
                Huỷ
              </button>
              <button onClick={handleSubmit} disabled={submitting || !form.ngayPhanTich || !form.sanPhamId || !form.coSoPhanTich}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>}
                Lưu Hệ thống
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Admin Verify Modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setVerifyModal(null)}>
          <div className="bg-[#0f1e33] border border-white/10 rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${verifyModal.action === 'verify' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <span className={`material-symbols-outlined ${verifyModal.action === 'verify' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {verifyModal.action === 'verify' ? 'verified' : 'cancel'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {verifyModal.action === 'verify' ? 'Xác minh Kết quả Hậu kiểm' : 'Từ chối Kết quả Hậu kiểm'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{verifyModal.hk.sanPham?.ten ?? 'Không rõ sản phẩm'}</p>
              </div>
            </div>

            {/* Result badge */}
            {verifyModal.hk.ketQua === 'khongdambao' && verifyModal.action === 'verify' && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex gap-2">
                <span className="material-symbols-outlined text-[15px] shrink-0 text-red-400">warning</span>
                <span>Kết quả này <strong>VƯỢT NGƯỠNG</strong>. Xác minh sẽ tự động tạo Cảnh báo Nghiêm trọng trong hệ thống!</span>
              </div>
            )}

            <div className="mb-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1.5">Thông tin phân tích</p>
              <p className="text-sm text-white font-semibold">{verifyModal.hk.coSoPhanTich}</p>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(verifyModal.hk.ngayPhanTich).toLocaleDateString('vi-VN')}</p>
              {verifyModal.hk.chiTieuVuotNguong && (
                <p className="text-xs text-red-400 mt-1">Chỉ tiêu vượt: {verifyModal.hk.chiTieuVuotNguong}</p>
              )}
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Ghi chú của Admin (tùy chọn)
              </label>
              <textarea
                value={verifyNote}
                onChange={e => setVerifyNote(e.target.value)}
                rows={3}
                placeholder={verifyModal.action === 'verify' ? 'VD: Đã kiểm tra tài liệu gốc, xác nhận hợp lệ...' : 'VD: Tài liệu không đầy đủ, cần bổ sung thêm...'}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setVerifyModal(null)}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">
                Hủy
              </button>
              <button onClick={handleVerifyHauKiem} disabled={verifying}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 ${verifyModal.action === 'verify' ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`}>
                {verifying && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                {verifyModal.action === 'verify' ? 'Xác nhận Xác minh' : 'Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-sm transition-all ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
