"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyWizardPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [kenhMua, setKenhMua] = useState("");
  const [tinhTrang, setTinhTrang] = useState("");
  
  const steps = [
    { num: 1, title: lang === 'en' ? "Purchase Channel" : "Kênh Mua Hàng" },
    { num: 2, title: lang === 'en' ? "Product Status" : "Tình Trạng SP" },
    { num: 3, title: lang === 'en' ? "Upload Photos" : "Tải Lên Ảnh" },
    { num: 4, title: lang === 'en' ? "Confirm" : "Xác Nhận" },
  ];

  return (
    <div className="verify-consumer-page min-h-screen bg-[#0B1623] pt-24 pb-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/verify" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider font-display">
            {lang === 'en' ? 'Report Suspicious Product' : 'Báo Cáo Sản Phẩm Nghi Vấn'}
          </h1>
        </div>

        {/* Stepper */}
        <div className="flex justify-between relative mb-12">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full z-0"></div>
          <div className="absolute top-1/2 left-0 h-1 bg-[#C8A557] -translate-y-1/2 rounded-full z-0 transition-all duration-500" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}></div>
          
          {steps.map((s) => (
            <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-300 ${
                step >= s.num 
                  ? 'bg-[#0B1623] border-[#C8A557] text-[#C8A557] shadow-[0_0_15px_rgba(200,165,87,0.3)]' 
                  : 'bg-[#0B1623] border-white/20 text-slate-500'
              }`}>
                {step > s.num ? <span className="material-symbols-outlined text-[20px]">check</span> : s.num}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${step >= s.num ? 'text-white' : 'text-slate-500'}`}>{s.title}</span>
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
              <h2 className="text-xl font-bold text-white mb-6">2. {lang === 'en' ? 'What is the current status of the product?' : 'Tình trạng hiện tại của sản phẩm ra sao?'}</h2>
              <div className="space-y-3">
                {[
                  { id: "nguyen_seal", label: lang === 'en' ? "Brand new, sealed" : "Nguyên seal, chưa bóc hộp" },
                  { id: "mo_hop", label: lang === 'en' ? "Opened but unused" : "Đã mở hộp nhưng chưa sử dụng" },
                  { id: "hu_hong", label: lang === 'en' ? "Damaged packaging/seal" : "Bao bì hư hỏng, tem rách" },
                  { id: "khong_co_tem", label: lang === 'en' ? "No anti-counterfeit stamp" : "Không có tem chống giả" },
                  { id: "gia_bat_thuong", label: lang === 'en' ? "Suspiciously low price" : "Giá quá rẻ bất thường" },
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setTinhTrang(t.id)}
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                      tinhTrang === t.id 
                        ? 'border-[#C8A557] bg-[#C8A557]/10 text-white' 
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold">{t.label}</span>
                    {tinhTrang === t.id && <span className="material-symbols-outlined text-[#C8A557]">check_circle</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex-1">
              <h2 className="text-xl font-bold text-white mb-2">3. {lang === 'en' ? 'Upload Evidence Photos' : 'Tải lên hình ảnh bằng chứng'}</h2>
              <p className="text-sm text-slate-400 mb-6">{lang === 'en' ? 'Upload 5 required photos for AI to analyze' : 'Cung cấp 5 góc chụp để hệ thống AI phân tích rủi ro.'}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { id: "front", label: lang === 'en' ? "Front" : "Mặt trước SP" },
                  { id: "back", label: lang === 'en' ? "Back" : "Mặt sau SP" },
                  { id: "stamp", label: lang === 'en' ? "Stamp" : "Tem chống giả" },
                  { id: "expiry", label: lang === 'en' ? "Expiry/MFG" : "Vị trí NSX/HSD" },
                  { id: "barcode", label: lang === 'en' ? "Barcode" : "Mã vạch/QR" },
                ].map(p => (
                  <div key={p.id} className="aspect-square rounded-xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center text-slate-500 hover:border-[#C8A557] hover:text-[#C8A557] transition cursor-pointer group">
                    <span className="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform">add_a_photo</span>
                    <span className="text-xs font-bold uppercase tracking-wider">{p.label}</span>
                  </div>
                ))}
              </div>
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
                  <span className="text-white font-bold">{tinhTrang || 'Chưa chọn'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{lang === 'en' ? 'Photos:' : 'Hình ảnh:'}</span>
                  <span className="text-emerald-400 font-bold">5/5 {lang === 'en' ? 'Ready' : 'Đã tải lên'}</span>
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
                disabled={(step === 1 && !kenhMua) || (step === 2 && !tinhTrang)}
                className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition ${
                  ((step === 1 && !kenhMua) || (step === 2 && !tinhTrang)) 
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
                        tinhTrangSP: tinhTrang,
                        moTa: `Báo cáo từ Wizard: Kênh - ${kenhMua}, Tình trạng - ${tinhTrang}`,
                        anhMatTruocUrl: "https://example.com/mock-photo.jpg",
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
