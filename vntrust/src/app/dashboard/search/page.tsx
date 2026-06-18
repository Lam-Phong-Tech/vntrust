"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SmartSearchPage() {
  const { t, lang } = useLanguage();
  
  const [filters, setFilters] = useState({
    keyword: "",
    viPham: "",
    thoiGian: "",
    diaLy: "",
    riskScore: ""
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const viPhamOptions = [
    { value: "hang_gia", label: lang === 'en' ? "Counterfeit" : "Hàng giả (Counterfeit)" },
    { value: "qr_clone", label: lang === 'en' ? "Clone QR" : "QR giả (Clone QR)" },
    { value: "vi_pham_nhan_hieu", label: lang === 'en' ? "Trademark Violation" : "Vi phạm nhãn hiệu (Trademark Violation)" },
    { value: "bao_bi_gia", label: lang === 'en' ? "Packaging Fraud" : "Bao bì giả (Packaging Fraud)" },
    { value: "het_han", label: lang === 'en' ? "Expired" : "Hết hạn (Expired)" },
    { value: "kem_chat_luong", label: lang === 'en' ? "Low Quality" : "Kém chất lượng (Low Quality)" },
    { value: "nhap_lau", label: lang === 'en' ? "Illegal Import" : "Nhập lậu (Illegal Import)" },
  ];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setLoading(true);
    // Mock API call
    setTimeout(() => {
      setResults([
        {
          id: "1",
          san_pham: "Sữa tắm Omega 3",
          doanh_nghiep: "Công ty TNHH Omega",
          vi_pham: "Hàng giả (Counterfeit)",
          dia_ly: "Hà Nội",
          thoi_gian: "01/06/2026",
          risk_score: 85,
        },
        {
          id: "2",
          san_pham: "Sữa tắm Omega 3",
          doanh_nghiep: "Công ty TNHH Omega",
          vi_pham: "QR giả (Clone QR)",
          dia_ly: "Hà Nội",
          thoi_gian: "31/05/2026",
          risk_score: 92,
        },
        {
          id: "3",
          san_pham: "Dầu gội Alpha",
          doanh_nghiep: "Công ty CP Alpha",
          vi_pham: "Vi phạm nhãn hiệu",
          dia_ly: "Hồ Chí Minh",
          thoi_gian: "28/05/2026",
          risk_score: 75,
        }
      ] as any);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> {t("cmn_dashboard")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#C8A557]">search</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display">{lang === 'en' ? 'Smart Search' : 'Tra cứu nâng cao'}</h1>
              <p className="text-sm text-slate-400">
                {lang === 'en' ? 'Advanced multidimensional data query tool (Query Builder)' : 'Công cụ truy vấn dữ liệu đa chiều (Query Builder)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Filters */}
      <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C8A557]">filter_alt</span>
          {lang === 'en' ? 'Multi-dimensional Filters' : 'Bộ lọc đa chiều'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Keyword */}
          <div className="md:col-span-4 relative">
            <input 
              type="text" 
              value={filters.keyword}
              onChange={(e) => handleFilterChange("keyword", e.target.value)}
              placeholder={lang === 'en' ? "Search for product, enterprise, brand..." : "Tìm kiếm tên sản phẩm, doanh nghiệp, thương hiệu..."}
              className="w-full bg-[#0B1623] border border-white/20 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8A557] transition"
            />
            <span className="material-symbols-outlined absolute left-4 top-3 text-[20px] text-slate-400">search</span>
          </div>

          {/* Violation Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {lang === 'en' ? 'Violation Type' : 'Loại vi phạm'}
            </label>
            <select 
              value={filters.viPham}
              onChange={(e) => handleFilterChange("viPham", e.target.value)}
              className="w-full bg-[#0B1623] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A557] transition"
            >
              <option value="">{lang === 'en' ? '-- All violations --' : '-- Tất cả loại vi phạm --'}</option>
              {viPhamOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>

          {/* Geography */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {lang === 'en' ? 'Geography' : 'Khu vực (Địa lý)'}
            </label>
            <select 
              value={filters.diaLy}
              onChange={(e) => handleFilterChange("diaLy", e.target.value)}
              className="w-full bg-[#0B1623] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A557] transition"
            >
              <option value="">{lang === 'en' ? '-- Nationwide --' : '-- Toàn quốc --'}</option>
              <option value="hn">{lang === 'en' ? 'Hanoi' : 'Hà Nội'}</option>
              <option value="hcm">{lang === 'en' ? 'Ho Chi Minh' : 'Hồ Chí Minh'}</option>
              <option value="dn">{lang === 'en' ? 'Da Nang' : 'Đà Nẵng'}</option>
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {lang === 'en' ? 'Time period' : 'Thời gian'}
            </label>
            <select 
              value={filters.thoiGian}
              onChange={(e) => handleFilterChange("thoiGian", e.target.value)}
              className="w-full bg-[#0B1623] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A557] transition"
            >
              <option value="">{lang === 'en' ? '-- Any time --' : '-- Mọi lúc --'}</option>
              <option value="7">{lang === 'en' ? 'Last 7 days' : '7 ngày qua'}</option>
              <option value="30">{lang === 'en' ? 'Last 30 days' : '30 ngày qua'}</option>
              <option value="90">{lang === 'en' ? 'Last 90 days' : '90 ngày qua'}</option>
            </select>
          </div>

          {/* Risk Score */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Risk Score
            </label>
            <select 
              value={filters.riskScore}
              onChange={(e) => handleFilterChange("riskScore", e.target.value)}
              className="w-full bg-[#0B1623] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A557] transition"
            >
              <option value="">{lang === 'en' ? '-- All Risk Levels --' : '-- Mọi mức độ rủi ro --'}</option>
              <option value="50">{lang === 'en' ? '> 50 (Medium Risk)' : '> 50 (Rủi ro trung bình)'}</option>
              <option value="70">{lang === 'en' ? '> 70 (High Risk)' : '> 70 (Rủi ro cao)'}</option>
              <option value="90">{lang === 'en' ? '> 90 (Critical)' : '> 90 (Nghiêm trọng)'}</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end items-center border-t border-white/10 pt-4 mt-2">
          <button 
            onClick={() => setFilters({ keyword: "", viPham: "", thoiGian: "", diaLy: "", riskScore: "" })}
            className="px-4 py-2 text-slate-400 hover:text-white transition text-sm font-bold mr-4"
          >
            {lang === 'en' ? 'Reset' : 'Xóa bộ lọc'}
          </button>
          
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-[#C8A557] hover:bg-[#d4b468] text-[#0B1623] rounded-xl text-sm font-black transition shadow-[0_0_15px_rgba(200,165,87,0.3)] disabled:opacity-70"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-[#0B1623] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">search</span>
            )}
            {lang === 'en' ? 'Execute Query' : 'Truy vấn dữ liệu'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">{lang === 'en' ? 'Search Results' : 'Kết quả tìm kiếm'} ({results.length})</h3>
            <button className="flex items-center gap-1 text-xs text-[#C8A557] hover:text-[#d4b468] font-bold">
              <span className="material-symbols-outlined text-[16px]">download</span> {lang === 'en' ? 'Export' : 'Xuất dữ liệu'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-[#0B1623]/50">
                <tr>
                  <th className="px-6 py-3 font-medium">{lang === 'en' ? 'Product' : 'Sản phẩm'}</th>
                  <th className="px-6 py-3 font-medium">{lang === 'en' ? 'Enterprise' : 'Doanh nghiệp'}</th>
                  <th className="px-6 py-3 font-medium">{lang === 'en' ? 'Violation Type' : 'Loại vi phạm'}</th>
                  <th className="px-6 py-3 font-medium">{lang === 'en' ? 'Geography' : 'Địa lý'}</th>
                  <th className="px-6 py-3 font-medium">{lang === 'en' ? 'Time' : 'Thời gian'}</th>
                  <th className="px-6 py-3 font-medium">Risk Score</th>
                  <th className="px-6 py-3 font-medium">{lang === 'en' ? 'Action' : 'Thao tác'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 text-white font-medium">{r.san_pham}</td>
                    <td className="px-6 py-4">{r.doanh_nghiep}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        {r.vi_pham}
                      </span>
                    </td>
                    <td className="px-6 py-4">{r.dia_ly}</td>
                    <td className="px-6 py-4 font-mono text-xs">{r.thoi_gian}</td>
                    <td className="px-6 py-4">
                      <span className="text-red-400 font-black">{r.risk_score}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/investigation`} className="text-[#C8A557] hover:underline text-xs font-bold">
                        {lang === 'en' ? 'Investigate' : 'Điều tra'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
