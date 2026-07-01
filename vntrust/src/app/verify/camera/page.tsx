"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyCameraPage() {
  const { lang } = useLanguage();
  const [scanning, setScanning] = useState(true);
  const [detectedItems, setDetectedItems] = useState<any[]>([]);

  useEffect(() => {
    // Simulate AI real-time detection
    const timer1 = setTimeout(() => {
      setDetectedItems(prev => [...prev, { type: 'logo', label: 'Nestle Logo Detected', score: 98, x: 20, y: 30, color: 'text-emerald-400', border: 'border-emerald-400' }]);
    }, 1500);

    const timer2 = setTimeout(() => {
      setDetectedItems(prev => [...prev, { type: 'text', label: 'NSX: 12/05/2026', score: 85, x: 60, y: 70, color: 'text-cyan-400', border: 'border-cyan-400' }]);
    }, 3000);

    const timer3 = setTimeout(() => {
      setScanning(false);
      setDetectedItems(prev => [...prev, { type: 'warning', label: 'Suspicious Barcode', score: 45, x: 40, y: 50, color: 'text-red-400', border: 'border-red-500' }]);
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="verify-consumer-page h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 flex justify-between items-center gap-3 bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/verify" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white">
          <span className="material-symbols-outlined">close</span>
        </Link>
        <div className="min-w-0 px-3 sm:px-4 py-1.5 rounded-full bg-[#0B1623]/80 border border-[#C8A557]/50 text-[#C8A557] font-mono text-[11px] sm:text-xs flex items-center gap-2 backdrop-blur">
          <span className={`w-2 h-2 rounded-full bg-[#C8A557] ${scanning ? 'animate-pulse' : ''}`}></span>
          {scanning ? (lang === 'en' ? 'AI Analyzing...' : 'AI Đang Phân Tích...') : (lang === 'en' ? 'Scan Complete' : 'Hoàn Tất')}
        </div>
        <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white">
          <span className="material-symbols-outlined">flash_on</span>
        </button>
      </div>

      {/* Simulated Camera Feed Viewport */}
      <div className="flex-1 relative">
        <img 
          src="https://images.unsplash.com/photo-1620189507195-68309c04c4d0?auto=format&fit=crop&w=1200&q=80" 
          alt="Camera feed" 
          className="w-full h-full object-cover opacity-80"
        />
        
        {/* Scanning Grid Animation */}
        {scanning && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0)_0%,rgba(200,165,87,0.2)_50%,rgba(20,20,20,0)_100%)] bg-[length:100%_4px] animate-[scan_2s_linear_infinite] z-10 pointer-events-none"></div>
        )}

        {/* AI Bounding Boxes */}
        {detectedItems.map((item, i) => (
          <div 
            key={i}
            className={`absolute border-2 ${item.border} rounded animate-in zoom-in duration-300 z-20 flex flex-col`}
            style={{ 
              top: `${item.y}%`, left: `${item.x}%`, width: '120px', height: '60px',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className={`absolute -top-6 left-[-2px] bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap ${item.color}`}>
              {item.label} [{item.score}%]
            </div>
            
            {/* Corners */}
            <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${item.border}`}></div>
            <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 ${item.border}`}></div>
            <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 ${item.border}`}></div>
            <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${item.border}`}></div>
          </div>
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-4 sm:p-8 z-20 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center">
        {!scanning && (
          <div className="w-full max-w-sm glass-panel bg-[#142235]/90 border-red-500/50 rounded-2xl p-4 mb-6 backdrop-blur animate-in slide-in-from-bottom-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
              <div>
                <h3 className="font-bold text-white text-sm">{lang === 'en' ? 'High Risk Detected' : 'Phát hiện rủi ro cao'}</h3>
                <p className="text-xs text-slate-300 mt-1">{lang === 'en' ? 'The barcode format does not match the manufacturer database.' : 'Định dạng mã vạch không khớp với cơ sở dữ liệu NSX.'}</p>
              </div>
            </div>
            <Link href="/verify/wizard" className="block w-full py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-center text-sm transition">
              {lang === 'en' ? 'Report This Product' : 'Báo Cáo Sản Phẩm Này'}
            </Link>
          </div>
        )}
        
        <div className="flex items-center justify-center gap-5 sm:gap-8 text-white w-full">
          <button className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined">image</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">{lang === 'en' ? 'Gallery' : 'Thư Viện'}</span>
          </button>
          
          <button className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#C8A557] p-1 group">
            <div className="w-full h-full rounded-full bg-white group-active:scale-95 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-black text-3xl">document_scanner</span>
            </div>
          </button>
          
          <Link href="/verify/wizard" className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/50 flex items-center justify-center">
              <span className="material-symbols-outlined">report</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">{lang === 'en' ? 'Report' : 'Báo Lỗi'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
