"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyWizardPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Form State
  const [kenhMua, setKenhMua] = useState("");
  const [tinhTrang, setTinhTrang] = useState<string[]>([]);
  const [tinhTrangKhac, setTinhTrangKhac] = useState("");
  const [photos, setPhotos] = useState<Record<string, { url: string; name: string }>>({});
  const uploadedPhotoCount = Object.keys(photos).length;
  const photoFields = [
    { id: "front", label: lang === 'en' ? "Front" : "Mặt trước SP" },
    { id: "back", label: lang === 'en' ? "Back" : "Mặt sau SP" },
    { id: "stamp", label: lang === 'en' ? "Stamp" : "Tem chống giả" },
    { id: "expiry", label: lang === 'en' ? "Expiry/MFG" : "Vị trí NSX/HSD" },
    { id: "barcode", label: lang === 'en' ? "Barcode" : "Mã vạch/QR" },
  ];

  const handlePhotoUpload = async (photoId: string, file?: File | null) => {
    if (!file) return;
    setUploadError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError(lang === 'en' ? "Only JPG, PNG or WebP images are allowed." : "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(lang === 'en' ? "Image must be 5MB or smaller." : "Ảnh không được vượt quá 5MB.");
      return;
    }

    setUploadingPhoto(photoId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "report");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setPhotos(prev => ({
        ...prev,
        [photoId]: { url: data.url, name: file.name },
      }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : (lang === 'en' ? "Upload failed." : "Tải ảnh thất bại."));
    } finally {
      setUploadingPhoto(null);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
  };
  
  const steps = [
    { num: 1, title: lang === 'en' ? "Purchase Channel" : "Kênh Mua Hàng" },
    { num: 2, title: lang === 'en' ? "Product Status" : "Tình Trạng SP" },
    { num: 3, title: lang === 'en' ? "Upload Photos" : "Tải Lên Ảnh" },
    { num: 4, title: lang === 'en' ? "Confirm" : "Xác Nhận" },
  ];

  const statusOptions = [
    { id: "nguyen_seal", label: lang === 'en' ? "Brand new, sealed" : "Nguy\u00ean seal, ch\u01b0a b\u00f3c h\u1ed9p" },
    { id: "mo_hop", label: lang === 'en' ? "Opened but unused" : "\u0110\u00e3 m\u1edf h\u1ed9p nh\u01b0ng ch\u01b0a s\u1eed d\u1ee5ng" },
    { id: "hu_hong", label: lang === 'en' ? "Damaged packaging/seal" : "Bao b\u00ec h\u01b0 h\u1ecfng, tem r\u00e1ch" },
    { id: "khong_co_tem", label: lang === 'en' ? "No anti-counterfeit stamp" : "Kh\u00f4ng c\u00f3 tem ch\u1ed1ng gi\u1ea3" },
    { id: "gia_bat_thuong", label: lang === 'en' ? "Suspiciously low price" : "Gi\u00e1 qu\u00e1 r\u1ebb b\u1ea5t th\u01b0\u1eddng" },
  ];
  const toggleTinhTrang = (id: string) => {
    setTinhTrang(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };
  const statusLabelMap = Object.fromEntries(statusOptions.map(item => [item.id, item.label]));
  const tinhTrangKhacTrimmed = tinhTrangKhac.trim();
  const hasTinhTrang = tinhTrang.length > 0 || tinhTrangKhacTrimmed.length > 0;
  const tinhTrangPayload = [
    ...tinhTrang,
    ...(tinhTrangKhacTrimmed ? [`khac:${tinhTrangKhacTrimmed}`] : []),
  ].join("|");
  const tinhTrangSummary = [
    ...tinhTrang.map(id => statusLabelMap[id] || id),
    ...(tinhTrangKhacTrimmed ? [tinhTrangKhacTrimmed] : []),
  ].join(", ");

  return (
    <div className="verify-consumer-page verify-page-wizard min-h-screen bg-[#0B1623] pt-24 pb-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          <button type="button" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider font-display">
            {lang === 'en' ? 'Report Suspicious Product' : 'Báo Cáo Sản Phẩm Nghi Vấn'}
          </h1>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-4 relative mb-12">
          {steps.map((s, index) => (
            <div key={s.num} className="relative flex flex-col items-center gap-2 min-w-0">
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-5 left-[calc(50%+28px)] right-[calc(-50%+28px)] h-1 rounded-full transition-colors duration-500 ${
                    step > s.num ? "bg-[#C8A557]" : "bg-white/10"
                  }`}
                />
              )}
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-300 ${
                step >= s.num 
                  ? 'bg-[#0B1623] border-[#C8A557] text-[#C8A557] shadow-[0_0_15px_rgba(200,165,87,0.3)]' 
                  : 'bg-[#0B1623] border-white/20 text-slate-500'
              }`}>
                {step > s.num ? <span className="material-symbols-outlined text-[20px]">check</span> : s.num}
              </div>
              <span className={`relative z-10 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center leading-tight px-1 ${step >= s.num ? 'text-white' : 'text-slate-500'}`}>{s.title}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden min-h-[400px] flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8A557]/5 blur-[80px] rounded-full pointer-events-none"></div>
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex-1">
              <h2 className="text-xl font-bold text-white mb-6">1. {lang === 'en' ? 'Where did you buy this product?' : 'Bạn mua sản phẩm này ở đâu?'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { id: "sieu_thi", icon: "storefront", label: lang === 'en' ? "Supermarket" : "Siêu thị" },
                  { id: "tap_hoa", icon: "local_convenience_store", label: lang === 'en' ? "Grocery Store" : "Tạp hóa" },
                  { id: "tmdt", icon: "shopping_cart", label: lang === 'en' ? "E-commerce" : "Sàn TMĐT" },
                  { id: "livestream", icon: "live_tv", label: lang === 'en' ? "Livestream" : "Livestream" },
                  { id: "cho", icon: "store", label: lang === 'en' ? "Local Market" : "Chợ truyền thống" },
                  { id: "khong_ro", icon: "help", label: lang === 'en' ? "Unknown" : "Không rõ/Được tặng" },
                ].map(k => (
                  <button 
                    key={k.id}
                    onClick={() => setKenhMua(k.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                      kenhMua === k.id 
                        ? 'border-[#C8A557] bg-[#C8A557]/10 text-[#C8A557] scale-105 shadow-[0_0_20px_rgba(200,165,87,0.15)]' 
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-3xl">{k.icon}</span>
                    <span className="text-sm font-bold">{k.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex-1">
              <h2 className="text-xl font-bold text-white mb-2">2. {lang === 'en' ? 'What is the current status of the product?' : 'T\u00ecnh tr\u1ea1ng hi\u1ec7n t\u1ea1i c\u1ee7a s\u1ea3n ph\u1ea9m ra sao?'}</h2>
              <p className="text-sm text-slate-400 mb-6">
                {lang === 'en' ? 'You can choose multiple signs and add another note.' : 'C\u00f3 th\u1ec3 ch\u1ecdn nhi\u1ec1u d\u1ea5u hi\u1ec7u v\u00e0 nh\u1eadp th\u00eam m\u1ee5c kh\u00e1c.'}
              </p>
              <div className="space-y-3">
                {statusOptions.map(t => {
                  const checked = tinhTrang.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTinhTrang(t.id)}
                      className={`w-full p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                        checked
                          ? 'border-[#C8A557] bg-[#C8A557]/10 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-bold text-left">{t.label}</span>
                      <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                        checked ? "border-[#C8A557] bg-[#C8A557] text-[#0B1623]" : "border-white/20 text-transparent"
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      </span>
                    </button>
                  );
                })}
                <div className={`rounded-xl border p-4 transition-all ${tinhTrangKhac ? 'border-[#C8A557] bg-[#C8A557]/10' : 'border-white/10 bg-white/5'}`}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    {lang === 'en' ? 'Other issue' : 'M\u1ee5c kh\u00e1c'}
                  </label>
                  <textarea
                    value={tinhTrangKhac}
                    onChange={(e) => setTinhTrangKhac(e.target.value.slice(0, 300))}
                    maxLength={300}
                    rows={3}
                    placeholder={lang === 'en' ? 'Describe another sign you noticed...' : 'Nh\u1eadp d\u1ea5u hi\u1ec7u kh\u00e1c m\u00e0 b\u1ea1n ph\u00e1t hi\u1ec7n...'}
                    className="w-full resize-none rounded-lg border border-white/10 bg-[#0B1623]/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#C8A557]"
                  />
                  <div className="mt-1 text-right text-[10px] text-slate-500">{tinhTrangKhac.length}/300</div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex-1">
              <h2 className="text-xl font-bold text-white mb-2">3. {lang === 'en' ? 'Upload Evidence Photos' : 'Tải lên hình ảnh bằng chứng'}</h2>
              <p className="text-sm text-slate-400 mb-6">{lang === 'en' ? 'Upload 5 required photos for AI to analyze' : 'Cung cấp 5 góc chụp để hệ thống AI phân tích rủi ro.'}</p>
              
              {uploadError && (
                <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {photoFields.map(p => {
                  const uploaded = photos[p.id];
                  const isUploading = uploadingPhoto === p.id;

                  return (
                    <div key={p.id} className="relative">
                      <input
                        id={`wizard-photo-${p.id}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => handlePhotoUpload(p.id, event.target.files?.[0])}
                      />
                      <label
                        htmlFor={`wizard-photo-${p.id}`}
                        className={`h-28 md:h-32 rounded-xl border-2 border-dashed bg-white/5 p-3 flex flex-col items-center justify-center text-center transition cursor-pointer group ${
                          uploaded
                            ? "border-emerald-400/60 text-emerald-200 bg-emerald-500/10"
                            : "border-white/20 text-slate-500 hover:border-[#C8A557] hover:text-[#C8A557]"
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <span className="material-symbols-outlined text-3xl mb-2 animate-spin">progress_activity</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider">{lang === 'en' ? "Uploading" : "Đang tải"}</span>
                          </>
                        ) : uploaded ? (
                          <>
                            <span className="material-symbols-outlined text-3xl mb-2">check_circle</span>
                            <span className="line-clamp-2 text-[11px] font-bold">{uploaded.name}</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform">add_a_photo</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider">{p.label}</span>
                          </>
                        )}
                      </label>
                      {uploaded && (
                        <button
                          type="button"
                          onClick={() => removePhoto(p.id)}
                          className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-rose-500 text-white shadow-lg flex items-center justify-center hover:bg-rose-400 transition"
                          aria-label={lang === 'en' ? "Remove photo" : "Xóa ảnh"}
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-400">
                {lang === 'en'
                  ? `${uploadedPhotoCount}/5 photos uploaded. Tap a box to choose or replace a photo.`
                  : `Đã tải ${uploadedPhotoCount}/5 ảnh. Bấm vào ô để chọn hoặc thay ảnh.`}
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-emerald-400">gpp_good</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{lang === 'en' ? 'Ready to Submit' : 'Sẵn sàng gửi báo cáo'}</h2>
              <p className="text-slate-400 max-w-md mx-auto mb-8">
                {lang === 'en' 
                  ? 'Your report will be encrypted and sent to our AI system for immediate analysis. We will notify you when the result is available.' 
                  : 'Báo cáo của bạn sẽ được mã hóa và gửi đến hệ thống AI để phân tích ngay lập tức. Chúng tôi sẽ thông báo khi có kết quả.'}
              </p>
              
              <div className="w-full max-w-md bg-[#0B1623] rounded-xl p-4 border border-white/10 text-left space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{lang === 'en' ? 'Channel:' : 'Kênh mua:'}</span>
                  <span className="text-white font-bold">{kenhMua || 'Chưa chọn'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{lang === 'en' ? 'Status:' : 'Tình trạng:'}</span>
                  <span className="text-white font-bold text-right">{tinhTrangSummary || (lang === 'en' ? 'Not selected' : 'Ch\u01b0a ch\u1ecdn')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{lang === 'en' ? 'Photos:' : 'Hình ảnh:'}</span>
                  <span className="text-emerald-400 font-bold">{uploadedPhotoCount}/5 {lang === 'en' ? 'Uploaded' : 'Đã tải lên'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between">
            <button 
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className={`px-6 py-2 rounded-lg font-bold transition ${step === 1 ? 'opacity-50 cursor-not-allowed bg-white/5 text-slate-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {lang === 'en' ? 'Back' : 'Quay lại'}
            </button>
            
            {step < 4 ? (
              <button 
                onClick={() => setStep(Math.min(4, step + 1))}
                disabled={(step === 1 && !kenhMua) || (step === 2 && !hasTinhTrang)}
                className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition ${
                  ((step === 1 && !kenhMua) || (step === 2 && !hasTinhTrang))
                    ? 'opacity-50 cursor-not-allowed bg-white/10 text-slate-400' 
                    : 'bg-gradient-to-r from-[#C8A557] to-[#e7d188] text-[#0B1623] hover:scale-105 shadow-[0_0_15px_rgba(200,165,87,0.3)]'
                }`}
              >
                {lang === 'en' ? 'Next Step' : 'Bước tiếp theo'}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button 
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    const res = await fetch('/api/report/wizard', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        kenhMua,
                        tinhTrangSP: tinhTrangPayload,
                        tinhTrangKhac: tinhTrangKhacTrimmed,
                        moTa: `Bao cao tu Wizard: Kenh - ${kenhMua}, Tinh trang - ${tinhTrangSummary || tinhTrangPayload}`,
                        anhMatTruocUrl: photos.front?.url,
                        anhMatSauUrl: photos.back?.url,
                        anhTemUrl: photos.stamp?.url,
                        anhNSXHSDUrl: photos.expiry?.url,
                        anhBarcodeUrl: photos.barcode?.url,
                        lat: 10.823,
                        lng: 106.629
                      })
                    });
                    if (res.ok) {
                      router.push('/verify/history');
                    } else {
                      alert('Error submitting report');
                      setIsSubmitting(false);
                    }
                  } catch (e) {
                    console.error(e);
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition ${isSubmitting ? 'opacity-50 cursor-not-allowed bg-slate-500 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}
              >
                {isSubmitting ? (lang === 'en' ? 'Submitting...' : 'Đang gửi...') : (lang === 'en' ? 'Submit Report' : 'Gửi Báo Cáo Ngay')}
                {!isSubmitting && <span className="material-symbols-outlined text-[18px]">send</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
