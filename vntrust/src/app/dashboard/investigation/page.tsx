"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

type InvestigationCase = {
  id: string;
  maCaseHoSo?: string | null;
  loai?: string | null;
  mucDo?: string | null;
  trangThaiDieuTra?: string | null;
  riskScore?: number | null;
  uid?: string | null;
  loaiPhanAnh?: string | null;
};

const statusTabs = [
  { key: "cho_phan_tich", vi: "Chờ phân tích", en: "Needs Review" },
  { key: "dang_dieu_tra", vi: "Đang điều tra", en: "In Progress" },
  { key: "da_xu_ly", vi: "Đã xử lý", en: "Closed" },
];

const riskLevels = [
  { key: "all", vi: "Mọi điểm rủi ro", en: "All risk scores", min: 0 },
  { key: "60", vi: "Từ 60 điểm", en: "From 60", min: 60 },
  { key: "80", vi: "Từ 80 điểm", en: "From 80", min: 80 },
];

export default function InvestigationConsole() {
  const [activeTab, setActiveTab] = useState("cho_phan_tich");
  const [data, setData] = useState<InvestigationCase[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [riskMin, setRiskMin] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/investigation/console?status=${activeTab}`);
      const json = await res.json();
      setData(Array.isArray(json.cases) ? json.cases : []);
      setStats(json.stats || {});
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const typeOptions = useMemo(() => {
    const values = data
      .map((item) => item.loaiPhanAnh || item.loai)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(values));
  }, [data]);

  const filteredData = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const minScore = riskLevels.find((level) => level.key === riskMin)?.min ?? 0;

    return data.filter((item) => {
      const searchable = [
        item.maCaseHoSo,
        item.id,
        item.uid,
        item.loaiPhanAnh,
        item.loai,
        item.mucDo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesRisk = (item.riskScore || 0) >= minScore;
      const matchesType = typeFilter === "all" || item.loaiPhanAnh === typeFilter || item.loai === typeFilter;
      return matchesQuery && matchesRisk && matchesType;
    });
  }, [data, query, riskMin, typeFilter]);

  const hasActiveFilter = Boolean(query.trim()) || riskMin !== "all" || typeFilter !== "all";

  const resetFilters = () => {
    setQuery("");
    setRiskMin("all");
    setTypeFilter("all");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 md:p-10 max-w-7xl mx-auto text-slate-300">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-[#2563eb] flex items-center gap-1 mb-2 transition">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {tr("Bảng điều khiển", "Dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-red-200 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-red-500 text-2xl">policy</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-950 font-display uppercase tracking-wider">{tr("Bàn điều tra rủi ro", "Investigation Console")}</h1>
              <p className="text-sm text-slate-500">{tr("Đánh giá thủ công và phân phối điều tra", "Human review and field investigation dispatch")}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters((value) => !value)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition ${
              showFilters || hasActiveFilter
                ? "bg-[#2563eb] text-white border-[#2563eb] shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            {tr("Lọc", "Filter")}
            {hasActiveFilter && <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-bold">ON</span>}
          </button>
          <button
            onClick={fetchCases}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white font-bold rounded-lg shadow-sm hover:bg-[#1d4ed8] disabled:opacity-60 transition"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>refresh</span>
            Sync
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_220px_auto] md:items-end">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{tr("Từ khóa", "Keyword")}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tr("Mã hồ sơ, UID, nguyên nhân...", "Case ID, UID, trigger...")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{tr("Điểm rủi ro", "Risk score")}</span>
              <select
                value={riskMin}
                onChange={(event) => setRiskMin(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
              >
                {riskLevels.map((level) => (
                  <option key={level.key} value={level.key}>{tr(level.vi, level.en)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{tr("Loại cảnh báo", "Alert type")}</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
              >
                <option value="all">{tr("Tất cả loại", "All types")}</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <button
              onClick={resetFilters}
              disabled={!hasActiveFilter}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tr("Xóa lọc", "Clear")}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-4">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                activeTab === tab.key
                  ? "bg-[#2563eb] text-white border border-[#2563eb]"
                  : "bg-white text-slate-500 border border-slate-200 hover:text-slate-900"
              }`}
            >
              {tr(tab.vi, tab.en)} ({stats[tab.key] || 0})
            </button>
          ))}
          {hasActiveFilter && (
            <span className="ml-auto self-center text-xs font-medium text-slate-500">
              {tr("Đang hiển thị", "Showing")} {filteredData.length}/{data.length}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-slate-200">{tr("Mã hồ sơ", "Case ID")}</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">{tr("Mã sản phẩm", "Product UID")}</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">{tr("Nguyên nhân", "Trigger")}</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">{tr("Điểm rủi ro", "Risk Score")}</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200">{tr("Trạng thái", "Status")}</th>
                <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">{tr("Hành động", "Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">{tr("Đang tải...", "Loading...")}</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">{tr("Không có hồ sơ nào.", "No cases found.")}</td></tr>
              ) : filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-slate-950">{row.maCaseHoSo || row.id.substring(0, 8)}</td>
                  <td className="px-6 py-4 font-mono text-[#2563eb]">{row.uid || "N/A"}</td>
                  <td className="px-6 py-4 text-slate-700">{row.loaiPhanAnh || row.loai || "System Alert"}</td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${(row.riskScore || 0) > 80 ? "bg-red-50 text-red-700 border-red-200" : (row.riskScore || 0) > 60 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {row.riskScore || 0}/100
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-xs">
                      {row.trangThaiDieuTra === "cho_phan_tich" ? tr("Chờ PT", "Needs Review") : row.trangThaiDieuTra === "dang_dieu_tra" ? tr("Đang ĐT", "In Progress") : tr("Đã xử lý", "Closed")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/dashboard/checklist/${row.uid || row.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 text-[#2563eb] rounded-lg hover:bg-blue-100 transition text-xs font-bold">
                      {tr("Kiểm tra", "Inspect")}
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
