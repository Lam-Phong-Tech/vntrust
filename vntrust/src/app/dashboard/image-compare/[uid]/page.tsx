"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ImageComparePage() {
  const { lang } = useLanguage();
  const params = useParams();
  const uid = params.uid || "SAMPLE-UID";
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-6xl mx-auto text-slate-300">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <Link href={`/dashboard/checklist/${uid}`} className="text-xs text-slate-500 hover:text-[#C8A557] flex items-center gap-1 mb-2 transition">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {lang === 'en' ? 'Back to Checklist' : 'Quay lại Checklist'}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1623] border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">compare</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display uppercase tracking-wider">{lang === 'en' ? 'AI Vision Compare' : 'Đối Chiếu Ảnh AI'}</h1>
              <p className="text-sm text-slate-400 font-mono">UID: {uid as string}</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-2 bg-[#142235] border border-white/10 rounded-lg flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{lang === 'en' ? 'Similarity' : 'Độ Tương Đồng'}</p>
            <p className="text-xl font-black text-red-500 font-mono">42%</p>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{lang === 'en' ? 'Verdict' : 'Kết Luận'}</p>
            <p className="text-xl font-black text-red-500 uppercase">{lang === 'en' ? 'Fake' : 'Hàng Giả'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="glass-panel border border-white/10 bg-[#142235]/60 rounded-2xl p-6 relative overflow-hidden">
            <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="material-symbols-outlined text-cyan-400 text-[18px]">image</span> {lang === 'en' ? 'Image Analysis' : 'Phân Tích Hình Ảnh'}</span>
              <span className="text-[10px] text-slate-400">{lang === 'en' ? 'Reference (Left) vs User Upload (Right)' : 'Ảnh Chuẩn (Trái) so với Ảnh Người Dùng (Phải)'}</span>
            </h2>
            
            {/* Image Compare Slider Fake UI */}
            <div className="relative w-full aspect-video bg-black/40 border border-white/10 rounded-xl overflow-hidden cursor-ew-resize select-none"
                 onMouseMove={(e) => {
                   const bounds = e.currentTarget.getBoundingClientRect();
                   const x = Math.max(0, Math.min(e.clientX - bounds.left, bounds.width));
                   setSliderPos((x / bounds.width) * 100);
                 }}>
              
              {/* Fake Image Base (User Upload) */}
              <div className="absolute inset-0 bg-[#0B1623] flex items-center justify-center border-4 border-red-500/50">
                <span className="text-red-500/20 font-black text-6xl">UPLOADED (FAKE)</span>
                {/* Highlight bounding box */}
                <div className="absolute top-[20%] left-[30%] w-32 h-16 border-2 border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
              </div>

              {/* Fake Reference Image (Clipped) */}
              <div className="absolute inset-y-0 left-0 bg-[#142235] border-r-2 border-[#C8A557] flex items-center justify-center overflow-hidden" style={{ width: `${sliderPos}%` }}>
                <div className="w-[800px] absolute inset-y-0 left-0 flex items-center justify-center border-4 border-[#C8A557]/50">
                   <span className="text-[#C8A557]/20 font-black text-6xl">REFERENCE (ORIGINAL)</span>
                </div>
              </div>

              {/* Slider Handle */}
              <div className="absolute top-0 bottom-0 flex items-center justify-center -ml-[1px]" style={{ left: `${sliderPos}%` }}>
                <div className="w-8 h-8 rounded-full bg-[#C8A557] flex items-center justify-center shadow-[0_0_10px_rgba(200,165,87,0.5)] text-black">
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel border border-[#C8A557]/20 bg-[#142235]/60 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">{lang === 'en' ? 'Breakdown' : 'Chi Tiết Trọng Số'}</h2>
            <div className="space-y-4">
              {[
                { name: "Logo", score: 50, weight: "25%", color: "text-red-400" },
                { name: "Color (Hist)", score: 72, weight: "10%", color: "text-amber-400" },
                { name: "Layout", score: 60, weight: "15%", color: "text-amber-400" },
                { name: "QR", score: 10, weight: "15%", color: "text-red-400" },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-bold">{m.name}</span>
                    <span className="text-slate-500">{m.weight}</span>
                  </div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className={m.color}>{lang === 'en' ? 'Similarity: ' : 'Độ giống: '}{m.score}%</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-1.5 border border-white/5">
                    <div className={`h-1.5 rounded-full ${m.score < 60 ? 'bg-red-500' : 'bg-amber-500'} opacity-80`} style={{ width: `${m.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
