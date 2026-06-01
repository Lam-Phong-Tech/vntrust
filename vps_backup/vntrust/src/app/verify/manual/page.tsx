"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyManualPage() {
  const [serial, setSerial] = useState("");
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (serial.trim()) {
      router.push(`/verify/${serial.trim()}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pb-12 flex flex-col items-center pt-8 px-4 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[60%] h-[60%] rounded-full bg-tertiary/10 blur-[150px]"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
        {/* Navigation / Back */}
        <div className="w-full mb-6">
          <Link href="/verify" className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-tertiary transition">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Về Trung tâm Xác thực
          </Link>
        </div>

        <div className="glass-panel border border-outline-variant/15 rounded-3xl p-8 md:p-12 w-full shadow-2xl flex flex-col text-center bg-surface-container-lowest/80 backdrop-blur-xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary mb-6">
            <span className="material-symbols-outlined text-4xl">pin</span>
          </div>
          
          <h2 className="text-3xl font-black font-headline text-on-surface mb-4">Tra cứu Mã Serial</h2>
          <p className="text-on-surface-variant mb-10 mx-auto max-w-sm">Nhập chuỗi định danh duy nhất (UUID/Serial) in chìm dưới lớp phủ tem VNTrust chống giả.</p>

          <form onSubmit={handleVerify} className="space-y-8 w-full max-w-md mx-auto">
            <div className="relative text-left">
              <label className="block text-[11px] font-black text-outline uppercase tracking-[0.2em] mb-3 ml-2">Mã định danh (UID)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline-variant">tag</span>
                </div>
                <input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="w-full bg-surface-container-highest border-none outline-none rounded-2xl pl-12 pr-6 py-5 font-headline font-bold text-lg text-on-surface focus:ring-4 focus:ring-tertiary/20 focus:bg-surface-container-low transition-all placeholder:text-outline-variant placeholder:font-medium"
                  placeholder="e.g. b8c4e09f-..."
                  type="text"
                />
              </div>
            </div>
            <button type="submit" disabled={!serial.trim()} className="w-full bg-gradient-to-r from-tertiary to-tertiary-container text-on-tertiary py-5 rounded-2xl font-bold font-headline tracking-wide uppercase shadow-lg shadow-tertiary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2">
              Xác thực Tức thì
              <span className="material-symbols-outlined">arrow_right_alt</span>
            </button>
          </form>

          <div className="mt-10 flex items-start gap-4 p-5 rounded-2xl bg-surface-container-low text-left border border-outline-variant/20">
            <span className="material-symbols-outlined text-tertiary text-2xl">shield_lock</span>
            <div className="text-xs leading-relaxed text-on-surface-variant">
              <strong className="text-on-surface block mb-1">Mã hóa Cấp Ngân hàng</strong> 
              Giao dịch truy vấn của bạn được mã hóa hoàn toàn. VNTrust ẩn danh địa chỉ mạng để đảm bảo tính riêng tư trong đối soát.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
