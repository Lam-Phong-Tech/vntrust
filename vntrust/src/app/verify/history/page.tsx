"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyHistoryPage() {
  const { lang } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tongDiem, setTongDiem] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/report/history').then(res => res.json()),
      fetch('/api/rewards').then(res => res.ok ? res.json() : { tongDiem: 0 })
    ])
      .then(([historyData, rewardsData]) => {
        setHistory(Array.isArray(historyData) ? historyData : (historyData.history || []));
        setTongDiem(rewardsData.tongDiem || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải dữ liệu lịch sử:", err);
        setLoading(false);
      });
  }, []);

  const totalScans = history.filter(h => h.loaiHanhDong !== 'bao_cao').length;
  const reportsSubmitted = history.filter(h => h.loaiHanhDong === 'bao_cao').length;

  return (
    <div className="min-h-screen bg-[#0B1623] pt-24 pb-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/verify" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider font-display">
            {lang === 'en' ? 'My Activity History' : 'Lịch Sử Kiểm Tra Của Tôi'}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-cyan-400 mb-2">qr_code_scanner</span>
            <div className="text-3xl font-black text-white">{totalScans}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Total Scans' : 'Tổng số lần quét'}</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-amber-400 mb-2">warning</span>
            <div className="text-3xl font-black text-white">{reportsSubmitted}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Reports Submitted' : 'Báo cáo đã gửi'}</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">military_tech</span>
            <div className="text-3xl font-black text-white">{tongDiem}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Reward Points' : 'Điểm thưởng'}</div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h2 className="font-bold text-white uppercase tracking-wider">{lang === 'en' ? 'Timeline' : 'Dòng thời gian'}</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white hover:bg-white/20 transition">{lang === 'en' ? 'All' : 'Tất cả'}</button>
              <button className="px-3 py-1 rounded-full bg-[#0B1623] border border-white/10 text-xs text-slate-400 hover:text-white transition">{lang === 'en' ? 'Scans' : 'Lượt quét'}</button>
              <button className="px-3 py-1 rounded-full bg-[#0B1623] border border-white/10 text-xs text-slate-400 hover:text-white transition">{lang === 'en' ? 'Reports' : 'Báo cáo'}</button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <div className="text-center text-slate-400 py-8">{lang === 'en' ? 'Loading history...' : 'Đang tải lịch sử...'}</div>
            ) : history.length === 0 ? (
              <div className="text-center text-slate-400 py-8 border border-white/5 bg-white/5 rounded-xl">{lang === 'en' ? 'No activity history found.' : 'Chưa có lịch sử hoạt động.'}</div>
            ) : history.map((item, index) => (
              <div key={item.id} className="relative pl-8 pb-6 border-l border-white/10 last:border-0 last:pb-0">
                <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-[#0B1623] ${
                  item.loaiHanhDong === 'bao_cao' ? 'bg-amber-400' : 'bg-cyan-400'
                }`}></div>
                
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined p-2 rounded-lg ${
                        item.loaiHanhDong === 'bao_cao' ? 'bg-amber-400/20 text-amber-400' : 'bg-cyan-400/20 text-cyan-400'
                      }`}>
                        {item.loaiHanhDong === 'bao_cao' ? 'report' : 'qr_code_scanner'}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white">{item.uid ? `SP UID: ${item.uid}` : "Sản phẩm ẩn danh"}</div>
                        <div className="text-xs text-slate-400">{new Date(item.thoiGian).toLocaleString('vi-VN')}</div>
                      </div>
                    </div>
                    
                    {item.maCaseHoSo && (
                      <div className="bg-[#C8A557]/20 border border-[#C8A557]/40 px-2 py-1 rounded text-[#C8A557] font-mono text-xs font-bold">
                        {item.maCaseHoSo}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{lang === 'en' ? 'Status:' : 'Trạng thái:'}</span>
                      {item.ketQua === 'verified' && <span className="text-emerald-400 font-bold">{lang === 'en' ? 'Verified' : 'Chính hãng'}</span>}
                      {item.trangThaiDieuTra === 'dang_dieu_tra' && <span className="text-amber-400 font-bold">{lang === 'en' ? 'Investigating' : 'Đang điều tra'}</span>}
                      {item.trangThaiDieuTra === 'da_xu_ly' && <span className="text-red-400 font-bold">{lang === 'en' ? 'Processed' : 'Đã xử lý'}</span>}
                      {!item.ketQua && !item.trangThaiDieuTra && <span className="text-slate-400 font-bold">{lang === 'en' ? 'Pending' : 'Chờ xử lý'}</span>}
                    </div>
                    
                    {item.loaiHanhDong === 'bao_cao' && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-slate-500">{lang === 'en' ? 'AI Risk Score:' : 'Điểm rủi ro AI:'}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-[#0B1623] rounded-full overflow-hidden">
                            <div className={`h-full ${item.riskScore > 80 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${item.riskScore || 0}%` }}></div>
                          </div>
                          <span className={`font-bold ${item.riskScore > 80 ? 'text-red-400' : 'text-amber-400'}`}>{item.riskScore || 0}/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
