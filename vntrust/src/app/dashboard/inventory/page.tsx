"use client";

import { Toast } from "@/components/Toast";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLogs } from "@/hooks/useLogs";
import { useLanguage } from "@/contexts/LanguageContext";
import DistributionPage from "@/app/dashboard/distribution/page";

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
  const { t, lang } = useLanguage();
  const [data, setData] = useState<InvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"product" | "batch" | "edit" | "delete" | "cert" | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null); // null = thêm mới, có id = sửa
  const [mainTab, setMainTab] = useState<"assets" | "dist">("assets"); // gộp Phân phối vào đây
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<{
    id: string; maLo: string; ngaySanXuat: string; hanDung: string; soLuong: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchSp, setSearchSp] = useState("");
  const [spPage, setSpPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [productToDelete, setProductToDelete] = useState<SanPham | null>(null);
  const { addLog } = useLogs();

  // Form states
  const [form, setForm] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  // ── Lô hàng: chế độ mã (hỏi DN) ──
  const [codeMode, setCodeMode] = useState<"generate" | "import">("generate");
  const [codeType, setCodeType] = useState<"QR" | "Barcode">("QR");
  const [importedCodes, setImportedCodes] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [parsingFile, setParsingFile] = useState(false);

  // Đọc file Excel/CSV → lấy cột mã (cột đầu tiên, bỏ header nếu có)
  const handleCodeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsingFile(true);
    setImportFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      let cells = rows.map(r => String(r?.[0] ?? "").trim()).filter(Boolean);
      // Bỏ dòng tiêu đề nếu ô đầu giống nhãn cột
      if (cells.length && /^(m[ãa]|code|qr|barcode|serial|uid|mã)\b/i.test(cells[0])) cells = cells.slice(1);
      const uniq = [...new Set(cells)];
      setImportedCodes(uniq);
      if (uniq.length === 0) showToast("File không có mã hợp lệ ở cột đầu tiên", false);
      else showToast(`Đã đọc ${uniq.length} mã từ file`, true);
    } catch {
      showToast("Không đọc được file. Chấp nhận .xlsx, .xls, .csv", false);
      setImportedCodes([]); setImportFileName("");
    } finally {
      setParsingFile(false);
      e.target.value = "";
    }
  };

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

  // ── OCR chứng nhận: chọn ảnh → tự điền các trường ──
  const [ocrCert, setOcrCert] = useState(false);
  const toDataUrl = (b: Blob): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b);
  });
  const runCertOCR = async (file: File) => {
    setOcrCert(true);
    try {
      const b64 = await toDataUrl(file);
      const res = await fetch('/api/ocr/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, mode: 'cert' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'OCR lỗi');
      const af = data.autoFillSuggestion || {};
      setForm(f => ({
        ...f,
        loai: af.loai || f.loai,
        soChungNhan: af.soChungNhan || f.soChungNhan,
        toChucCap: af.toChucCap || f.toChucCap,
        ngayCap: af.ngayCap || f.ngayCap,
        ngayHetHan: af.ngayHetHan || f.ngayHetHan,
      }));
      const filled = ['soChungNhan', 'ngayCap', 'ngayHetHan', 'toChucCap'].filter(k => af[k]);
      showToast(filled.length ? `✓ OCR đã điền ${filled.length} trường (tin cậy ${data.confidence?.toFixed?.(0) ?? '?'}%)` : 'OCR xong nhưng chưa đọc được trường nào — vui lòng nhập tay', filled.length > 0);
    } catch (e: any) {
      showToast('OCR lỗi: ' + e.message, false);
    } finally {
      setOcrCert(false);
    }
  };
  const handleCertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleImageChange(e);
    if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024) {
      runCertOCR(file);
    }
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
  // P1b — UI guards theo sub-role nội bộ DN (UC03)
  // Fetch từ /api/auth/me (canonical, không tin cookie vì có thể bị strip)
  const [vaiTroCty, setVaiTroCty] = useState<string | null>(null);
  // Derived perms cho UI — fail-CLOSED nếu unknown (an toàn hơn fail-open)
  // null = đang load, '' = login nhưng không có sub-role (admin/consumer), 'X' = có giá trị
  const subRoleResolved = vaiTroCty !== null;
  const canEdit   = userRole === 'admin' || (subRoleResolved && (vaiTroCty === '' || ['company_admin', 'staff_input'].includes(vaiTroCty)));
  const canDelete = userRole === 'admin' || (subRoleResolved && (vaiTroCty === '' || vaiTroCty === 'company_admin'));

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
    // Fetch canonical sub-role từ server (chính xác hơn cookie)
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(me => setVaiTroCty(me?.vaiTroCty ?? ''))
      .catch(() => setVaiTroCty(''));
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const closeModal = () => {
    setModal(null);
    setProductToDelete(null);
    setEditingProductId(null);
    setForm({});
    setImageFile(null);
    setImagePreview(null);
    setSelectedProduct("");
    setSelectedBatch(null);
    setCodeMode("generate");
    setCodeType("QR");
    setImportedCodes([]);
    setImportFileName("");
  };

  // ── Sửa sản phẩm: mở modal "product" với dữ liệu có sẵn ──
  const openEditProduct = (sp: any) => {
    setEditingProductId(sp.id);
    setForm({ ten: sp.ten || "", moTa: sp.moTa || "", GTIN: sp.GTIN || "", nuocSanXuat: sp.nuocSanXuat || "" });
    setImageFile(null);
    setImagePreview((sp as any).hinhAnhUrl || null);
    setModal("product");
  };

  // ── Xóa sản phẩm (chặn nếu còn lô hàng) ──
  const handleDeleteProduct = (sp: SanPham) => {
    const soLo = sp._count?.loHangs || 0;
    if (soLo > 0) {
      showToast(`Sản phẩm "${sp.ten}" còn ${soLo} lô hàng — hãy xóa hết lô hàng trước.`, false);
      return;
    }
    setProductToDelete(sp);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/product/${productToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi xóa sản phẩm");
      showToast(`✓ Đã xóa sản phẩm ${productToDelete.ten}`, true);
      setProductToDelete(null);
      fetchData();
    } catch (e: any) {
      showToast("✗ " + e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (type: "product" | "batch" | "cert") => {
    if (type === "product") {
      const { ten } = form;
      if (!ten) {
        showToast(t("inv_err_fill_all"), false);
        return;
      }
      // Khi SỬA, ảnh không bắt buộc (giữ ảnh cũ nếu không chọn ảnh mới)
      if (!editingProductId && !imageFile) {
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
      if (!ngaySanXuat || !hanDung) {
        showToast("✗ Vui lòng điền đầy đủ thông tin", false);
        return;
      }
      if (codeMode === "generate" && !soLuong) {
        showToast("✗ Vui lòng nhập số lượng mã cần tạo", false);
        return;
      }
      if (codeMode === "import" && importedCodes.length === 0) {
        showToast("✗ Vui lòng tải lên file chứa danh sách mã", false);
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
      if (codeMode === "generate") {
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
    }

    setSubmitting(true);
    const body: Record<string, any> = { type, ...form };
    if (type === "batch") {
      body.sanPhamId = selectedProduct;
      body.codeMode = codeMode;
      body.codeType = codeType;
      if (codeMode === "import") body.codes = importedCodes;
    }

    // Upload ảnh nếu có (chỉ cho sản phẩm)
    if (type === 'product' && imageFile) {
      const url = await uploadImage();
      if (url) body.hinhAnhUrl = url;
      else { setSubmitting(false); return; }
    }

    // ── SỬA sản phẩm (PATCH) thay vì tạo mới ──
    if (type === 'product' && editingProductId) {
      try {
        const res = await fetch(`/api/inventory/product/${editingProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ten: form.ten, moTa: form.moTa ?? "", GTIN: form.GTIN ?? "", nuocSanXuat: form.nuocSanXuat ?? "",
            ...(body.hinhAnhUrl ? { hinhAnhUrl: body.hinhAnhUrl } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Lỗi sửa sản phẩm");
        showToast(`✓ Đã cập nhật sản phẩm ${json.sanPham.ten}`, true);
        closeModal();
        fetchData();
      } catch (e: any) {
        showToast("✗ " + e.message, false);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi không xác định");
      showToast(type === "product" ? `✓ Lưu thành công: Đã thêm sản phẩm ${json.sanPham.ten}` : `✓ Lưu thành công: Đã tạo lô ${json.loHang.maLo} với ${json.totalUids} mã ${json.codeType || ''} (${json.codeMode === 'import' ? 'đã nhập' : 'tạo tự động'})`, true);
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
      showToast(json.synced === 0 ? t("inv_sync_success_all") : t("inv_sync_success_count").replace("{0}", json.synced.toString()), json.synced >= 0);
      fetchData();
    } catch {
      showToast(t("inv_err_sync"), false);
    } finally {
      setSyncing(false);
    }
  };



  const TabBar = (
    <div className="flex gap-2 mb-8 border-b border-white/10">
      {([
        { k: "assets", icon: "inventory_2", label: lang === "en" ? "Products & Batches" : "Sản phẩm & Lô hàng" },
        { k: "dist",   icon: "local_shipping", label: lang === "en" ? "Distribution & Delivery" : "Phân phối & Giao hàng" },
      ] as const).map(tb => (
        <button key={tb.k} onClick={() => setMainTab(tb.k)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition ${
            mainTab === tb.k ? "border-[#C8A557] text-white" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}>
          <span className="material-symbols-outlined text-[18px]">{tb.icon}</span>
          {tb.label}
        </button>
      ))}
    </div>
  );

  // Tab "Phân phối & Giao hàng" — tái dùng nguyên component Distribution
  if (mainTab === "dist") {
    return (
      <div className="flex flex-col transparent font-body">
        <div className="mx-auto max-w-7xl w-full px-8 lg:px-12 pt-8">{TabBar}</div>
        <DistributionPage />
      </div>
    );
  }

  // ── Lọc sản phẩm theo tên hoặc mã SKU (client-side, không phân biệt hoa thường) ──
  const searchSpQuery = searchSp.trim().toLowerCase();
  const filteredSanPhams = (data?.sanPhams ?? []).filter(sp =>
    !searchSpQuery ||
    sp.ten.toLowerCase().includes(searchSpQuery) ||
    sp.maSKU.toLowerCase().includes(searchSpQuery)
  );

  // ── TC-MFR-004: phân trang danh sách sản phẩm (card lớn → 6/trang) ──
  const SP_PER_PAGE = 6;
  const spPageCount = Math.max(1, Math.ceil(filteredSanPhams.length / SP_PER_PAGE));
  const safeSpPage = Math.min(spPage, spPageCount);
  const pagedSanPhams = filteredSanPhams.slice((safeSpPage - 1) * SP_PER_PAGE, safeSpPage * SP_PER_PAGE);

  return (
    <div className="flex transparent font-body ">




      <main className="mx-auto max-w-7xl w-full flex-1 p-8 lg:p-12 overflow-x-hidden min-h-[calc(100vh-80px)] transparent">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <p className="font-label text-xs font-bold text-primary tracking-[0.2em] uppercase mb-2">{t("inv_title")}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t("inv_sub")}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">

            {userRole !== 'admin' && canEdit && (
              <>
                <button onClick={() => syncStamps()} disabled={syncing || submitting}
                  className="px-3 py-1.5 border border-[#C8A557]/40 rounded-lg text-xs font-bold text-amber-300 hover:bg-[#C8A557]/10 transition flex items-center gap-1.5 disabled:opacity-50">
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
            {/* P1b — Notice cho viewer/warehouse: không thấy nút thêm */}
            {userRole !== 'admin' && !canEdit && vaiTroCty && (
              <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">visibility</span>
                {lang === 'en' ? 'View-only' : 'Chỉ xem'}
              </div>
            )}
          </div>
        </header>

        {TabBar}

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
            {/* ── Tìm kiếm sản phẩm theo tên hoặc SKU ── */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">search</span>
              <input
                value={searchSp}
                onChange={e => { setSearchSp(e.target.value); setSpPage(1); }}
                placeholder="Tìm sản phẩm theo tên hoặc SKU..."
                className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-400 pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              {searchSp && (
                <button
                  type="button"
                  onClick={() => { setSearchSp(""); setSpPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
                  aria-label="Xóa tìm kiếm"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {filteredSanPhams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 bg-white/5 glass-panel text-white rounded-3xl border border-dashed border-white/20 gap-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                <p className="text-slate-300 font-bold">Không tìm thấy sản phẩm phù hợp</p>
                <p className="text-sm text-slate-400">Thử từ khóa khác hoặc xóa bộ lọc.</p>
              </div>
            ) : (
            pagedSanPhams.map(sp => (
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
                        <h3 className="font-bold text-base sm:text-lg text-white font-display leading-snug">{sp.ten}</h3>
                        <p className="text-xs sm:text-sm text-slate-300 mt-0.5">SKU: <span className="font-mono">{sp.maSKU}</span> · {sp.nuocSanXuat || "N/A"}</p>
                        {sp.moTa && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{sp.moTa}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap pl-[52px] sm:pl-0">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold whitespace-nowrap shrink-0">
                        {sp._count.loHangs} {t("inv_batch_count")}
                      </span>
                      {userRole !== 'admin' && canEdit && (
                        <button
                          onClick={() => {
                            const noCert = !sp.chungNhans || sp.chungNhans.length === 0;
                            const certPending = sp.chungNhans?.[0]?.trangThaiDuyet === 'pending';
                            const certRejected = sp.chungNhans?.[0]?.trangThaiDuyet === 'rejected';
                            if (noCert) {
                              if (confirm(`Sản phẩm "${sp.ten}" chưa có chứng nhận.\n\nBấm OK để upload chứng nhận ngay (cần thiết để tạo lô hàng).`)) {
                                setSelectedProduct(sp.id); setModal("cert");
                              }
                              return;
                            }
                            if (certPending) {
                              showToast("Chứng nhận đang chờ Admin phê duyệt. Vui lòng đợi.", false);
                              return;
                            }
                            if (certRejected) {
                              if (confirm(`Chứng nhận đã bị từ chối. Bấm OK để upload lại.`)) {
                                setSelectedProduct(sp.id); setModal("cert");
                              }
                              return;
                            }
                            setSelectedProduct(sp.id);
                            setModal("batch");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                            (!sp.chungNhans || sp.chungNhans.length === 0 || sp.chungNhans[0].trangThaiDuyet !== 'approved')
                              ? "bg-white/5 text-white/40 cursor-not-allowed border border-white/10"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}>
                          <span className="material-symbols-outlined text-sm">add_box</span>
                          {t("inv_add_batch")}
                        </button>
                      )}
                      {sp.chungNhans && sp.chungNhans.length > 0 ? (
                        <div className={`px-3 py-1.5 border rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          sp.chungNhans[0].trangThaiDuyet === 'pending' ? 'bg-[#C8A557]/20 text-[#C8A557] border-[#C8A557]/30' :
                          sp.chungNhans[0].trangThaiDuyet === 'approved' ? 'bg-[#4A7C5C]/20 text-[#6FB585] border-[#4A7C5C]/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          <span className="material-symbols-outlined text-sm">
                            {sp.chungNhans[0].trangThaiDuyet === 'pending' ? 'hourglass_empty' : sp.chungNhans[0].trangThaiDuyet === 'approved' ? 'verified' : 'cancel'}
                          </span>
                          {sp.chungNhans[0].trangThaiDuyet === 'pending' ? 'Đang chờ duyệt' : sp.chungNhans[0].trangThaiDuyet === 'approved' ? 'Đã duyệt' : 'Bị từ chối'}
                        </div>
                      ) : (
                        userRole !== 'admin' && canEdit && (
                          <button onClick={() => { setSelectedProduct(sp.id); setModal("cert"); setForm({loai: 'ISO'}); }}
                            className="px-3 py-1.5 bg-[#4A7C5C]/20 hover:bg-[#4A7C5C]/40 border border-[#4A7C5C]/30 rounded-lg text-xs font-bold text-[#6FB585] transition flex items-center gap-1.5 whitespace-nowrap shrink-0">
                            <span className="material-symbols-outlined text-sm">workspace_premium</span>
                            Upload Chứng nhận
                          </button>
                        )
                      )}
                      {/* #6: Sửa + Xóa sản phẩm */}
                      {userRole !== 'admin' && canEdit && (
                        <button onClick={() => openEditProduct(sp)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 whitespace-nowrap shrink-0">
                          <span className="material-symbols-outlined text-sm">edit</span>
                          {t("common_edit") || "Sửa"}
                        </button>
                      )}
                      {userRole !== 'admin' && canDelete && (
                        <button onClick={() => handleDeleteProduct(sp)}
                          className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/30 border border-red-500/25 rounded-lg text-xs font-bold text-red-400 transition flex items-center gap-1.5 whitespace-nowrap shrink-0">
                          <span className="material-symbols-outlined text-sm">delete</span>
                          {t("common_delete") || "Xóa"}
                        </button>
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
                                      className="w-6 h-6 flex items-center justify-center rounded-full bg-[#C8A557]/20 text-[#C8A557] hover:bg-[#C8A557]/40 transition disabled:opacity-40"
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
                                  {userRole !== 'admin' && !expired && canEdit && (
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
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#C8A557]/15 text-amber-300 border border-[#C8A557]/30 text-xs font-bold rounded-lg hover:bg-[#C8A557]/30 transition"
                                      title={t("common_edit")}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">edit</span>
                                      {t("common_edit")}
                                    </button>
                                  )}
                                  {expired ? (
                                    /* Lô đã hết hạn — disable nút QR, tránh in tem mới cho lô không còn lưu hành */
                                    <span
                                      title={lang === 'en' ? 'Batch expired — QR codes cannot be created or reissued' : 'Lô đã hết hạn — không thể tạo/in mã QR mới'}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-500 border border-white/10 text-xs font-bold rounded-lg cursor-not-allowed select-none"
                                    >
                                      <span className="material-symbols-outlined text-sm">lock</span>
                                      {lang === 'en' ? 'QR locked' : 'Khóa QR'}
                                    </span>
                                  ) : (
                                    <Link href={`/dashboard/inventory/${lo.id}/qr`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition">
                                      <span className="material-symbols-outlined text-sm">qr_code</span>
                                      {t("inv_view_qr")}
                                    </Link>
                                  )}
                                  {userRole !== 'admin' && canDelete && (
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
            ))
            )}

            {/* ── TC-MFR-004: phân trang danh sách sản phẩm ── */}
            {filteredSanPhams.length > SP_PER_PAGE && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button type="button" onClick={() => setSpPage(p => Math.max(1, p - 1))} disabled={safeSpPage <= 1}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>{lang === 'en' ? 'Prev' : 'Trước'}
                </button>
                <span className="text-sm text-slate-300 font-medium">
                  {lang === 'en' ? 'Page' : 'Trang'} {safeSpPage}/{spPageCount}
                  <span className="text-slate-500"> · {filteredSanPhams.length} {lang === 'en' ? 'products' : 'SP'}</span>
                </span>
                <button type="button" onClick={() => setSpPage(p => Math.min(spPageCount, p + 1))} disabled={safeSpPage >= spPageCount}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1">
                  {lang === 'en' ? 'Next' : 'Sau'}<span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal: Sửa lô hàng — pb-[80px] tránh che bởi mobile nav ── */}
      {modal === "edit" && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4 pb-[80px] md:pb-4" onClick={closeModal}>
          <div className="bg-[#142235] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-md max-h-[calc(100dvh-160px)] md:max-h-[88dvh] flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white font-display">{t("inv_edit_batch")}</h2>
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
                className="flex-1 py-3 bg-[#C8A557] hover:bg-[#C8A557] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                <span className="material-symbols-outlined text-[16px]">save</span>
                {t("inv_save_changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Xác nhận xóa sản phẩm ── */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4 pb-[80px] md:pb-4" onClick={() => setProductToDelete(null)}>
          <div className="bg-[#142235] border border-red-500/30 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-md max-h-[calc(100dvh-160px)] md:max-h-[88dvh] flex flex-col overflow-y-auto p-6 md:p-8" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-red-400 text-3xl">delete_forever</span>
              </div>
              <h2 className="text-xl font-bold text-white">Xóa sản phẩm?</h2>
              <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                Bạn đang xóa sản phẩm
                <span className="block mt-1 font-bold text-white">"{productToDelete.ten}"</span>
              </p>
              <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold leading-relaxed text-red-200">
                Hành động này không thể hoàn tác. Chỉ xóa được sản phẩm chưa có lô hàng.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={() => setProductToDelete(null)} disabled={submitting}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition disabled:opacity-50">
                Hủy
              </button>
              <button onClick={confirmDeleteProduct} disabled={submitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Xóa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Xác nhận xóa lô hàng ── */}
      {modal === "delete" && selectedBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4 pb-[80px] md:pb-4" onClick={closeModal}>
          <div className="bg-[#142235] border border-red-500/30 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-sm max-h-[calc(100dvh-160px)] md:max-h-[88dvh] flex flex-col overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
              </div>
              <h2 className="text-xl font-bold text-white">{t("inv_confirm_delete")}</h2>
              <p className="text-slate-400 text-sm mt-2">
                Chỉ lô <span className="font-mono font-bold text-white">{selectedBatch.maLo}</span> và
                <span className="text-red-400 font-bold"> {selectedBatch.soLuong.toLocaleString()} tem QR </span>
                của lô này sẽ bị xóa.
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-1 italic">
                Các lô hàng khác trong cùng sản phẩm KHÔNG bị ảnh hưởng.
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

      {/* ── Modal: Thêm Chứng nhận — sticky footer cho mobile (pb-[80px] tránh che bởi mobile nav) ── */}
      {modal === "cert" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4 pb-[80px] md:pb-4" onClick={closeModal}>
          <div className="bg-[#142235] glass-panel text-white border border-[#4A7C5C]/30 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-lg max-h-[calc(100dvh-160px)] md:max-h-[88dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 pb-3 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold font-display flex items-center gap-2 text-[#6FB585]">
                <span className="material-symbols-outlined">workspace_premium</span> Tải lên Chứng nhận
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-4 overflow-y-auto px-6 py-5 flex-1 min-h-0">
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
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Ảnh Bản scan Chứng nhận <span className="text-[#6FB585] normal-case font-normal">· tải lên để OCR tự điền</span></label>
                <div className="border-2 border-dashed border-[#4A7C5C]/30 rounded-xl p-3 text-center hover:border-[#4A7C5C]/60 transition cursor-pointer relative">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCertImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="preview" className="w-full h-40 object-contain rounded-lg bg-black/20" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <span className="material-symbols-outlined text-3xl text-[#6FB585]/50 block mb-1">document_scanner</span>
                      <p className="text-xs text-slate-400">Nhấn để tải lên ảnh scan/chụp — hệ thống tự đọc & điền</p>
                    </div>
                  )}
                </div>
                {ocrCert ? (
                  <p className="text-xs text-[#6FB585] mt-2 flex items-center gap-1.5"><span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-[#6FB585]"></span> Đang quét OCR & tự điền… (5–10s)</p>
                ) : imageFile ? (
                  <button type="button" onClick={() => imageFile && runCertOCR(imageFile)} className="mt-2 text-xs font-bold text-[#6FB585] hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">document_scanner</span> Quét lại & tự điền
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-white/10 bg-[#142235] shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button onClick={closeModal} className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-200 hover:bg-white/5 transition">Hủy</button>
              <button onClick={() => handleSubmit("cert")} disabled={submitting} className="flex-1 py-3 bg-[#4A7C5C] hover:bg-[#4A7C5C] text-white rounded-xl text-sm font-bold transition flex justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>} Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Thêm Sản phẩm / Lô hàng — sticky footer + pb-[80px] tránh bị che ── */}
      {(modal === "product" || modal === "batch") && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4 pb-[80px] md:pb-4" onClick={closeModal}>
          <div className="bg-[#0B1623] glass-panel text-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-md max-h-[calc(100dvh-160px)] md:max-h-[88dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header — fixed */}
            <div className="flex justify-between items-center p-6 pb-3 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold font-display">
                {modal === "product" ? (editingProductId ? "Sửa sản phẩm" : t("inv_modal_add_product")) : t("inv_modal_add_batch")}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 flex-1 min-h-0 space-y-4">
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
                  {/* ── Nguồn mã: hỏi DN đã có mã chưa ── */}
                  <div className="rounded-xl border border-[#C8A557]/25 bg-[#C8A557]/5 p-4">
                    <label className="block text-xs font-bold text-[#C8A557] uppercase tracking-wider mb-2">Nguồn mã cho lô hàng</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button type="button" onClick={() => setCodeMode("generate")}
                        className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition ${codeMode === "generate" ? "bg-[#C8A557]/15 border-[#C8A557]/50 text-white" : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"}`}>
                        <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                        <span className="text-sm font-bold">Tạo mã tự động</span>
                        <span className="text-[10px] text-slate-400">Chưa có mã — hệ thống tạo</span>
                      </button>
                      <button type="button" onClick={() => setCodeMode("import")}
                        className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition ${codeMode === "import" ? "bg-[#C8A557]/15 border-[#C8A557]/50 text-white" : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"}`}>
                        <span className="material-symbols-outlined text-[20px]">upload_file</span>
                        <span className="text-sm font-bold">Đã có mã (import)</span>
                        <span className="text-[10px] text-slate-400">Tải lên Excel/CSV mã</span>
                      </button>
                    </div>

                    {/* Loại mã */}
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Loại mã</label>
                    <div className="flex gap-2 mb-3">
                      {(["QR", "Barcode"] as const).map(tp => (
                        <button key={tp} type="button" onClick={() => setCodeType(tp)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-bold transition ${codeType === tp ? "bg-[#C8A557] text-[#0B1623] border-[#C8A557]" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                          <span className="material-symbols-outlined text-[16px]">{tp === "QR" ? "qr_code_2" : "barcode"}</span>
                          {tp === "QR" ? "QR Code" : "Barcode"}
                        </button>
                      ))}
                    </div>

                    {codeMode === "generate" ? (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">{t("inv_field_qty")}</label>
                        <input type="number" min="1" max="10000" value={form.soLuong || ""} onChange={e => setForm(f => ({ ...f, soLuong: e.target.value }))}
                          className="w-full border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition bg-white/5 text-white"
                          placeholder="VD: 500" />
                        <p className="text-xs text-slate-400 mt-1">Hệ thống sẽ tạo đúng số lượng mã {codeType} này.</p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">File mã (Excel / CSV)</label>
                        <label className={`flex items-center gap-3 w-full border rounded-xl py-3 px-4 cursor-pointer transition ${importedCodes.length ? "border-[#4A7C5C]/40 bg-[#4A7C5C]/5" : "border-white/15 bg-white/5 hover:border-[#C8A557]/40"}`}>
                          <span className={`material-symbols-outlined text-xl ${importedCodes.length ? "text-[#6FB585]" : "text-amber-400"}`}>{parsingFile ? "hourglass_top" : "table_view"}</span>
                          <span className="text-sm flex-1 truncate text-slate-300">
                            {parsingFile ? "Đang đọc file..." : importedCodes.length ? `✓ ${importFileName} — ${importedCodes.length} mã` : "Chọn file .xlsx / .xls / .csv"}
                          </span>
                          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleCodeFile} />
                        </label>
                        <p className="text-xs text-slate-400 mt-1">Mã nằm ở <b>cột đầu tiên</b>. Hệ thống tự bỏ trùng & dòng tiêu đề.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Sticky footer — luôn visible */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/10 bg-[#0B1623] shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button onClick={closeModal}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-200 hover:bg-white/5 transition">
                {t("common_cancel")}
              </button>
              <button onClick={() => handleSubmit(modal as "product" | "batch")} disabled={submitting}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>}
                {modal === "product" ? (editingProductId ? "Lưu thay đổi" : t("inv_create_product")) : t("inv_create_batch_print")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
