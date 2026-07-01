"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyRewardsPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [tongDiem, setTongDiem] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showHowToEarn, setShowHowToEarn] = useState(false);
  const formatPoints = (value: number) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'vi-VN').format(value || 0);

  const loadData = () => {
    setLoading(true);
    fetch('/api/rewards')
      .then(res => res.json())
      .then(data => {
        setHistory(data.history || []);
        setTongDiem(data.tongDiem || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải điểm thưởng:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRedeem = async (voucher: {id: number, title: string, cost: number}) => {
    if (tongDiem < voucher.cost) return;
    setRedeeming(voucher.id);
    setNotification(null);
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherId: voucher.id,
          title: voucher.title,
          cost: voucher.cost
        })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ message: lang === 'en' ? `Successfully redeemed ${voucher.title}!` : `Đổi thành công ${voucher.title}!`, type: 'success' });
        loadData(); // Reload data
      } else {
        setNotification({ message: data.error || (lang === 'en' ? 'Failed to redeem' : 'Đổi quà thất bại'), type: 'error' });
      }
    } catch (err) {
      setNotification({ message: lang === 'en' ? 'Network error' : 'Lỗi kết nối', type: 'error' });
    }
    setRedeeming(null);
  };

  const vouchers = [
    { id: 1, title: "Voucher Highlands 30K", cost: 100, image: "local_cafe" },
    { id: 2, title: "GrabCar Giảm 50%", cost: 200, image: "directions_car" },
    { id: 3, title: "Thẻ cào Viettel 50K", cost: 300, image: "sim_card" }
  ];

  return (
    <div className="verify-consumer-page verify-page-rewards min-h-screen bg-[#0B1623] pt-24 pb-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider font-display">
              {lang === 'en' ? 'My Rewards' : 'Điểm Thưởng'}
            </h1>
          </div>
        </div>

        {notification && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            <span className="material-symbols-outlined">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
            <div className="font-bold">{notification.message}</div>
            <button className="ml-auto" onClick={() => setNotification(null)}>
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Current Balance */}
        <div className="glass-panel p-8 rounded-3xl border border-[#C8A557]/30 bg-gradient-to-br from-[#142235] to-[#0B1623] relative overflow-hidden mb-12 flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8A557]/10 blur-[80px] rounded-full pointer-events-none"></div>
          
          <span className="material-symbols-outlined text-6xl text-[#C8A557] mb-4">stars</span>
          <div className="text-xs text-[#C8A557] font-bold uppercase tracking-wider mb-2">{lang === 'en' ? 'Current Balance' : 'Số dư hiện tại'}</div>
          <div className="text-5xl font-black text-white mb-6">{formatPoints(tongDiem)} <span className="text-2xl text-slate-400 font-bold tracking-normal">AI VeriGoods Points</span></div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setShowHowToEarn(true)}
              className="px-6 py-2 bg-gradient-to-r from-[#C8A557] to-[#e7d188] text-[#0B1623] font-bold rounded-lg hover:scale-105 transition shadow-[0_0_15px_rgba(200,165,87,0.3)]"
            >
              {lang === 'en' ? 'How to earn?' : 'Cách kiếm điểm'}
            </button>
            <button 
              onClick={() => {
                document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white font-bold rounded-lg hover:bg-white/20 transition"
            >
              {lang === 'en' ? 'History' : 'Lịch sử giao dịch'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Redeem Vouchers */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A557]">redeem</span>
              {lang === 'en' ? 'Redeem Rewards' : 'Đổi Quà'}
            </h2>
            <div className="space-y-4">
              {vouchers.map(v => (
                <div key={v.id} className="glass-panel p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-[#C8A557]/50 transition flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">{v.image}</span>
                    </div>
                    <div>
                      <div className="font-bold text-white">{v.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{formatPoints(v.cost)} Points</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRedeem(v)}
                    disabled={tongDiem < v.cost || redeeming === v.id}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-2 ${tongDiem >= v.cost && redeeming !== v.id ? 'bg-[#C8A557] text-[#0B1623] hover:bg-[#e7d188]' : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'}`}
                  >
                    {redeeming === v.id ? (lang === 'en' ? 'Processing...' : 'Đang xử lý...') : (lang === 'en' ? 'Redeem' : 'Đổi')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div id="history-section">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">history</span>
              {lang === 'en' ? 'Recent Activity' : 'Giao Dịch Gần Đây'}
            </h2>
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-400">{lang === 'en' ? 'Loading history...' : 'Đang tải...'}</div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border-b border-white/5">{lang === 'en' ? 'No activity found.' : 'Chưa có giao dịch.'}</div>
              ) : history.map((item, index) => (
                <div key={item.id} className={`p-4 flex items-center justify-between ${index !== history.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <div>
                    <div className="text-sm font-bold text-white">{item.moTa || item.loai}</div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(item.thoiGian).toLocaleString('vi-VN')}</div>
                  </div>
                  <div className={`font-mono font-bold ${item.diemThuong > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {item.diemThuong > 0 ? `+${formatPoints(item.diemThuong)}` : formatPoints(item.diemThuong)}
                  </div>
                </div>
              ))}
              <div className="p-3 bg-white/5 text-center border-t border-white/10">
                <button className="text-xs text-[#C8A557] font-bold hover:underline">
                  {lang === 'en' ? 'View Full History' : 'Xem toàn bộ lịch sử'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHowToEarn && (
        <div className="fixed inset-0 bg-[#0B1623]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#142235] border border-white/10 rounded-3xl p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowHowToEarn(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h3 className="text-2xl font-black text-white mb-6 font-display flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A557]">help</span>
              {lang === 'en' ? 'How to Earn Points' : 'Cách Kiếm Điểm'}
            </h3>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-cyan-400">qr_code_scanner</span>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">{lang === 'en' ? 'Scan Authentic Products' : 'Quét Hàng Chính Hãng'}</h4>
                  <p className="text-sm text-slate-400">{lang === 'en' ? 'Earn +10 points for every authentic product verified.' : 'Nhận +10 điểm cho mỗi lần quét xác thực thành công sản phẩm chính hãng.'}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-400">gavel</span>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">{lang === 'en' ? 'Report Suspicious Items' : 'Báo Cáo Hàng Giả'}</h4>
                  <p className="text-sm text-slate-400">{lang === 'en' ? 'Earn +5 points when you submit a report, plus +50 more when admins confirm it is accurate.' : 'Nhận +5 điểm khi gửi báo cáo, và +50 điểm khi được admin xác nhận báo cáo chính xác.'}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-purple-400">campaign</span>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">{lang === 'en' ? 'Promotional Events' : 'Sự Kiện Khuyến Mãi'}</h4>
                  <p className="text-sm text-slate-400">{lang === 'en' ? 'Participate in monthly campaigns for bonus multiplier points.' : 'Tham gia các sự kiện hàng tháng của nhãn hàng để nhận điểm thưởng cấp số nhân.'}</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowHowToEarn(false)}
              className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 transition rounded-xl text-white font-bold"
            >
              {lang === 'en' ? 'Got it' : 'Đã hiểu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
