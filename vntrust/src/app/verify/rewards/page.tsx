"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type RewardHistory = {
  id: string;
  loai?: string | null;
  moTa?: string | null;
  diemThuong: number;
  thoiGian: string;
};

type Voucher = {
  id: number;
  title: string;
  aliases: string[];
  cost: number;
  image: string;
};

const DAILY_REDEEM_LIMIT = 3;

export default function VerifyRewardsPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [history, setHistory] = useState<RewardHistory[]>([]);
  const [tongDiem, setTongDiem] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showHowToEarn, setShowHowToEarn] = useState(false);

  const tr = (vi: string, en: string, zh?: string) => {
    if (lang === "en") return en;
    if (lang === "zh") return zh || en;
    return vi;
  };

  const locale = lang === "en" ? "en-US" : lang === "zh" ? "zh-CN" : "vi-VN";

  const formatPoints = (value: number) =>
    new Intl.NumberFormat(locale).format(value || 0);

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(locale);

  const loadData = () => {
    setLoading(true);
    fetch("/api/rewards")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
        setTongDiem(data.tongDiem || 0);
      })
      .catch((err) => {
        console.error("Lỗi tải điểm thưởng:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const vouchers: Voucher[] = [
    {
      id: 1,
      title: tr("Voucher Highlands 30K", "Highlands voucher 30K", "Highlands 30K 代金券"),
      aliases: ["Voucher Highlands 30K", "Highlands voucher 30K", "Highlands 30K"],
      cost: 100,
      image: "local_cafe",
    },
    {
      id: 2,
      title: tr("GrabCar giảm 50%", "GrabCar 50% off", "GrabCar 五折券"),
      aliases: ["GrabCar giảm 50%", "GrabCar 50% off", "GrabCar"],
      cost: 200,
      image: "directions_car",
    },
    {
      id: 3,
      title: tr("Thẻ cào Viettel 50K", "Viettel top-up card 50K", "Viettel 50K 充值卡"),
      aliases: ["Thẻ cào Viettel 50K", "Viettel top-up card 50K", "Viettel 50K"],
      cost: 300,
      image: "sim_card",
    },
  ];

  const translateRewardText = (item: RewardHistory) => {
    const raw = item.moTa || item.loai || "";
    const normalized = raw.toLowerCase();
    const voucherName = raw.replace(/^đổi voucher:\s*/i, "").replace(/^doi voucher:\s*/i, "").trim();

    if (normalized.startsWith("đổi voucher:") || normalized.startsWith("doi voucher:")) {
      return `${tr("Đổi voucher", "Redeemed voucher", "兑换优惠券")}: ${voucherName}`;
    }
    if (item.loai === "doi_qua") return tr("Đổi quà", "Redeemed reward", "兑换奖励");
    if (item.loai === "bao_cao_chinh_xac") return tr("Thưởng báo cáo chính xác", "Accurate report reward", "准确报告奖励");
    if (item.loai === "phat_hien_gia") return tr("Thưởng phát hiện hàng giả", "Counterfeit detection reward", "假货发现奖励");
    if (item.loai === "dang_ky_san_pham") return tr("Thưởng đăng ký sản phẩm", "Product registration reward", "商品登记奖励");
    return raw || tr("Hoạt động điểm thưởng", "Reward activity", "积分活动");
  };

  const handleRedeem = async (voucher: Voucher) => {
    if (tongDiem < voucher.cost) return;
    setRedeeming(voucher.id);
    setNotification(null);
    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherId: voucher.id,
          title: voucher.title,
          cost: voucher.cost,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          message: tr(`Đổi thành công ${voucher.title}!`, `Successfully redeemed ${voucher.title}!`, `已成功兑换 ${voucher.title}！`),
          type: "success",
        });
        loadData();
      } else {
        setNotification({
          message: data.error || tr("Đổi quà thất bại", "Failed to redeem", "兑换失败"),
          type: "error",
        });
      }
    } catch {
      setNotification({ message: tr("Lỗi kết nối", "Network error", "网络错误"), type: "error" });
    }
    setRedeeming(null);
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const redeemedToday = history.filter((item) => item.loai === "doi_qua" && new Date(item.thoiGian) >= startOfToday);
  const redeemedTodayCount = redeemedToday.length;
  const isVoucherRedeemedToday = (voucher: Voucher) =>
    redeemedToday.some((item) => {
      const note = (item.moTa || "").toLowerCase();
      return voucher.aliases.some((alias) => note.includes(alias.toLowerCase()));
    });

  return (
    <div className="verify-consumer-page verify-page-rewards min-h-screen bg-[#0B1623] pt-24 pb-12 px-4 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10"
              aria-label={tr("Quay lại", "Back", "返回")}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-display">
              {tr("Điểm thưởng", "My rewards", "我的奖励")}
            </h1>
          </div>
        </div>

        {notification && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${notification.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            <span className="material-symbols-outlined">{notification.type === "success" ? "check_circle" : "error"}</span>
            <div className="font-bold">{notification.message}</div>
            <button className="ml-auto" onClick={() => setNotification(null)} aria-label={tr("Đóng", "Close", "关闭")}>
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#C8A557]/30 bg-gradient-to-br from-[#142235] to-[#0B1623] relative overflow-hidden mb-12 flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8A557]/10 blur-[80px] rounded-full pointer-events-none" />
          <span className="material-symbols-outlined text-6xl text-[#C8A557] mb-4">stars</span>
          <div className="text-xs text-[#C8A557] font-bold uppercase tracking-wider mb-2">
            {tr("Số dư hiện tại", "Current balance", "当前余额")}
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white mb-6 break-words">
            {formatPoints(tongDiem)}{" "}
            <span className="text-xl sm:text-2xl text-slate-400 font-bold tracking-normal">
              {tr("điểm AI VeriGoods", "AI VeriGoods points", "AI VeriGoods 积分")}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => setShowHowToEarn(true)}
              className="px-6 py-2 bg-gradient-to-r from-[#C8A557] to-[#e7d188] text-[#0B1623] font-bold rounded-lg hover:scale-105 transition shadow-[0_0_15px_rgba(200,165,87,0.3)]"
            >
              {tr("Cách kiếm điểm", "How to earn?", "如何获得积分？")}
            </button>
            <button
              onClick={() => document.getElementById("history-section")?.scrollIntoView({ behavior: "smooth" })}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white font-bold rounded-lg hover:bg-white/20 transition"
            >
              {tr("Lịch sử giao dịch", "History", "交易历史")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A557]">redeem</span>
              {tr("Đổi quà", "Redeem rewards", "兑换奖励")}
            </h2>
            <p className="mb-4 text-xs font-semibold text-slate-400">
              {tr(
                `Đã dùng ${redeemedTodayCount}/${DAILY_REDEEM_LIMIT} lượt đổi hôm nay. Mỗi voucher chỉ đổi 1 lần/ngày.`,
                `${redeemedTodayCount}/${DAILY_REDEEM_LIMIT} redemptions used today. Each voucher can be redeemed once per day.`,
                `今天已使用 ${redeemedTodayCount}/${DAILY_REDEEM_LIMIT} 次兑换。每种优惠券每天只能兑换一次。`
              )}
            </p>
            <div className="space-y-4">
              {vouchers.map((v) => {
                const redeemedThisVoucher = isVoucherRedeemedToday(v);
                const reachedDailyLimit = redeemedTodayCount >= DAILY_REDEEM_LIMIT;
                const canRedeem = tongDiem >= v.cost && redeeming !== v.id && !redeemedThisVoucher && !reachedDailyLimit;

                return (
                  <div key={v.id} className="glass-panel p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-[#C8A557]/50 transition flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined">{v.image}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{v.title}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {formatPoints(v.cost)} {tr("điểm", "points", "积分")}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedeem(v)}
                      disabled={!canRedeem}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-2 shrink-0 ${canRedeem ? "bg-[#C8A557] text-[#0B1623] hover:bg-[#e7d188]" : "bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed"}`}
                    >
                      {redeeming === v.id
                        ? tr("Đang xử lý...", "Processing...", "处理中...")
                        : redeemedThisVoucher
                          ? tr("Đã đổi hôm nay", "Redeemed today", "今天已兑换")
                          : reachedDailyLimit
                            ? tr("Hết lượt hôm nay", "Daily limit reached", "今日次数已用完")
                            : tr("Đổi", "Redeem", "兑换")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div id="history-section">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">history</span>
              {tr("Giao dịch gần đây", "Recent activity", "最近活动")}
            </h2>
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-400">{tr("Đang tải...", "Loading...", "正在加载...")}</div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border-b border-white/5">
                  {tr("Chưa có giao dịch.", "No activity found.", "暂无活动。")}
                </div>
              ) : (
                history.map((item, index) => (
                  <div key={item.id} className={`p-4 flex items-center justify-between gap-3 ${index !== history.length - 1 ? "border-b border-white/5" : ""}`}>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white break-words">{translateRewardText(item)}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatDate(item.thoiGian)}</div>
                    </div>
                    <div className={`font-mono font-bold shrink-0 ${item.diemThuong > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                      {item.diemThuong > 0 ? `+${formatPoints(item.diemThuong)}` : formatPoints(item.diemThuong)}
                    </div>
                  </div>
                ))
              )}
              <div className="p-3 bg-white/5 text-center border-t border-white/10">
                <button
                  type="button"
                  onClick={() => document.getElementById("history-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-xs text-[#C8A557] font-bold hover:underline"
                >
                  {tr("Xem toàn bộ lịch sử", "View full history", "查看完整历史")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHowToEarn && (
        <div className="fixed inset-0 bg-[#0B1623]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#142235] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowHowToEarn(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              aria-label={tr("Đóng", "Close", "关闭")}
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-2xl font-black text-white mb-6 font-display flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A557]">help</span>
              {tr("Cách kiếm điểm", "How to earn points", "如何获得积分")}
            </h3>

            <div className="space-y-6">
              <RewardInfo
                icon="qr_code_scanner"
                color="cyan"
                title={tr("Quét hàng chính hãng", "Scan authentic products", "扫码验证正品")}
                desc={tr("Nhận +10 điểm cho mỗi lần quét xác thực thành công sản phẩm chính hãng.", "Earn +10 points for every authentic product verified.", "每次成功验证正品可获得 +10 积分。")}
              />
              <RewardInfo
                icon="gavel"
                color="amber"
                title={tr("Báo cáo hàng giả", "Report suspicious items", "举报可疑商品")}
                desc={tr("Nhận +5 điểm khi gửi báo cáo, và +50 điểm khi được admin xác nhận báo cáo chính xác.", "Earn +5 points when submitting a report, plus +50 more when admins confirm it is accurate.", "提交报告可获得 +5 积分；管理员确认准确后再获得 +50 积分。")}
              />
              <RewardInfo
                icon="campaign"
                color="purple"
                title={tr("Sự kiện khuyến mãi", "Promotional events", "促销活动")}
                desc={tr("Tham gia các chiến dịch hằng tháng để nhận thêm điểm thưởng.", "Join monthly campaigns to earn bonus points.", "参加每月活动可获得额外积分。")}
              />
            </div>

            <button
              onClick={() => setShowHowToEarn(false)}
              className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 transition rounded-xl text-white font-bold"
            >
              {tr("Đã hiểu", "Got it", "知道了")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardInfo({ icon, color, title, desc }: { icon: string; color: "cyan" | "amber" | "purple"; title: string; desc: string }) {
  const palette = {
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  }[color];

  return (
    <div className="flex gap-4">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${palette}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <h4 className="font-bold text-white mb-1">{title}</h4>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
    </div>
  );
}
