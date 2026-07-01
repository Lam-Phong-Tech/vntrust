"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type HistoryItem = {
  id: string;
  loaiHanhDong?: string | null;
  uid?: string | null;
  thoiGian: string;
  ketQua?: string | null;
  trangThaiDieuTra?: string | null;
  maCaseHoSo?: string | null;
  riskScore?: number | null;
};

export default function VerifyHistoryPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
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
  const getStatusLabel = (item: HistoryItem) => {
    if (item.trangThaiDieuTra === 'dang_dieu_tra') {
      return { text: lang === 'en' ? 'Investigating' : 'Đang điều tra', className: 'text-amber-400' };
    }
    if (item.trangThaiDieuTra === 'da_xu_ly') {
      return { text: lang === 'en' ? 'Processed' : 'Đã xử lý', className: 'text-red-400' };
    }
    if (item.trangThaiDieuTra === 'dong') {
      return { text: lang === 'en' ? 'Closed' : 'Đã đóng', className: 'text-emerald-400' };
    }

    const statusMap: Record<string, { vi: string; en: string; className: string }> = {
      verified: { vi: 'Chính hãng', en: 'Verified', className: 'text-emerald-400' },
      warning: { vi: 'Cần kiểm tra', en: 'Needs review', className: 'text-amber-400' },
      expired: { vi: 'Hết hạn', en: 'Expired', className: 'text-orange-400' },
      blocked: { vi: 'Không xác thực', en: 'Not verified', className: 'text-red-400' },
      unknown: { vi: 'Chờ xử lý', en: 'Pending', className: 'text-slate-300' },
    };
    const statusKey = item.ketQua || 'unknown';
    const status = statusMap[statusKey] || statusMap.unknown;
    return { text: lang === 'en' ? status.en : status.vi, className: status.className };
  };

  return (
    <div className="verify-consumer-page verify-page-history min-h-screen bg-[#0B1623] pt-24 pb-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-2 mb-8">
          <button type="button" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
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
            ) : history.map((item) => {
              const status = getStatusLabel(item);
              const riskScore = item.riskScore || 0;
              return (
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
                      <span className={`${status.className} font-bold`}>{status.text}</span>
                    </div>
                    
                    {item.loaiHanhDong === 'bao_cao' && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-slate-500">{lang === 'en' ? 'AI Risk Score:' : 'Điểm rủi ro AI:'}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-[#0B1623] rounded-full overflow-hidden">
                            <div className={`h-full ${riskScore > 80 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${riskScore}%` }}></div>
                          </div>
                          <span className={`font-bold ${riskScore > 80 ? 'text-red-400' : 'text-amber-400'}`}>{riskScore}/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}
