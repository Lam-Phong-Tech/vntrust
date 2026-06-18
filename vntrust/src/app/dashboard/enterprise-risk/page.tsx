"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EnterpriseRiskPage() {
  const { t, lang } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnterprises = async () => {
      try {
        const res = await fetch('/api/dashboard/enterprise-risk');
        const json = await res.json();
        if (json.success) {
          setEnterprises(json.data);
        }
      } catch (err) {
        console.error("Failed to load enterprise data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEnterprises();
  }, []);

  const filteredEnterprises = enterprises.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.taxCode.includes(searchTerm)
  );


  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-400 bg-red-500/10 border-red-500/30";
    if (score >= 40) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-green-400 bg-green-500/10 border-green-500/30";
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
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-400">domain_disabled</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display">{lang === 'en' ? 'Enterprise Risk Analysis' : 'Phân tích rủi ro doanh nghiệp'}</h1>
              <p className="text-sm text-slate-400">
                {lang === 'en' ? 'Measure the risk level (Risk Score) of each enterprise in the system' : 'Đo lường mức độ rủi ro (Risk Score) của từng doanh nghiệp tham gia hệ thống'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: lang === 'en' ? "High Risk Enterprises" : "Doanh nghiệp rủi ro cao", value: enterprises.filter(e => e.riskScore >= 70).length, icon: "warning", color: "text-red-400" },
          { label: lang === 'en' ? "Expired Certificates" : "Chứng nhận hết hạn", value: enterprises.filter(e => e.expiredCert).length, icon: "event_busy", color: "text-orange-400" },
          { label: lang === 'en' ? "Total Complaints" : "Tổng khiếu nại", value: enterprises.reduce((sum, e) => sum + e.complaintCount, 0), icon: "feedback", color: "text-amber-400" },
          { label: lang === 'en' ? "Geo Risk Anomalies" : "Bất thường vị trí (Geo Risk)", value: enterprises.filter(e => e.geoRisk === "High").length, icon: "location_off", color: "text-purple-400" },
        ].map((kpi, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl border border-white/10">
            <span className={`material-symbols-outlined text-2xl mb-2 ${kpi.color}`}>{kpi.icon}</span>
            <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Enterprise List */}
      <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">{lang === 'en' ? 'Enterprise List' : 'Danh sách doanh nghiệp'} ({filteredEnterprises.length})</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder={lang === 'en' ? "Search enterprise..." : "Tìm kiếm doanh nghiệp..."} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B1623] border border-white/20 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-orange-400 min-w-[250px]"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-slate-400">search</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-[#0B1623]/50">
              <tr>
                <th className="px-6 py-3 font-medium">{lang === 'en' ? 'Enterprise' : 'Doanh nghiệp'}</th>
                <th className="px-6 py-3 font-medium text-center">Risk Score</th>
                <th className="px-6 py-3 font-medium text-center">{lang === 'en' ? 'Complaints' : 'Khiếu nại'}</th>
                <th className="px-6 py-3 font-medium text-center">{lang === 'en' ? 'Clone QR' : 'QR giả'}</th>
                <th className="px-6 py-3 font-medium text-center">{lang === 'en' ? 'Expired Cert' : 'Hết hạn chứng nhận'}</th>
                <th className="px-6 py-3 font-medium text-center">AI Similarity</th>
                <th className="px-6 py-3 font-medium text-center">Geo Risk</th>
                <th className="px-6 py-3 font-medium">{lang === 'en' ? 'Action' : 'Thao tác'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <span className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin inline-block mb-2"></span>
                    <p>{lang === 'en' ? 'Loading enterprise data...' : 'Đang tải dữ liệu doanh nghiệp...'}</p>
                  </td>
                </tr>
              ) : filteredEnterprises.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                    <p>{lang === 'en' ? 'No enterprises found.' : 'Không tìm thấy doanh nghiệp nào.'}</p>
                  </td>
                </tr>
              ) : filteredEnterprises.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white">{e.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{lang === 'en' ? 'Tax' : 'MST'}: {e.taxCode}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-lg font-black border ${getRiskColor(e.riskScore)}`}>
                      {e.riskScore}/100
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold">{e.complaintCount}</td>
                  <td className="px-6 py-4 text-center font-bold text-red-400">{e.qrFraud}</td>
                  <td className="px-6 py-4 text-center">
                    {e.expiredCert ? (
                      <span className="material-symbols-outlined text-red-400">warning</span>
                    ) : (
                      <span className="material-symbols-outlined text-green-400">check_circle</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-mono">{e.aiSimilarity}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${e.geoRisk === "High" ? "bg-red-500/20 text-red-400" : e.geoRisk === "Medium" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                      {e.geoRisk}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/investigation`} className="text-orange-400 hover:text-orange-300 hover:underline text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">manage_search</span>
                      {lang === 'en' ? 'Investigate' : 'Điều tra'}
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
