"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLogs } from "@/hooks/useLogs";
import { useLanguage } from "@/contexts/LanguageContext";

interface SanPham {
  id: string;
  maSKU: string;
  ten: string;
  moTa: string | null;
  nuocSanXuat: string | null;
  ngayTao: string;
  loHangs: {
    id: string;
    maLo: string;
    ngaySanXuat: string;
    hanDung: string;
    soLuong: number;
    trangThai: string;
    _count: { uids: number };
  }[];
  _count: { loHangs: number };
  chungNhans?: { loai: string; trangThaiDuyet: string }[];
}

interface InvData {
  doanhNghiep: { id: string; ten: string };
  sanPhams: SanPham[];
}

export default function InventoryPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<InvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"product" | "batch" | "edit" | "delete" | "cert" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<{
    id: string; maLo: string; ngaySanXuat: string; hanDung: string; soLuong: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const { addLog } = useLogs();

  // Form states
  const [form, setForm] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      showToast('Chỉ chấp nhận JPG, PNG hoặc WebP', false); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ảnh quá lớn. Tối đa 5MB', false); return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      fd.append('type', form.soChungNhan ? 'certificate' : 'product');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload thất bại');
      return json.url;
    } catch (e: any) {
      showToast('✗ Upload ảnh: ' + e.message, false);
      return null;
    } finally {
      setUploadingImg(false);
    }
  };

  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/inventory")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { 
    fetchData(); 
    setUserRole(localStorage.getItem("userRole"));
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const closeModal = () => {
    setModal(null);
    setForm({});
    setImageFile(null);
    setImagePreview(null);
    setSelectedProduct("");
    setSelectedBatch(null);
  };

  const handleSubmit = async (type: "product" | "batch" | "cert") => {
    if (type === "product") {
      const { ten } = form;
      if (!ten) {
        showToast(t("inv_err_fill_all"), false);
        return;
      }
      if (!imageFile) {
        showToast("Vui lòng tải lên ảnh sản phẩm", false);
        return;
      }
    }

    
    if (type === "cert") {
      if (!selectedProduct) { showToast('Vui lòng chọn sản phẩm', false); return; }
      const { loai, soChungNhan, ngayCap, ngayHetHan, toChucCap } = form;
      if (!loai || !soChungNhan || !ngayCap || !ngayHetHan || !toChucCap) { showToast('Vui lòng điền đủ thông tin', false); return; }
      if (!imageFile) { showToast('Vui lòng upload ảnh chứng nhận', false); return; }
      
      setSubmitting(true);
      const url = await uploadImage();
      if (!url) { setSubmitting(false); return; }
      
      try {
        const res = await fetch("/api/certificates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sanPhamId: selectedProduct, loai, soChungNhan, ngayCap, ngayHetHan, toChucCap, hinhAnhUrl: url }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Lỗi lưu chứng nhận");
        showToast('✓ Đã tải lên chứng nhận thành công, đang chờ Admin duyệt', true);
        closeModal();
        fetchData();
      } catch (e: any) {
        showToast("✗ " + e.message, false);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (type === "batch") {
      if (!selectedProduct) {
        showToast(t("inv_err_select_product"), false);
        return;
      }
      const { ngaySanXuat, hanDung, soLuong } = form;
      if (!ngaySanXuat || !hanDung || !soLuong) {
        showToast("✗ Vui lòng điền đầy đủ thông tin", false);
        return;
      }
      const sxDate = new Date(ngaySanXuat);
      const offset = new Date().getTimezoneOffset() * 60000;
      const localTodayStr = new Date(Date.now() - offset).toISOString().split("T")[0];

      if (sxDate.getFullYear() < 2000) {
        showToast(t("inv_err_mfg_invalid"), false);
        return;
      }
      if (ngaySanXuat > localTodayStr) {
        showToast(t("inv_err_mfg_future"), false);
        return;
      }
      if (ngaySanXuat >= hanDung) {
        showToast(t("inv_err_mfg_after_exp"), false);
        return;
      }
      // Hạn dùng không được là ngày đã qua
      if (hanDung < localTodayStr) {
        showToast("✗ Hạn dùng không được là ngày đã qua trong quá khứ", false);
        return;
      }
      const qty = Number(soLuong);
      if (!Number.isInteger(qty) || qty <= 0) {
        showToast(t("inv_err_qty_positive"), false);
        return;
      }
      if (qty > 10000) {
        showToast(t("inv_err_qty_max"), false);
        return;
      }
    }

    setSubmitting(true);
    const body: Record<string, string> = { type, ...form };
    if (type === "batch") body.sanPhamId = selectedProduct;

    // Upload ảnh nếu có (chỉ cho sản phẩm)
    if (type === 'product' && imageFile) {
      const url = await uploadImage();
      if (url) body.hinhAnhUrl = url;
      else { setSubmitting(false); return; }
    }

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi không xác định");
      showToast(type === "product" ? `✓ Lưu thành công: Đã thêm sản phẩm ${json.sanPham.ten}` : `✓ Lưu thành công: Đã tạo lô ${json.loHang.maLo} với ${json.totalUids} tem QR`, true);
      addLog({
        action: type === 'product' ? `Tạo sản phẩm: ${json.sanPham.ten}` : `Tạo lô hàng ${json.loHang.maLo}`,
        user: localStorage.getItem('userName') || 'Người dùng',
        status: "success"
      });
      closeModal();
      fetchData();
    } catch (e: any) {
      showToast("✗ " + e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBatch = async () => {
    if (!selectedBatch) return;
    const { ngaySanXuat, hanDung } = form;
    if (!ngaySanXuat || !hanDung) {
      showToast(t("inv_err_fill_dates"), false);
      return;
    }
    // Validate: NSX not in future
    const todayStr = new Date().toISOString().split('T')[0];
    if (ngaySanXuat > todayStr) {
      showToast('✗ Ngày sản xuất không được là ngày trong tương lai', false);
      return;
    }
    // Validate: HSD must be after NSX
    if (hanDung <= ngaySanXuat) {
      showToast('✗ Hạn dùng phải sau ngày sản xuất', false);
      return;
    }
    // Validate: HSD must not be in the past
    if (hanDung < todayStr) {
      showToast('✗ Hạn dùng không được là ngày đã qua trong quá khứ', false);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${selectedBatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ngaySanXuat, hanDung }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi cập nhật");
      showToast(`✓ Đã cập nhật lô ${selectedBatch.maLo}`, true);
      addLog({ action: `Cập nhật lô hàng: ${selectedBatch.maLo}`, user: localStorage.getItem('userName') || 'Người dùng', status: "success" });
      closeModal();
      fetchData();
    } catch (e: any) {
      showToast("✗ " + e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!selectedBatch) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${selectedBatch.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi xóa lô hàng");
      showToast(`✓ ${json.message}`, true);
      addLog({ action: `Xóa lô hàng: ${selectedBatch.maLo}`, user: localStorage.getItem('userName') || 'Người dùng', status: "success" });
      closeModal();
      fetchData();
    } catch (e: any) {
      showToast("✗ " + e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  const syncStamps = async (loHangId?: string) => {
    setSyncing(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loHangId ? { loHangId } : {}),
      });
      const json = await res.json();
      showToast(json.synced > 0
        ? `✓ ${json.message} (${json.results.map((r: any) => `${r.maLo}: ${r.before}→${r.after}`).join(", ")})`
        : `ℹ ${json.message}`, json.synced >= 0);
      fetchData();
    } catch {
      showToast(t("inv_err_sync"), false);
    } finally {
      setSyncing(false);
    }
  };



  return (
    <div className="flex transparent font-body ">
      
      

      
      <main className="mx-auto max-w-7xl w-full flex-1 p-8 lg:p-12 overflow-x-hidden min-h-[calc(100vh-80px)] transparent">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <p className="font-label text-xs font-bold text-primary tracking-[0.2em] uppercase mb-2">{t("inv_title")}</p>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t("inv_sub")}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">

            {userRole !== 'admin' && (
              <>
                <button onClick={() => syncStamps()} disabled={syncing || submitting}
                  className="px-3 py-1.5 border border-amber-500/40 rounded-lg text-xs font-bold text-amber-300 hover:bg-amber-500/10 transition flex items-center gap-1.5 disabled:opacity-50">
                  {syncing
                    ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-amber-300" />
                    : <span className="material-symbols-outlined text-sm">sync</span>}
                  <span className="hidden sm:inline">{t("inv_sync")}</span>
                  <span className="sm:hidden">Sync</span>
                </button>
                <button onClick={() => setModal("product")}
                  className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span className="hidden sm:inline">{t("inv_add_product")}</span>
                  <span className="sm:hidden">{t("inv_field_product")}</span>
                </button>
              </>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : !data?.sanPhams?.length ? (
          <div className="flex flex-col items-center justify-center h-80 bg-white/5 glass-panel text-white rounded-3xl border border-dashed border-white/20 gap-4">
            <span className="material-symbols-outlined text-5xl text-slate-300">inventory_2</span>
            <p className="text-slate-300 font-bold">{t("inv_no_product")}</p>
            {userRole !== 'admin' && (
              <>
                <p className="text-sm text-slate-400">{t("inv_click_add")} {t("inv_add_product")}</p>
                <button onClick={() => setModal("product")}
                  className="mt-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition">
                  + {t("inv_add_product")}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {data.sanPhams.map(sp => (
              <div key={sp.id} className="bg-white/5 glass-panel text-white rounded-3xl shadow-sm border border-white/10 overflow-hidden">
                {/* Product header */}
                <div className="p-4 sm:p-6 border-b border-white/10">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {(sp as any).hinhAnhUrl ? (
                          <img src={(sp as any).hinhAnhUrl} alt={sp.ten} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-primary">inventory_2</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base sm:text-lg text-white font-headline leading-snug">{sp.ten}</h3>
                        <p className="text-xs sm:text-sm text-slate-300 mt-0.5">SKU: <span className="font-mono">{sp.maSKU}</span> · {sp.nuocSanXuat || "N/A"}</p>
                        {sp.moTa && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{sp.moTa}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-[52px] sm:pl-0">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                        {sp._count.loHangs} {t("inv_batch_count")}
                      </span>
                      {userRole !== 'admin' && (
                        <button 
                          onClick={() => { 
                            if (!sp.chungNhans || sp.chungNhans.length === 0 || sp.chungNhans[0].trangThaiDuyet !== 'approved') {
                              showToast("Sản phẩm chưa có chứng nhận hoặc chứng nhận chưa được phê duyệt. Không thể tạo lô hàng.", false);
                              return;
                            }
                            setSelectedProduct(sp.id); 
                            setModal("batch"); 
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            (!sp.chungNhans || sp.chungNhans.length === 0 || sp.chungNhans[0].trangThaiDuyet !== 'approved')
                              ? "bg-white/5 text-white/40 cursor-not-allowed border border-white/10"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}>
                          <span className="material-symbols-outlined text-sm">add_box</span>
                          {t("inv_add_batch")}
                        </button>
                      )}
                      {sp.chungNhans && sp.chungNhans.length > 0 ? (
                        <div className={`px-3 py-1.5 border rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                          sp.chungNhans[0].trangThaiDuyet === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          sp.chungNhans[0].trangThaiDuyet === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          <span className="material-symbols-outlined text-sm">
                            {sp.chungNhans[0].trangThaiDuyet === 'pending' ? 'hourglass_empty' : sp.chungNhans[0].trangThaiDuyet === 'approved' ? 'verified' : 'cancel'}
                          </span>
                          {sp.chungNhans[0].trangThaiDuyet === 'pending' ? 'Đang chờ duyệt' : sp.chungNhans[0].trangThaiDuyet === 'approved' ? 'Đã duyệt' : 'Bị từ chối'}
                        </div>
                      ) : (
                        userRole !== 'admin' && (
                          <button onClick={() => { setSelectedProduct(sp.id); setModal("cert"); setForm({loai: 'ISO'}); }}
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-lg text-xs font-bold text-emerald-400 transition flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">workspace_premium</span>
                            Upload Chứng nhận
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
                {/* Batch list */}
                {sp.loHangs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">{t("inv_empty")}. Thêm lô hàng để tạo tem QR.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="transparent text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="px-6 py-3">{t("inv_batch_code")}</th>
                          <th className="px-6 py-3">{t("inv_mfg_date")}</th>
                          <th className="px-6 py-3">{t("inv_exp_date")}</th>
                          <th className="px-6 py-3">{t("inv_col_qty")}</th>
                          <th className="px-6 py-3">{t("inv_col_qr")}</th>
                          <th className="px-6 py-3">{t("inv_col_status")}</th>
                          <th className="px-6 py-3 text-right">{t("inv_col_actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sp.loHangs.map(lo => {
                          const expired = new Date(lo.hanDung) < new Date();
                          return (
                            <tr key={lo.id} className="hover:transparent/70 transition-colors">
                              <td className="px-6 py-4 font-mono text-sm font-bold">{lo.maLo}</td>
                              <td className="px-6 py-4 text-sm">{new Date(lo.ngaySanXuat).toLocaleDateString("vi-VN")}</td>
                              <td className={`px-6 py-4 text-sm font-bold ${expired ? "text-red-500" : "text-green-700"}`}>
                                {new Date(lo.hanDung).toLocaleDateString("vi-VN")}
                                {expired && <span className="ml-1 text-[10px]">({t("inv_status_exp")})</span>}
                              </td>
                              <td className="px-6 py-4 text-sm">{lo.soLuong.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                {lo._count.uids !== lo.soLuong ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold">
                                      {lo._count.uids} tem
                                    </span>
                                    <button
                                      onClick={() => syncStamps(lo.id)}
                                      disabled={syncing}
                                      title={`Lệch: khai báo ${lo.soLuong} nhưng thực tế ${lo._count.uids} tem. Nhấn để đồng bộ.`}
                                      className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition disabled:opacity-40"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">sync</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                                    {lo._count.uids} tem
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${expired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                                  {expired ? t("inv_status_exp") : t("inv_status_valid")}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {userRole !== 'admin' && !expired && (
                                    <button
                                      onClick={() => {
                                        setSelectedBatch({
                                          id: lo.id,
                                          maLo: lo.maLo,
                                          ngaySanXuat: lo.ngaySanXuat.split('T')[0],
                                          hanDung: lo.hanDung.split('T')[0],
                                          soLuong: lo.soLuong,
                                        });
                                        setForm({
                                          ngaySanXuat: lo.ngaySanXuat.split('T')[0],
                                          hanDung: lo.hanDung.split('T')[0],
                                        });
                                        setModal("edit");
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg hover:bg-amber-500/30 transition"
                                      title={t("common_edit")}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">edit</span>
                                      {t("common_edit")}
                                    </button>
                                  )}
                                  <Link href={`/dashboard/inventory/${lo.id}/qr`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition">
                                    <span className="material-symbols-outlined text-sm">qr_code</span>
                                    {t("inv_view_qr")}
                                  </Link>
                                  {userRole !== 'admin' && (
                                    <button
                                      onClick={() => {
                                        setSelectedBatch({
                                          id: lo.id,
                                          maLo: lo.maLo,
                                          ngaySanXuat: lo.ngaySanXuat,
                                          hanDung: lo.hanDung,
                                          soLuong: lo.soLuong,
                                        });
                                        setModal("delete");
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg hover:bg-red-500/30 transition"
                                      title={t("common_delete")}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">delete</span>
                                      {t("common_delete")}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Modal: Sửa lô hàng ── */}
      {modal === "edit" && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-[#1a2235] border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white font-headline">{t("inv_edit_batch")}</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{selectedBatch.maLo}</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 border border-white/10">
                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">{t("inv_qty_readonly")}</span>
                <span className="font-bold text-white">{selectedBatch.soLuong.toLocaleString()} tem QR</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_mfg_date")}</label>
                  <input type="date" value={form.ngaySanXuat || ""}
                    max={(() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (!form.hanDung) return todayStr;
                      return form.hanDung < todayStr ? form.hanDung : todayStr;
                    })()}
                    onChange={e => setForm(f => ({ ...f, ngaySanXuat: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_exp_date")}</label>
                  <input type="date" value={form.hanDung || ""}
                    min={form.ngaySanXuat || undefined}
                    max="9999-12-31"
                    onChange={e => setForm(f => ({ ...f, hanDung: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={closeModal}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">{t("common_cancel")}</button>
              <button onClick={handleEditBatch} disabled={submitting}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                <span className="material-symbols-outlined text-[16px]">save</span>
                {t("inv_save_changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Xác nhận xóa lô hàng ── */}
      {modal === "delete" && selectedBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-[#1a2235] border border-red-500/30 rounded-3xl shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
              </div>
              <h2 className="text-xl font-bold text-white">{t("inv_confirm_delete")}</h2>
              <p className="text-slate-400 text-sm mt-2">
                Lô <span className="font-mono font-bold text-white">{selectedBatch.maLo}</span> và
                toàn bộ <span className="text-red-400 font-bold">{selectedBatch.soLuong.toLocaleString()} tem QR</span> sẽ bị xóa vĩnh viễn.
              </p>
              <p className="text-xs text-red-400 mt-2 font-bold">{t("inv_irreversible")}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">{t("common_cancel")}</button>
              <button onClick={handleDeleteBatch} disabled={submitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                {t("inv_delete_forever")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Thêm Chứng nhận ── */}
      {modal === "cert" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-[#1a2235] glass-panel text-white border border-emerald-500/30 rounded-3xl shadow-2xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-headline flex items-center gap-2 text-emerald-400">
                <span className="material-symbols-outlined">workspace_premium</span> Tải lên Chứng nhận
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Loại Chứng nhận</label>
                  <select value={form.loai || 'ISO'} onChange={e => setForm(f => ({ ...f, loai: e.target.value }))} className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm bg-white/5 text-white">
                    <option value="ISO">ISO</option>
                    <option value="FDA">FDA</option>
                    <option value="VIETGAP">VietGAP</option>
                    <option value="GLOBALGAP">GlobalGAP</option>
                    <option value="HALAL">Halal</option>
                    <option value="HACCP">HACCP</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Số Chứng nhận</label>
                  <input value={form.soChungNhan || ""} onChange={e => setForm(f => ({ ...f, soChungNhan: e.target.value }))} className="w-full bg-white/5 border border-white/20 text-white rounded-xl px-4 py-3 text-sm" placeholder="VD: ISO9001:2015" />
                </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Tổ chức cấp</label>
                  <input value={form.toChucCap || ""} onChange={e => setForm(f => ({ ...f, toChucCap: e.target.value }))} className="w-full bg-white/5 border border-white/20 text-white rounded-xl px-4 py-3 text-sm" placeholder="VD: BSI Group" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Ngày cấp</label>
                  <input type="date" value={form.ngayCap || ""} max={new Date().toISOString().split('T')[0]} onChange={e => setForm(f => ({ ...f, ngayCap: e.target.value }))} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Ngày hết hạn</label>
                  <input type="date" value={form.ngayHetHan || ""} max="9999-12-31" onChange={e => setForm(f => ({ ...f, ngayHetHan: e.target.value }))} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Ảnh Bản scan Chứng nhận</label>
                <div className="border-2 border-dashed border-emerald-500/30 rounded-xl p-3 text-center hover:border-emerald-500/60 transition cursor-pointer relative">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="preview" className="w-full h-40 object-contain rounded-lg bg-black/20" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <span className="material-symbols-outlined text-3xl text-emerald-400/50 block mb-1">document_scanner</span>
                      <p className="text-xs text-slate-400">Nhấn để tải lên ảnh scan/chụp</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={closeModal} className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-200 hover:bg-white/5 transition">Hủy</button>
              <button onClick={() => handleSubmit("cert")} disabled={submitting} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition flex justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>} Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Thêm Sản phẩm / Lô hàng ── */}
      {(modal === "product" || modal === "batch") && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white/5 glass-panel text-white rounded-3xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-headline">
                {modal === "product" ? t("inv_modal_add_product") : t("inv_modal_add_batch")}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {modal === "product" ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_name")}</label>
                    <input value={form.ten || ""} onChange={e => setForm(f => ({ ...f, ten: e.target.value }))}
                      className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      placeholder="VD: Nước mắm Phú Quốc 35N" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_desc")}</label>
                    <textarea value={form.moTa || ""} onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))}
                      className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none"
                      rows={3} placeholder="Mô tả ngắn về sản phẩm..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">GTIN/Barcode</label>
                      <input value={form.GTIN || ""} onChange={e => setForm(f => ({ ...f, GTIN: e.target.value }))}
                        className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        placeholder="893xxxxxx" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Nước SX</label>
                      <input value={form.nuocSanXuat || ""} onChange={e => setForm(f => ({ ...f, nuocSanXuat: e.target.value }))}
                        className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        placeholder="Việt Nam" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Ảnh Sản phẩm <span className="text-red-400 font-normal">(Bắt buộc)</span></label>
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-3 text-center hover:border-primary/50 transition cursor-pointer relative">
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {imagePreview ? (
                        <div className="relative">
                          <img src={imagePreview} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">✕</button>
                        </div>
                      ) : (
                        <div className="py-3">
                          <span className="material-symbols-outlined text-3xl text-slate-400 block mb-1">add_photo_alternate</span>
                          <p className="text-xs text-slate-400">Nhấn để chọn ảnh · JPG/PNG/WebP · Max 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_product")}</label>
                    <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                      className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition bg-white/5 glass-panel text-white">
                      <option value="">{t("hk_select_product")}</option>
                      {data?.sanPhams.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.ten} ({sp.maSKU})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_mfg_date")}</label>
                      <input type="date" value={form.ngaySanXuat || ""}
                        max={(() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          if (!form.hanDung) return todayStr;
                          return form.hanDung < todayStr ? form.hanDung : todayStr;
                        })()}
                        onChange={e => setForm(f => ({ ...f, ngaySanXuat: e.target.value }))}
                        className="w-full border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_exp_date")}</label>
                      <input type="date" value={form.hanDung || ""}
                        min={form.ngaySanXuat || undefined}
                        max="9999-12-31"
                        onChange={e => setForm(f => ({ ...f, hanDung: e.target.value }))}
                        className="w-full border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_qty")}</label>
                    <input type="number" min="1" max="10000" value={form.soLuong || ""} onChange={e => setForm(f => ({ ...f, soLuong: e.target.value }))}
                      className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      placeholder="VD: 500" />
                    <p className="text-xs text-slate-400 mt-1">{t("inv_auto_qr")}</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={closeModal}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-200 hover:bg-white/5 transition">
                {t("common_cancel")}
              </button>
              <button onClick={() => handleSubmit(modal as "product" | "batch")} disabled={submitting}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>}
                {modal === "product" ? t("inv_create_product") : t("inv_create_batch_print")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-sm transition-all ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
