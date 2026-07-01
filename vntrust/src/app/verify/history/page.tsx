"use client";

import React, { useEffect, useMemo, useState } from "react";
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

type HistoryFilter = "all" | "scans" | "reports";

const STATUS_STYLE: Record<string, string> = {
  genuine: "text-emerald-400",
  verified: "text-emerald-400",
  warning: "text-amber-400",
  suspect: "text-amber-400",
  expired: "text-orange-400",
  fake: "text-red-400",
  blocked: "text-red-400",
  not_found: "text-red-400",
  wrong_enterprise: "text-red-400",
  unknown: "text-slate-300",
};

export default function VerifyHistoryPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tongDiem, setTongDiem] = useState(0);
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const tr = (vi: string, en: string, zh?: string) => {
    if (lang === "en") return en;
    if (lang === "zh") return zh || en;
    return vi;
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/report/history").then((res) => res.json()),
      fetch("/api/rewards").then((res) => (res.ok ? res.json() : { tongDiem: 0 })),
    ])
      .then(([historyData, rewardsData]) => {
        setHistory(Array.isArray(historyData) ? historyData : historyData.history || []);
        setTongDiem(rewardsData.tongDiem || 0);
      })
      .catch((err) => {
        console.error("Lỗi tải dữ liệu lịch sử:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalScans = history.filter((h) => h.loaiHanhDong !== "bao_cao").length;
  const reportsSubmitted = history.filter((h) => h.loaiHanhDong === "bao_cao").length;
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (filter === "scans") return item.loaiHanhDong !== "bao_cao";
      if (filter === "reports") return item.loaiHanhDong === "bao_cao";
      return true;
    });
  }, [filter, history]);

  const locale = lang === "en" ? "en-US" : lang === "zh" ? "zh-CN" : "vi-VN";

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(locale);

  const formatPoints = (value: number) =>
    new Intl.NumberFormat(locale).format(value || 0);

  const getStatusLabel = (item: HistoryItem) => {
    if (item.trangThaiDieuTra === "dang_dieu_tra") {
      return { text: tr("Đang điều tra", "Investigating", "调查中"), className: "text-amber-400" };
    }
    if (item.trangThaiDieuTra === "da_xu_ly") {
      return { text: tr("Đã xử lý", "Processed", "已处理"), className: "text-emerald-400" };
    }
    if (item.trangThaiDieuTra === "dong") {
      return { text: tr("Đã đóng", "Closed", "已关闭"), className: "text-emerald-400" };
    }

    const statusMap: Record<string, { vi: string; en: string; zh: string }> = {
      genuine: { vi: "Chính hãng", en: "Genuine", zh: "正品" },
      verified: { vi: "Chính hãng", en: "Verified", zh: "已验证" },
      warning: { vi: "Cần kiểm tra", en: "Needs review", zh: "需要复核" },
      suspect: { vi: "Nghi vấn", en: "Suspicious", zh: "可疑" },
      expired: { vi: "Hết hạn", en: "Expired", zh: "已过期" },
      fake: { vi: "Có dấu hiệu giả", en: "Likely counterfeit", zh: "疑似假货" },
      blocked: { vi: "Không xác thực", en: "Not verified", zh: "未通过验证" },
      not_found: { vi: "Không tìm thấy", en: "Not found", zh: "未找到" },
      wrong_enterprise: { vi: "Sai doanh nghiệp", en: "Wrong enterprise", zh: "企业不匹配" },
      unknown: { vi: "Chờ xử lý", en: "Pending", zh: "待处理" },
    };

    const statusKey = item.ketQua || "unknown";
    const status = statusMap[statusKey] || statusMap.unknown;
    return {
      text: tr(status.vi, status.en, status.zh),
      className: STATUS_STYLE[statusKey] || STATUS_STYLE.unknown,
    };
  };

  const filterButtons: { key: HistoryFilter; label: string }[] = [
    { key: "all", label: tr("Tất cả", "All", "全部") },
    { key: "scans", label: tr("Lượt quét", "Scans", "扫码记录") },
    { key: "reports", label: tr("Báo cáo", "Reports", "报告") },
  ];

  const emptyMessage =
    filter === "scans"
      ? tr("Chưa có lịch sử lượt quét.", "No scan history found.", "暂无扫码记录。")
      : filter === "reports"
        ? tr("Chưa có báo cáo đã gửi.", "No submitted reports found.", "暂无已提交报告。")
        : tr("Chưa có lịch sử hoạt động.", "No activity history found.", "暂无活动记录。");

  return (
    <div className="verify-consumer-page verify-page-history min-h-screen bg-[#0B1623] pt-24 pb-12 px-4 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10"
            aria-label={tr("Quay lại", "Back", "返回")}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300 mb-1">
              {tr("Giám sát hoạt động", "Activity monitor", "活动监控")}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-display">
              {tr("Lịch sử kiểm tra của tôi", "My activity history", "我的检查历史")}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-cyan-400 mb-2">qr_code_scanner</span>
            <div className="text-3xl font-black text-white">{totalScans}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {tr("Tổng số lần quét", "Total scans", "扫码总数")}
            </div>
          </div>
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-amber-400 mb-2">warning</span>
            <div className="text-3xl font-black text-white">{reportsSubmitted}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {tr("Báo cáo đã gửi", "Reports submitted", "已提交报告")}
            </div>
          </div>
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">military_tech</span>
            <div className="text-3xl font-black text-white">{formatPoints(tongDiem)}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {tr("Điểm thưởng", "Reward points", "奖励积分")}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="font-bold text-white uppercase tracking-wider">
              {tr("Dòng thời gian", "Timeline", "时间线")}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {filterButtons.map((button) => (
                <button
                  key={button.key}
                  type="button"
                  onClick={() => setFilter(button.key)}
                  className={`px-3 py-1 rounded-full border text-xs font-bold transition ${
                    filter === button.key
                      ? "bg-white/10 border-white/10 text-white shadow-sm"
                      : "bg-[#0B1623] border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {loading ? (
              <div className="text-center text-slate-400 py-8">
                {tr("Đang tải lịch sử...", "Loading history...", "正在加载历史记录...")}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center text-slate-400 py-8 border border-white/5 bg-white/5 rounded-xl">
                {emptyMessage}
              </div>
            ) : (
              filteredHistory.map((item) => {
                const status = getStatusLabel(item);
                const riskScore = item.riskScore || 0;
                const isReport = item.loaiHanhDong === "bao_cao";
                return (
                  <div key={item.id} className="relative pl-6 sm:pl-8 pb-6 border-l border-white/10 last:border-0 last:pb-0">
                    <div
                      className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-[#0B1623] ${
                        isReport ? "bg-amber-400" : "bg-cyan-400"
                      }`}
                    />

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 hover:bg-white/10 transition">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`material-symbols-outlined p-2 rounded-lg shrink-0 ${
                              isReport ? "bg-amber-400/20 text-amber-400" : "bg-cyan-400/20 text-cyan-400"
                            }`}
                          >
                            {isReport ? "report" : "qr_code_scanner"}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white break-all">
                              {item.uid
                                ? `${tr("SP UID", "Product UID", "商品 UID")}: ${item.uid}`
                                : tr("Sản phẩm ẩn danh", "Anonymous product", "匿名商品")}
                            </div>
                            <div className="text-xs text-slate-400">{formatDate(item.thoiGian)}</div>
                          </div>
                        </div>

                        {item.maCaseHoSo && (
                          <div className="bg-[#C8A557]/20 border border-[#C8A557]/40 px-2 py-1 rounded text-[#C8A557] font-mono text-xs font-bold w-fit">
                            {item.maCaseHoSo}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{tr("Trạng thái:", "Status:", "状态：")}</span>
                          <span className={`${status.className} font-bold`}>{status.text}</span>
                        </div>

                        {isReport && (
                          <div className="flex items-center gap-2 sm:ml-auto">
                            <span className="text-slate-500">{tr("Điểm rủi ro AI:", "AI risk score:", "AI 风险分：")}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 sm:w-24 h-1.5 bg-[#0B1623] rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${riskScore > 80 ? "bg-red-500" : "bg-amber-500"}`}
                                  style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
                                />
                              </div>
                              <span className={`font-bold ${riskScore > 80 ? "text-red-400" : "text-amber-400"}`}>
                                {riskScore}/100
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
