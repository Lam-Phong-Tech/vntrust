"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ChecklistPage() {
  const params = useParams();
  const uid = params.uid || "SAMPLE-UID";
  const { lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/checklist/${uid}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const runChecklist = async () => {
    setRunning(true);
    try {
      await fetch(`/api/ai/checklist/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
      await fetchChecklist();
    } catch (error) {
      console.error(error);
    }
    setRunning(false);
  };

  useEffect(() => {
    fetchChecklist();
  }, [uid]);

  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'text-emerald-400';
      case 'yellow': return 'text-amber-400';
      case 'orange': return 'text-orange-400';
      case 'red': return 'text-red-500';
      case 'black': return 'text-slate-900';
      case 'blue': return 'text-cyan-400';
      default: return 'text-slate-400';
    }
  };

  const getIcon = (color: string) => {
    switch (color) {
      case 'green': return 'check_circle';
      case 'yellow': return 'warning';
      case 'orange': return 'warning';
      case 'red': return 'dangerous';
      case 'black': return 'block';
      case 'blue': return 'info';
      default: return 'help';
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-5xl mx-auto text-slate-300">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <Link href="/dashboard/investigation" className="text-xs text-slate-500 hover:text-[#C8A557] flex items-center gap-1 mb-2 transition">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {lang === 'en' ? 'Investigation Console' : 'Bàn Điều Tra Rủi Ro'}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1623] border border-[#C8A557]/40 flex items-center justify-center shadow-[0_0_15px_rgba(200,165,87,0.15)]">
              <span className="material-symbols-outlined text-[#C8A557] text-2xl">fact_check</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display uppercase tracking-wider">{lang === 'en' ? 'Verification Checklist' : 'Checklist Phân Tích 3 Tầng'}</h1>
              <p className="text-sm text-cyan-400 font-mono">Target: {uid as string}</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
          <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest">{lang === 'en' ? 'Risk Score' : 'Điểm rủi ro'}</p>
          <p className="text-2xl font-black text-red-500 font-mono">{data?.tongDiem || 0}<span className="text-sm text-red-500/50">/100</span></p>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-10 text-slate-400">{lang === 'en' ? 'Loading checklist...' : 'Đang tải dữ liệu...'}</div>
        ) : data?.found === false ? (
          <div className="text-center py-10 text-slate-400 space-y-4">
            <p>{lang === 'en' ? 'No checklist found for this UID.' : 'Chưa có dữ liệu checklist cho UID này.'}</p>
            <button onClick={runChecklist} disabled={running} className="px-4 py-2 bg-[#C8A557] text-white rounded-lg font-bold">
              {running ? (lang === 'en' ? 'Running AI...' : 'Đang chạy AI...') : (lang === 'en' ? 'Run AI Analysis' : 'Chạy phân tích AI')}
            </button>
          </div>
        ) : (
          <>
            {/* Tier 1 */}
            <div className="glass-panel border border-emerald-500/20 bg-[#142235]/60 rounded-2xl overflow-hidden">
              <div className="bg-emerald-500/10 px-6 py-4 flex items-center gap-3 border-b border-emerald-500/20">
                <span className="material-symbols-outlined text-emerald-400">database</span>
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">{lang === 'en' ? 'Tier 1: Basic Data' : 'Tầng 1: Dữ liệu cơ sở'}</h2>
              </div>
              <div className="p-6 space-y-4">
                {data?.grouped?.tang1_data?.length > 0 ? data.grouped.tang1_data.map((item: any, i: number) => (
                  <div key={i} className={`flex justify-between items-center ${i !== data.grouped.tang1_data.length - 1 ? 'border-b border-white/5 pb-3' : 'pb-1'}`}>
                    <div>
                      <p className="font-bold text-white text-sm">{item.quyTac}</p>
                      <p className="text-xs text-slate-400">{item.moTa || item.giaTriDo}</p>
                    </div>
                    <span className={`material-symbols-outlined text-2xl ${getColorClass(item.mauHienThi)}`}>{getIcon(item.mauHienThi)}</span>
                  </div>
                )) : <div className="text-xs text-slate-500">{lang === 'en' ? 'No data' : 'Không có dữ liệu'}</div>}
              </div>
            </div>

            {/* Tier 2 */}
            <div className="glass-panel border border-amber-500/20 bg-[#142235]/60 rounded-2xl overflow-hidden">
              <div className="bg-amber-500/10 px-6 py-4 flex items-center gap-3 border-b border-amber-500/20">
                <span className="material-symbols-outlined text-amber-400">account_tree</span>
                <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest">{lang === 'en' ? 'Tier 2: Business Logic' : 'Tầng 2: Logic nghiệp vụ'}</h2>
              </div>
              <div className="p-6 space-y-4">
                {data?.grouped?.tang2_logic?.length > 0 ? data.grouped.tang2_logic.map((item: any, i: number) => (
                  <div key={i} className={`flex justify-between items-center ${i !== data.grouped.tang2_logic.length - 1 ? 'border-b border-white/5 pb-3' : 'pb-1'}`}>
                    <div>
                      <p className="font-bold text-white text-sm">{item.quyTac}</p>
                      <p className="text-xs text-slate-400">{item.moTa || item.giaTriDo}</p>
                    </div>
                    <span className={`material-symbols-outlined text-2xl ${getColorClass(item.mauHienThi)}`}>{getIcon(item.mauHienThi)}</span>
                  </div>
                )) : <div className="text-xs text-slate-500">{lang === 'en' ? 'No data' : 'Không có dữ liệu'}</div>}
              </div>
            </div>

            {/* Tier 3 */}
            <div className="glass-panel border border-red-500/30 bg-[#142235]/60 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <div className="bg-red-500/10 px-6 py-4 flex items-center justify-between border-b border-red-500/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500">visibility</span>
                  <h2 className="text-sm font-bold text-red-500 uppercase tracking-widest">{lang === 'en' ? 'Tier 3: AI Vision' : 'Tầng 3: Phân tích AI'}</h2>
                </div>
                <Link href={`/dashboard/image-compare/${uid}`} className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold hover:bg-red-500/30 flex items-center gap-1 transition">
                  <span className="material-symbols-outlined text-[14px]">compare</span> {lang === 'en' ? 'AI Vision Compare' : 'Chi tiết ảnh'}
                </Link>
              </div>
              <div className="p-6 space-y-4">
                {data?.grouped?.tang3_ai_vision?.length > 0 ? data.grouped.tang3_ai_vision.map((item: any, i: number) => (
                  <div key={i} className={`flex justify-between items-start ${i !== data.grouped.tang3_ai_vision.length - 1 ? 'border-b border-white/5 pb-3' : 'pb-1'}`}>
                    <div>
                      <p className="font-bold text-white text-sm">{item.quyTac}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.moTa || item.giaTriDo}</p>
                    </div>
                    <span className={`material-symbols-outlined text-2xl mt-1 ${getColorClass(item.mauHienThi)}`}>{getIcon(item.mauHienThi)}</span>
                  </div>
                )) : <div className="text-xs text-slate-500">{lang === 'en' ? 'No data' : 'Không có dữ liệu'}</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
