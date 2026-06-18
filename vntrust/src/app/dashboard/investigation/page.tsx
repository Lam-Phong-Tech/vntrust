"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InvestigationConsole() {
  const [activeTab, setActiveTab] = useState("cho_phan_tich");
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { lang } = useLanguage();

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/investigation/console?status=${activeTab}`);
      const json = await res.json();
      if (json.cases) setData(json.cases);
      if (json.stats) setStats(json.stats);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
  }, [activeTab]);

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto text-slate-300">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-[#C8A557] flex items-center gap-1 mb-2 transition">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {lang === 'en' ? 'Dashboard' : 'Bảng điều khiển'}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1623] border border-red-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              <span className="material-symbols-outlined text-red-500 text-2xl">policy</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display uppercase tracking-wider">{lang === 'en' ? 'Investigation Console' : 'Bàn Điều Tra Rủi Ro'}</h1>
              <p className="text-sm text-slate-400">{lang === 'en' ? 'Human Review & Field Investigation Dispatch' : 'Đánh giá thủ công & Phân phối điều tra'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white border border-white/10 rounded-lg hover:bg-white/10 transition">
            <span className="material-symbols-outlined text-[18px]">filter_list</span> {lang === 'en' ? 'Filter' : 'Lọc'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C8A557] to-[#e7d188] text-[#0B1623] font-bold rounded-lg shadow-[0_0_20px_rgba(200,165,87,0.3)] hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[18px]">refresh</span> Sync
          </button>
        </div>
      </div>

      <div className="glass-panel border border-[#C8A557]/20 bg-[#142235]/60 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/5 bg-black/20 flex gap-4">
          <button onClick={() => setActiveTab("cho_phan_tich")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${activeTab === 'cho_phan_tich' ? 'bg-[#C8A557]/20 text-[#C8A557] border border-[#C8A557]/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>
            {lang === 'en' ? 'Needs Review' : 'Chờ phân tích'} ({stats['cho_phan_tich'] || 0})
          </button>
          <button onClick={() => setActiveTab("dang_dieu_tra")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${activeTab === 'dang_dieu_tra' ? 'bg-[#C8A557]/20 text-[#C8A557] border border-[#C8A557]/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>
            {lang === 'en' ? 'In Progress' : 'Đang điều tra'} ({stats['dang_dieu_tra'] || 0})
          </button>
          <button onClick={() => setActiveTab("da_xu_ly")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${activeTab === 'da_xu_ly' ? 'bg-[#C8A557]/20 text-[#C8A557] border border-[#C8A557]/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>
            {lang === 'en' ? 'Closed' : 'Đã xử lý'} ({stats['da_xu_ly'] || 0})
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/40 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-white/10">{lang === 'en' ? 'Case ID' : 'Mã Hồ Sơ'}</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">{lang === 'en' ? 'Product UID' : 'Mã Sản Phẩm'}</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">{lang === 'en' ? 'Trigger' : 'Nguyên Nhân'}</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">{lang === 'en' ? 'Risk Score' : 'Điểm Rủi Ro'}</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">{lang === 'en' ? 'Status' : 'Trạng Thái'}</th>
                <th className="px-6 py-4 font-bold border-b border-white/10 text-right">{lang === 'en' ? 'Action' : 'Hành Động'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">{lang === 'en' ? 'Loading...' : 'Đang tải...'}</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">{lang === 'en' ? 'No cases found.' : 'Không có hồ sơ nào.'}</td></tr>
              ) : data.map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-mono font-bold text-white">{row.maCaseHoSo || row.id.substring(0, 8)}</td>
                  <td className="px-6 py-4 font-mono text-cyan-400">{row.uid || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-300">{row.loaiPhanAnh || row.loai || 'System Alert'}</td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${row.riskScore > 80 ? 'bg-red-500/10 text-red-400 border-red-500/30' : row.riskScore > 60 ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {row.riskScore || 0}/100
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-white/5 text-slate-300 border border-white/10 rounded-md text-xs">
                      {row.trangThaiDieuTra === 'cho_phan_tich' ? (lang === 'en' ? 'Needs Review' : 'Chờ PT') : row.trangThaiDieuTra === 'dang_dieu_tra' ? (lang === 'en' ? 'In Progress' : 'Đang ĐT') : (lang === 'en' ? 'Closed' : 'Đã xử lý')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/dashboard/checklist/${row.uid || row.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0B1623] border border-[#C8A557]/40 text-[#C8A557] rounded-lg hover:bg-[#C8A557]/10 transition text-xs font-bold">
                      {lang === 'en' ? 'Inspect' : 'Kiểm tra'}
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
