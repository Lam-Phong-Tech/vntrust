"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import "./result.css";

const readNumberVI = (number: number): string => {
  if (number === 0) return 'không';
  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readBlock(block: number, hasHigher: boolean): string {
    let result = '';
    const h = Math.floor(block / 100);
    const remainder = block % 100;
    const t = Math.floor(remainder / 10);
    const u = remainder % 10;

    if (hasHigher) {
      result += digits[h] + ' trăm ';
      if (remainder === 0) return result.trim();
      if (t === 0) result += 'lẻ ';
    } else if (h > 0) {
      result += digits[h] + ' trăm ';
      if (remainder === 0) return result.trim();
      if (t === 0) result += 'lẻ ';
    }

    if (t === 1) {
      result += 'mười ';
    } else if (t > 1) {
      result += digits[t] + ' mươi ';
    }

    if (t > 0 && u === 1) {
      result += 'mốt';
    } else if (t > 0 && u === 5) {
      result += 'lăm';
    } else if (u > 0) {
      result += digits[u];
    }
    return result.trim();
  }

  let words = '';
  let unitIndex = 0;
  while (number > 0) {
    const block = number % 1000;
    if (block > 0) {
      const blockWords = readBlock(block, number > 999);
      words = blockWords + (units[unitIndex] ? ' ' + units[unitIndex] : '') + (words ? ' ' + words : '');
    }
    number = Math.floor(number / 1000);
    unitIndex++;
  }
  return words.trim().replace(/^./, str => str.toUpperCase());
};

const readNumberEN = (number: number): string => {
  if (number === 0) return 'zero';
  const belowTwenty = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const scales = ['', 'thousand', 'million', 'billion'];

  let words = '';
  let scaleIdx = 0;
  while (number > 0) {
    const chunk = number % 1000;
    if (chunk > 0) {
      let chunkWords = '';
      const h = Math.floor(chunk / 100);
      const rem = chunk % 100;
      if (h > 0) chunkWords += belowTwenty[h] + ' hundred ';
      if (rem > 0) {
        if (rem < 20) {
          chunkWords += belowTwenty[rem] + ' ';
        } else {
          chunkWords += tens[Math.floor(rem / 10)] + (rem % 10 > 0 ? '-' + belowTwenty[rem % 10] : '') + ' ';
        }
      }
      words = chunkWords.trim() + ' ' + scales[scaleIdx] + (words ? ' ' + words : '');
    }
    number = Math.floor(number / 1000);
    scaleIdx++;
  }
  return words.trim().replace(/^./, str => str.toUpperCase());
};

