const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventory/page.tsx', 'utf8');

// 1. Add 'cert' to modal types:
// const [modal, setModal] = useState<"product" | "batch" | "edit" | "delete" | null>(null);
const searchModalType = `const [modal, setModal] = useState<"product" | "batch" | "edit" | "delete" | null>(null);`;
const replaceModalType = `const [modal, setModal] = useState<"product" | "batch" | "edit" | "delete" | "cert" | null>(null);`;
code = code.replace(searchModalType, replaceModalType);

// 2. Add handleSubmit cert logic
const searchSubmitCert = `if (type === "batch") {
      if (!selectedProduct) {`;

const certSubmitCode = `
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
        setModal(null);
        setForm({});
        setImageFile(null);
        setImagePreview(null);
        fetchData();
      } catch (e) {
        showToast("✗ " + e.message, false);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (type === "batch") {
      if (!selectedProduct) {`;

code = code.replace(searchSubmitCert, certSubmitCode);

// 3. Add modal body
const searchModalUI = `{/* ── Modal: Thêm Sản phẩm / Lô hàng ── */}
      {(modal === "product" || modal === "batch") && (`;

const replaceModalUI = `{/* ── Modal: Thêm Chứng nhận ── */}
      {modal === "cert" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-[#1a2235] glass-panel text-white border border-emerald-500/30 rounded-3xl shadow-2xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-headline flex items-center gap-2 text-emerald-400">
                <span className="material-symbols-outlined">workspace_premium</span> Tải lên Chứng nhận
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-200">✕</button>
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
                  <input value={form.soChungNhan || ""} onChange={e => setForm(f => ({ ...f, soChungNhan: e.target.value }))} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm" placeholder="VD: ISO9001:2015" />
                </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Tổ chức cấp</label>
                  <input value={form.toChucCap || ""} onChange={e => setForm(f => ({ ...f, toChucCap: e.target.value }))} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm" placeholder="VD: BSI Group" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Ngày cấp</label>
                  <input type="date" value={form.ngayCap || ""} onChange={e => setForm(f => ({ ...f, ngayCap: e.target.value }))} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Ngày hết hạn</label>
                  <input type="date" value={form.ngayHetHan || ""} onChange={e => setForm(f => ({ ...f, ngayHetHan: e.target.value }))} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white" />
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
              <button onClick={() => setModal(null)} className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-200 hover:bg-white/5 transition">Hủy</button>
              <button onClick={() => handleSubmit("cert")} disabled={submitting} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition flex justify-center gap-2">
                {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>} Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Thêm Sản phẩm / Lô hàng ── */}
      {(modal === "product" || modal === "batch") && (`;

code = code.replace(searchModalUI, replaceModalUI);

// Fix TS error in uploadImage function to use proper formData type
const uploadImageSearch = `fd.append('type', 'product');`;
const uploadImageReplace = `fd.append('type', form.soChungNhan ? 'certificate' : 'product');`;
code = code.replace(uploadImageSearch, uploadImageReplace);

fs.writeFileSync('src/app/dashboard/inventory/page.tsx', code);
console.log('Done patch');