export default function VerificationResult() {
  const { uid } = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReportFlow, setShowReportFlow] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // States for report flow
  const [reportPhotos, setReportPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [whereBought, setWhereBought] = useState("Shopee");
  const [priceAmount, setPriceAmount] = useState<number>(0);
  const [priceDisplay, setPriceDisplay] = useState("0");
  const [priceCurrency, setPriceCurrency] = useState<string>(() => lang === 'en' ? 'USD' : 'VND');
  const [reason, setReason] = useState("");

  const CURRENCIES = [
    { code: 'VND', label: 'VNĐ' },
    { code: 'USD', label: 'USD ($)' },
  ];
  const MAX_PRICE = 1_000_000_000;

  const handlePriceInput = (raw: string) => {
    // Chỉ giữ lại các chữ số
    const digitsOnly = raw.replace(/\D/g, '');
    
    // Chuyển sang số, nếu rỗng thì = 0
    const numericValue = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
    
    // Validate Max = 1 tỷ
    const clamped = Math.min(numericValue, MAX_PRICE);
    
    setPriceAmount(clamped);
    // Format hiển thị: thêm dấu '.' phân cách hàng nghìn
    setPriceDisplay(clamped.toLocaleString('vi-VN'));
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    if (reportPhotos.length + newFiles.length > 5) {
      alert(lang === 'en' ? "You can upload a maximum of 5 photos." : "Bạn chỉ được tải lên tối đa 5 ảnh.");
      e.target.value = '';
      return;
    }

    let totalAddedSize = 0;
    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) {
        alert(lang === 'en' ? "Only image files are allowed." : "Chỉ chấp nhận các file ảnh.");
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(lang === 'en' ? `Photo "${file.name}" exceeds 5MB size limit.` : `Ảnh "${file.name}" vượt quá giới hạn 5MB.`);
        e.target.value = '';
        return;
      }
      totalAddedSize += file.size;
    }

    const currentTotalSize = reportPhotos.reduce((sum, f) => sum + f.size, 0);
    if (currentTotalSize + totalAddedSize > 15 * 1024 * 1024) {
      alert(lang === 'en' ? "Total combined size of photos cannot exceed 15MB." : "Tổng dung lượng các ảnh không được vượt quá 15MB.");
      e.target.value = '';
      return;
    }

    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setReportPhotos(prev => [...prev, ...newFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const handleDeletePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setReportPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetch(`/api/verify/${uid}`)
      .then(res => res.json())
      .then(data => { setResult(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [uid]);

  // ── Outer container: dark BG only as tablet "device frame" border;
  //    on mobile (<768px), use ink to match section top bar; on desktop, dark wrapper ──
  const outerCls =
    "min-h-screen w-full bg-[#0B1623] flex items-start justify-center md:pt-10 md:pb-10 lg:items-stretch lg:pt-0 lg:pb-0 lg:h-[calc(100vh-80px)] lg:min-h-[calc(100vh-80px)] lg:max-h-[calc(100vh-80px)] lg:overflow-hidden";

  if (loading) {
    return (
      <div className={outerCls}>
        <div className="s-result-wrapper desktop-responsive flex items-center justify-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
            style={{ borderColor: '#C8A557', borderRightColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  const isFake     = result?.status === "fake" || result?.status === "suspect" || result?.status === "expired";
  const isGenuine  = result?.status === "genuine";
  const isCounterfeit = isFake || !isGenuine;

  const pData   = result?.data || {};
  const loHang  = pData.loHang  || {};
  const sanPham = loHang.sanPham || {};
  const doanhNghiep = sanPham.doanhNghiep || {};

  // ══════════════════════════════════════════════
  // REPORT FLOW
  // ══════════════════════════════════════════════
  if (showReportFlow) {
    return (
      <div className={outerCls}>
        <div className="s-result-wrapper desktop-responsive">
          <section className="s-report">

            {/* Left Column (Hero on Desktop) */}
            <div className="s-report-left">
              {/* Desktop-only warning icon */}
              <div className="s-report-warning lg:flex hidden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9"  x2="12"   y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              
              {/* Desktop-only status label */}
              <div className="s-report-status-label lg:inline-flex hidden">
                <span className="s-report-status-label-dot" />
                {lang === 'en' ? 'Report Violation' : 'Báo cáo vi phạm'}
              </div>

              {/* Top bar */}
              <div className="s-report-top">
                <button className="s-report-back" onClick={() => setShowReportFlow(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="s-report-title">
                  {lang === 'en' ? 'Report Violation' : 'Báo cáo vi phạm'}
                </div>
                <button className="s-report-skip">
                  {lang === 'en' ? 'Save Draft' : 'Lưu nháp'}
                </button>
              </div>

              {/* Progress */}
              <div className="s-report-progress">
                <div className="s-report-progress-info">
                  <div className="s-report-progress-step">
                    {lang === 'en' ? 'Step 2 — Product Info' : 'Bước 2 — Thông tin sản phẩm'}
                  </div>
                  <div className="s-report-progress-num">2 / 2</div>
                </div>
                <div className="s-report-progress-bar">
                  <div className="done" />
                  <div className="active" />
                </div>
              </div>

              {/* Desktop-only subtitle */}
              <div className="s-report-hero-sub lg:block hidden">
                {lang === 'en'
                  ? 'Your detailed report helps AI VeriGoods protect the community and coordinate with authorities to handle fake goods.'
                  : 'Báo cáo chi tiết của bạn giúp AI VeriGoods bảo vệ cộng đồng và phối hợp với cơ quan chức năng để xử lý hàng giả.'}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="s-report-body">
              <h2 className="s-report-heading">
                {lang === 'en' ? 'Image' : 'Bằng chứng'}{' '}
                <em>{lang === 'en' ? 'Evidence' : 'hình ảnh'}</em>
              </h2>
              <p className="s-report-sub">
                {lang === 'en'
                  ? 'Take clear photos of product and packaging. AI will analyze logo, font, materials.'
                  : 'Chụp ảnh sản phẩm và bao bì rõ nét. AI sẽ phân tích logo, font chữ, chất liệu'}
              </p>

              {/* Photo upload */}
              <div className="s-report-field">
                <label className="s-report-field-label">
                  {lang === 'en' ? 'Product Photos' : 'Ảnh sản phẩm'}{' '}
                  <span className="req">*</span>
                </label>
                <div className="s-report-upload">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="s-report-upload-slot has-image">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        className="s-report-photo-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(index);
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {reportPhotos.length < 5 && (
                    <div
                      className="s-report-upload-slot"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="s-report-upload-slot-inner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5"  y1="12" x2="19" y2="12" />
                        </svg>
                        <span className="s-report-upload-slot-mini">
                          {lang === 'en' ? 'Add' : 'Thêm'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Where bought */}
              <div className="s-report-field">
                <label className="s-report-field-label">
                  {lang === 'en' ? 'Where bought' : 'Nơi mua'}{' '}
                  <span className="req">*</span>
                </label>
                <div className="s-report-chips">
                  {[
                    { id: "Shopee", label: "Shopee" },
                    { id: "TikTok Shop", label: "TikTok Shop" },
                    { id: "Local Market", label: lang === 'en' ? 'Local Market' : 'Chợ truyền thống' },
                    { id: "Lazada", label: "Lazada" },
                    { id: "Facebook", label: "Facebook" }
                  ].map((chip) => {
                    const isActive = whereBought === chip.id;
                    return (
                      <span
                        key={chip.id}
                        className={`s-report-chip ${isActive ? 'active' : ''}`}
                        onClick={() => setWhereBought(chip.id)}
                      >
                        {isActive && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {chip.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Price */}
              <div className="s-report-field">
                <label className="s-report-field-label">
                  {lang === 'en' ? 'Price Paid' : 'Giá đã mua'}
                </label>
                <div className="flex gap-2">
                  {/* Ô nhập số - Controlled Input */}
                  <input
                    className="s-report-input"
                    style={{ flex: 1, minWidth: 0 }}
                    type="text"
                    inputMode="numeric"
                    value={priceDisplay}
                    onChange={(e) => handlePriceInput(e.target.value)}
                    onFocus={(e) => {
                      // Khi focus vào ô, nếu đang hiển thị '0' thì xoá đi để người dùng nhập ngay
                      if (priceAmount === 0) setPriceDisplay('');
                    }}
                    onBlur={() => {
                      // Khi blur ra, nếu bỏ trống thì reset về '0'
                      if (priceDisplay === '') {
                        setPriceAmount(0);
                        setPriceDisplay('0');
                      }
                    }}
                  />
                  {/* Combobox chọn tiền tệ */}
                  <select
                    className="s-report-input"
                    style={{ width: 'auto', cursor: 'pointer', flexShrink: 0, paddingLeft: '16px', paddingRight: '16px' }}
                    value={priceCurrency}
                    onChange={(e) => setPriceCurrency(e.target.value)}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Hint dưới ô nhập đọc số thành chữ */}
                <p className="text-[12px] text-amber-400/80 mt-2 pl-1 italic font-medium">
                  {priceAmount > 0
                    ? (lang === 'en' 
                        ? `Value: ${readNumberEN(priceAmount)} ${priceCurrency}` 
                        : `Giá trị: ${readNumberVI(priceAmount)} ${priceCurrency}`)
                    : (lang === 'en' ? 'Enter 0 if unknown' : 'Nhập 0 nếu không rõ giá')
                  }
                </p>
              </div>

              {/* Reason */}
              <div className="s-report-field">
                <label className="s-report-field-label">
                  {lang === 'en' ? 'Reason for suspicion' : 'Lý do nghi ngờ'}
                </label>
                <textarea
                  className="s-report-textarea"
                  maxLength={500}
                  placeholder={lang === 'en' ? 'Brief description...' : 'Mô tả ngắn gọn...'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            {/* CTA — static bottom, no absolute */}
            <div className="s-report-cta">
              <button className="s-report-cta-btn back" onClick={() => setShowReportFlow(false)}>
                {lang === 'en' ? 'Back' : 'Trở lại'}
              </button>
              <button
                className={`s-report-cta-btn next ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                disabled={reportPhotos.length === 0 || loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    
                    // 1. Upload tất cả ảnh bằng chứng
                    const uploadedUrls = [];
                    for (const file of reportPhotos) {
                      const uploadData = new FormData();
                      uploadData.append('file', file);
                      uploadData.append('type', 'report');
                      
                      const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: uploadData
                      });
                      if (uploadRes.ok) {
                        const data = await uploadRes.json();
                        if (data.url) uploadedUrls.push(data.url);
                      }
                    }

                    // 2. Đóng gói metadata JSON
                    const metadata = {
                      giaMua: priceAmount,        // Double, đã validate
                      donViTien: priceCurrency,   // 'VND' | 'USD'
                      viTri: whereBought,
                      lyDo: reason,
                      anhBangChung: uploadedUrls
                    };

                    // 3. Gửi API đến hệ thống báo cáo chung
                    const payload = {
                      serial: String(uid),
                      loaiSanPham: "Từ quét mã QR",
                      viTri: whereBought,
                      metadata: metadata,
                      moTa: `Giá mua: ${priceAmount.toLocaleString('vi-VN')} ${priceCurrency}\nLý do: ${reason}\n(Kèm theo ${uploadedUrls.length} ảnh)`, // Dành cho fallback text
                      mucDo: "high",
                      loaiBaoCao: "an_danh"
                    };
                    
                    const res = await fetch('/api/report', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });

                    if (!res.ok) throw new Error("API failed");

                    setShowSuccessModal(true);
                    setTimeout(() => {
                      router.push('/verify');
                    }, 3000);
                  } catch (e) {
                    console.error("Submit error:", e);
                    alert(lang === 'en' ? 'Failed to submit report. Try again.' : 'Lỗi gửi báo cáo. Vui lòng thử lại.');
                    setLoading(false);
                  }
                }}
              >
                {loading ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block"></span>
                ) : (
                  <>
                    {lang === 'en' ? 'Submit' : 'Gửi báo cáo'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="bg-[#0f1e33] border border-[#4A7C5C]/30 w-full max-w-sm rounded-3xl p-8 text-center shadow-[0_0_40px_rgba(16,185,129,0.15)] transform transition-all">
                  <div className="w-20 h-20 bg-[#4A7C5C]/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-[#4A7C5C]/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" className="w-10 h-10">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {lang === 'en' ? 'Successfully Submitted' : 'Gửi thành công'}
                  </h3>
                  <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                    {lang === 'en' 
                      ? 'Your report has been received. Thank you for protecting the community!' 
                      : 'Báo cáo của bạn đã được ghi nhận. Cảm ơn bạn đã góp phần bảo vệ cộng đồng!'}
                  </p>
                  <button 
                    onClick={() => router.push('/verify')}
                    className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    {lang === 'en' ? 'Return to Home' : 'Quay lại trang chủ'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // COUNTERFEIT / FAKE
  // ══════════════════════════════════════════════
  if (isCounterfeit) {
    return (
      <div className={outerCls}>
        <div className="s-result-wrapper desktop-responsive">
          <section className="s-fake">

            {/* Top bar */}
            <div className="s-fake-top">
              <button className="s-auth-top-btn" onClick={() => router.back()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="s-fake-top-brand">
                VN<span style={{ color: 'rgba(246,241,232,0.7)' }}>Trust</span>
              </div>
              <button className="s-auth-top-btn" onClick={() => {
              const shareUrl = window.location.href;
              const shareTitle = 'Kết quả xác thực AI VeriGoods';
              const shareText = 'Mã UID: ' + uid;
              if ((navigator as any).share) {
                (navigator as any).share({ title: shareTitle, text: shareText, url: shareUrl }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(shareUrl);
                alert('Đã copy liên kết vào clipboard.');
              }
            }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5"  cy="12" r="1" />
                </svg>
              </button>
            </div>

            {/* Hero */}
            <div className="s-fake-hero">
              <div className="s-fake-warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9"  x2="12"   y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="s-fake-status-label">
                <span className="s-fake-status-label-dot" />
                {lang === 'en' ? 'Counterfeit suspected' : 'Có dấu hiệu giả mạo'}
              </div>
              <div className="s-fake-hero-title">
                {lang === 'en' ? 'Product not' : 'Sản phẩm không'}<br />
                {lang === 'en' ? 'authenticated' : 'được xác thực'}
              </div>
              <div className="s-fake-hero-sub">
                {lang === 'en'
                  ? 'UID does not match any genuine product in our database'
                  : 'Mã UID không khớp với bất kỳ sản phẩm chính hãng nào trong cơ sở dữ liệu'}
              </div>
              {/* UID row */}
              <div className="s-fake-uid">
                <div>
                  <div className="s-fake-uid-l">{lang === 'en' ? 'Scanned UID' : 'UID đã quét'}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="s-fake-uid-v">{String(uid).slice(0, 19)}</span>
                    <button
                      className="s-fake-uid-copy"
                      onClick={() => navigator.clipboard.writeText(String(uid))}
                      title={lang === 'en' ? 'Copy UID' : 'Sao chép UID'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="s-fake-uid-l">Confidence</div>
                  <div className="s-fake-uid-v">0.12</div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="s-fake-body">
              {/* Issues */}
              <div className="s-fake-issues">
                <div className="s-fake-issues-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8"  x2="12"   y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {lang === 'en' ? '4 issues detected' : 'Phát hiện 4 dấu hiệu'}
                </div>
                
                {/* Issue 1 */}
                <div className="s-fake-issue">
                  <div className="s-fake-issue-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="s-fake-issue-text">
                    <div className="s-fake-issue-label">
                      {lang === 'en' ? 'UID not found in database' : 'UID không tồn tại trong CSDL'}
                    </div>
                    <div className="s-fake-issue-desc">
                      {lang === 'en' ? 'Identifier was never issued' : 'Mã định danh chưa từng được phát hành'}
                    </div>
                  </div>
                </div>

                {/* Issue 2 */}
                <div className="s-fake-issue">
                  <div className="s-fake-issue-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="s-fake-issue-text">
                    <div className="s-fake-issue-label">
                      {lang === 'en' ? 'AI Vision: logo mismatch' : 'AI Vision: logo không khớp'}
                    </div>
                    <div className="s-fake-issue-desc">
                      {lang === 'en' ? 'Similarity 0.31/1.00 · min threshold 0.85' : 'Độ tương đồng 0.31/1.00 · ngưỡng tối thiểu 0.85'}
                    </div>
                  </div>
                </div>

                {/* Issue 3 */}
                <div className="s-fake-issue">
                  <div className="s-fake-issue-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="s-fake-issue-text">
                    <div className="s-fake-issue-label">
                      {lang === 'en' ? 'Low printing quality packaging' : 'Bao bì in ấn chất lượng thấp'}
                    </div>
                    <div className="s-fake-issue-desc">
                      {lang === 'en' ? 'Signs of re-scanning/printing, aliased text borders' : 'Có dấu hiệu in quét lại, răng cưa viền chữ'}
                    </div>
                  </div>
                </div>

                {/* Issue 4 */}
                <div className="s-fake-issue">
                  <div className="s-fake-issue-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="s-fake-issue-text">
                    <div className="s-fake-issue-label">
                      {lang === 'en' ? '8 reports from other users' : '8 báo cáo từ người dùng khác'}
                    </div>
                    <div className="s-fake-issue-desc">
                      {lang === 'en' ? 'Flagged by the community' : 'Đã được cộng đồng đánh dấu'}
                    </div>
                  </div>
                </div>

              </div>

              {/* Tip */}
              <div className="s-fake-tip">
                <div className="s-fake-tip-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="s-fake-tip-text">
                  <strong>{lang === 'en' ? 'Recommendation' : 'Khuyến cáo'}</strong>
                  {lang === 'en'
                    ? 'Do not use the product. Keep packaging as evidence and report immediately.'
                    : 'Không sử dụng sản phẩm. Lưu lại bao bì làm bằng chứng và báo cáo ngay'}
                </div>
              </div>
            </div>

            {/* CTA — static, no absolute */}
            <div className="s-fake-cta">
              <button className="s-fake-cta-btn" onClick={() => setShowReportFlow(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9"  x2="12"   y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {lang === 'en' ? 'Report violation now' : 'Báo cáo vi phạm ngay'}
              </button>
              <button className="s-fake-cta-link" onClick={() => router.push('/verify/scan')}>
                {lang === 'en' ? 'Scan another product' : 'Quét sản phẩm khác'}
              </button>
            </div>

          </section>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // AUTHENTIC / GENUINE
  // ══════════════════════════════════════════════
  return (
    <div className={outerCls}>
      <div className="s-result-wrapper desktop-responsive">
        <section className="s-auth">

          {/* Top bar */}
          <div className="s-auth-top">
            <button className="s-auth-top-btn" onClick={() => router.back()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="s-auth-top-brand">VN<span>Trust</span></div>
            <button className="s-auth-top-btn" onClick={() => {
              const shareUrl = window.location.href;
              const shareTitle = 'Kết quả xác thực AI VeriGoods';
              const shareText = 'Mã UID: ' + uid;
              if ((navigator as any).share) {
                (navigator as any).share({ title: shareTitle, text: shareText, url: shareUrl }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(shareUrl);
                alert('Đã copy liên kết vào clipboard.');
              }
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5"  r="3" />
                <circle cx="6"  cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
              </svg>
            </button>
          </div>

          {/* Hero */}
          <div className="s-auth-hero">
            {/* Rotating stamp — absolutely positioned top-right */}
            <div className="s-auth-hero-stamp">
              <svg viewBox="0 0 44 44" fill="none">
                <text
                  x="22" y="25" textAnchor="middle"
                  fontFamily="Fraunces" fontSize="8"
                  fill="currentColor" fontWeight="600" letterSpacing="0.05em"
                >VERIFIED</text>
                <path d="M16 24 L20 28 L28 18" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <div className="s-auth-hero-inner">
              {/* Authentic badge */}
              <div className="s-auth-badge">
                <span className="s-auth-badge-dot" />
                <span className="s-auth-badge-text">
                  {lang === 'en' ? 'Authentic' : 'Chính hãng'}
                </span>
              </div>

              {/* Product name — padding-right prevents stamp overlap */}
              {sanPham.ten && (
                <div className="s-auth-product-name">{sanPham.ten}</div>
              )}

              {/* Brand / batch */}
              {(doanhNghiep.ten || loHang.maLo) && (
                <div className="s-auth-product-brand">
                  {doanhNghiep.ten && (
                    <span>{doanhNghiep.ten}</span>
                  )}
                  {doanhNghiep.ten && loHang.maLo && (
                    <span> · </span>
                  )}
                  {loHang.maLo && (
                    <span>{lang === 'en' ? 'Batch' : 'Lô'} #{loHang.maLo}</span>
                  )}
                </div>
              )}

              {/* Confidence ring */}
              <div className="s-auth-conf">
                <div className="s-auth-conf-ring">
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18"
                      stroke="rgba(200,165,87,0.15)" strokeWidth="3" fill="none" />
                    <circle cx="22" cy="22" r="18"
                      stroke="#C8A557" strokeWidth="3" fill="none"
                      strokeDasharray="111 113" strokeLinecap="round"
                      transform="rotate(-90 22 22)" />
                    <text x="22" y="26" textAnchor="middle"
                      fontFamily="Fraunces" fontSize="11" fontWeight="600" fill="#C8A557">
                      98
                    </text>
                  </svg>
                </div>
                <div className="s-auth-conf-text">
                  <div className="s-auth-conf-label">Confidence</div>
                  <div className="s-auth-conf-val">0.98 / 1.00</div>
                  <div className="s-auth-conf-desc">
                    {lang === 'en' ? 'Very High Confidence' : 'Tin cậy rất cao'}
                  </div>
                </div>
              </div>

              {/* UID */}
              <div className="s-auth-uid">
                <div>
                  <div className="s-auth-uid-label">UID</div>
                  <div className="s-auth-uid-val">{String(uid).slice(0, 19)}</div>
                </div>
                <button
                  className="s-auth-uid-copy"
                  onClick={() => navigator.clipboard.writeText(String(uid))}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9"  y="9"  width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Body — scrollable, flex:1 */}
          <div className="s-auth-body">

            {/* ── Product 3D image showcase — Sprint 13 ── */}
            {/* hinhAnhUrl: field upload mới (NSX); hinhAnh: legacy fallback */}
            {(() => {
              const productImg = sanPham.hinhAnhUrl || sanPham.hinhAnh || null;
              return (
                <div className="s-auth-product-3d">
                  <div className="s-auth-product-3d-wrap">
                    {productImg ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={productImg} alt={sanPham.ten || 'Sản phẩm'} />
                    ) : (
                      <div className="s-auth-product-3d-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                          <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {!productImg && (
                    <p style={{ marginTop: 10, fontSize: 11, color: 'rgba(246,241,232,0.4)', fontStyle: 'italic' }}>
                      {lang === 'en' ? 'No product image yet — DN can upload via inventory' : 'Chưa có ảnh sản phẩm — DN có thể upload trong Tài sản'}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* AI Photo Verify CTA — Sprint 13 */}
            <button
              type="button"
              onClick={() => router.push(`/verify/${uid}/photo`)}
              className="s-ai-scan-cta"
            >
              <span className="s-ai-scan-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
              <span className="s-ai-scan-text">
                <span className="s-ai-scan-title">
                  {lang === 'en' ? 'AI Vision Scan' : 'Quét ảnh AI'}
                </span>
                <span className="s-ai-scan-desc">
                  {lang === 'en'
                    ? 'Take a photo — AI compares with reference image'
                    : 'Chụp ảnh sản phẩm thật — AI so sánh với ảnh chính chủ'}
                </span>
              </span>
              <span className="s-ai-scan-arrow" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </button>

            {/* Production info — only render if any field exists */}
            {(loHang.ngaySanXuat || loHang.hanDung || sanPham.xuatXu || loHang.soToKhaiHQ) && (
              <div className="s-auth-section">
                <div className="s-auth-section-head">
                  <div className="s-auth-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    </svg>
                  </div>
                  <div className="s-auth-section-title">
                    {lang === 'en' ? 'Production & Logistics' : 'Sản xuất & Vận chuyển'}
                  </div>
                </div>

                {loHang.ngaySanXuat && (
                  <div className="s-auth-row">
                    <div className="s-auth-row-label">
                      {lang === 'en' ? 'MFG Date' : 'Ngày SX'}
                    </div>
                    <div className="s-auth-row-val">
                      {new Date(loHang.ngaySanXuat).toLocaleDateString(
                        lang === 'en' ? 'en-US' : 'vi-VN'
                      )}
                    </div>
                  </div>
                )}

                {loHang.hanDung && (
                  <div className="s-auth-row">
                    <div className="s-auth-row-label">
                      {lang === 'en' ? 'EXP Date' : 'Hạn dùng'}
                    </div>
                    <div className="s-auth-row-val">
                      {new Date(loHang.hanDung).toLocaleDateString(
                        lang === 'en' ? 'en-US' : 'vi-VN'
                      )}
                    </div>
                  </div>
                )}

                {sanPham.xuatXu && (
                  <div className="s-auth-row">
                    <div className="s-auth-row-label">
                      {lang === 'en' ? 'Origin' : 'Xuất xứ'}
                    </div>
                    <div className="s-auth-row-val">{sanPham.xuatXu}</div>
                  </div>
                )}

                {loHang.maLo && (
                  <div className="s-auth-row">
                    <div className="s-auth-row-label">
                      {lang === 'en' ? 'Batch No.' : 'Số lô'}
                    </div>
                    <div className="s-auth-row-val">{loHang.maLo}</div>
                  </div>
                )}

                {/* ── Bổ sung Thông tin hải quan cho nhà nhập khẩu ── */}
                {(loHang.soToKhaiHQ || doanhNghiep.loai === 'NNK') && (
                  <div className="s-auth-customs-box" style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(57,115,172,0.06)', border: '1px solid rgba(57,115,172,0.2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', color: '#5dade2', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      {lang === 'en' ? 'Import Customs Clearance' : 'Thông tin Thông quan Nhập khẩu'}
                    </div>
                    {loHang.soToKhaiHQ && (
                      <div className="s-auth-row" style={{ padding: '2px 0' }}>
                        <div className="s-auth-row-label" style={{ fontSize: 11 }}>{lang === 'en' ? 'Declaration No.' : 'Số tờ khai HQ'}</div>
                        <div className="s-auth-row-val" style={{ fontSize: 11 }}>{loHang.soToKhaiHQ}</div>
                      </div>
                    )}
                    {loHang.ngayThongQuan && (
                      <div className="s-auth-row" style={{ padding: '2px 0' }}>
                        <div className="s-auth-row-label" style={{ fontSize: 11 }}>{lang === 'en' ? 'Clearance Date' : 'Ngày thông quan'}</div>
                        <div className="s-auth-row-val" style={{ fontSize: 11 }}>
                          {new Date(loHang.ngayThongQuan).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}
                        </div>
                      </div>
                    )}
                    {loHang.cuaKhau && (
                      <div className="s-auth-row" style={{ padding: '2px 0' }}>
                        <div className="s-auth-row-label" style={{ fontSize: 11 }}>{lang === 'en' ? 'Port of Entry' : 'Cửa khẩu'}</div>
                        <div className="s-auth-row-val" style={{ fontSize: 11 }}>{loHang.cuaKhau}</div>
                      </div>
                    )}
                    {loHang.hsCode && (
                      <div className="s-auth-row" style={{ padding: '2px 0' }}>
                        <div className="s-auth-row-label" style={{ fontSize: 11 }}>{lang === 'en' ? 'HS Code' : 'Mã HS Code'}</div>
                        <div className="s-auth-row-val" style={{ fontSize: 11 }}>{loHang.hsCode}</div>
                      </div>
                    )}
                    {loHang.nuocXuatXu && (
                      <div className="s-auth-row" style={{ padding: '2px 0' }}>
                        <div className="s-auth-row-label" style={{ fontSize: 11 }}>{lang === 'en' ? 'Export Origin' : 'Nước xuất xứ'}</div>
                        <div className="s-auth-row-val" style={{ fontSize: 11 }}>{loHang.nuocXuatXu}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Product Certificates — only render if data exists */}
            {sanPham.chungNhans && sanPham.chungNhans.length > 0 && (
              <div className="s-auth-section">
                <div className="s-auth-section-head">
                  <div className="s-auth-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="7" />
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                    </svg>
                  </div>
                  <div className="s-auth-section-title">
                    {lang === 'en' ? 'Product Certifications' : 'Chứng nhận Sản phẩm'}
                  </div>
                </div>
                <div className="s-auth-certs">
                  {sanPham.chungNhans.map((c: any, idx: number) => (
                    <span key={idx} className="s-auth-cert">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {c.soChungNhan || c.loai || 'Certificate'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Bổ sung Chứng nhận Doanh nghiệp từ file Word ── */}
            {doanhNghiep.chungNhans && doanhNghiep.chungNhans.length > 0 && (
              <div className="s-auth-section">
                <div className="s-auth-section-head">
                  <div className="s-auth-section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="s-auth-section-title">
                    {lang === 'en' ? 'Enterprise Certifications' : 'Chứng nhận Doanh nghiệp'}
                  </div>
                </div>
                <div className="s-auth-certs">
                  {doanhNghiep.chungNhans.map((c: any, idx: number) => (
                    <span key={idx} className="s-auth-cert" style={{ background: 'rgba(200,165,87,0.15)', borderColor: '#C8A557', color: '#C8A557' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {c.loai} · #{c.soChungNhan}
                    </span>
                  ))}
                </div>
              </div>
            )}


          </div>

          {/* CTA — static, no absolute */}
          <div className="s-auth-cta">
            <button
              className="s-auth-cta-btn secondary"
              onClick={() => setShowReportFlow(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9"  x2="12"   y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {lang === 'en' ? 'Report' : 'Báo cáo'}
            </button>
            <button
              className="s-auth-cta-btn primary"
              onClick={() => router.push('/verify/scan')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3"  y="3"  width="7" height="7" rx="1" />
                <rect x="14" y="3"  width="7" height="7" rx="1" />
                <rect x="3"  y="14" width="7" height="7" rx="1" />
              </svg>
              {lang === 'en' ? 'Scan Next' : 'Quét tiếp'}
            </button>
          </div>

        </section>
      </div>
    </div>
  );
}
