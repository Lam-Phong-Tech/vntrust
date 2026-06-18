"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function BrandMonitoringPage() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "infringements" | "protection">("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isProtecting, setIsProtecting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/brand-monitoring');
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualScan = async () => {
    setIsScanning(true);
    setNotification(null);
    try {
      const res = await fetch('/api/dashboard/brand-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' })
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: 'success', message: json.message });
        fetchData(); // reload
      } else {
        setNotification({ type: 'error', message: json.message || "Failed to scan." });
      }
    } catch (err) {
      setNotification({ type: 'error', message: "Error scanning." });
    } finally {
      setIsScanning(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleAddProtection = async () => {
    if (!selectedFile) {
      setNotification({ type: 'error', message: lang === 'en' ? 'Please select a file to upload.' : 'Vui lòng chọn tệp để tải lên.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    setIsProtecting(true);
    setNotification(null);
    try {
      const res = await fetch('/api/dashboard/brand-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'protection' })
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: 'success', message: json.message });
        setSelectedFile(null); // reset file
      } else {
        setNotification({ type: 'error', message: json.message || "Failed to add protection profile." });
      }
    } catch (err) {
      setNotification({ type: 'error', message: "Error adding protection." });
    } finally {
      setIsProtecting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return lang === 'en' ? 'Just now' : 'Vừa xong';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${lang === 'en' ? 'minutes ago' : 'phút trước'}`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${lang === 'en' ? 'hours ago' : 'giờ trước'}`;
      return `${Math.floor(diffInSeconds / 86400)} ${lang === 'en' ? 'days ago' : 'ngày trước'}`;
    } catch {
      return isoString;
    }
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-400">verified_user</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display">{lang === 'en' ? 'Brand Monitoring' : 'Theo dõi thương hiệu'}</h1>
              <p className="text-sm text-slate-400">
                {lang === 'en' ? 'Protect trademark and detect multi-platform copyright infringements' : 'Bảo vệ nhãn hiệu và phát hiện vi phạm bản quyền trên đa nền tảng'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
        {[
          { id: "overview", label: lang === 'en' ? "Overview" : "Tổng quan", icon: "dashboard" },
          { id: "infringements", label: lang === 'en' ? "Detected Infringements" : "Phát hiện vi phạm", icon: "policy" },
          { id: "protection", label: lang === 'en' ? "Legal Profile" : "Hồ sơ bản quyền", icon: "gavel" },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-bold transition-all border-b-2 ${activeTab === tab.id ? "text-purple-400 border-purple-400 bg-purple-500/10" : "text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"}`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-4 text-center py-10 text-slate-400">Loading...</div>
            ) : (
              [
                { label: lang === 'en' ? "Protected Trademarks" : "Nhãn hiệu được bảo vệ", value: data?.kpi?.protectedTrademarks || 0, icon: "shield", color: "text-purple-400" },
                { label: lang === 'en' ? "Monitored Products" : "Sản phẩm giám sát", value: data?.kpi?.monitoredProducts || 0, icon: "inventory_2", color: "text-blue-400" },
                { label: lang === 'en' ? "Detected Infringements" : "Vi phạm phát hiện", value: data?.kpi?.detectedInfringements || 0, icon: "warning", color: "text-red-400" },
                { label: lang === 'en' ? "Takedowns Processed" : "Đã xử lý gỡ bỏ", value: data?.kpi?.takedownsProcessed || 0, icon: "gavel", color: "text-green-400" },
              ].map((kpi, i) => (
                <div key={i} className="glass-panel p-5 rounded-2xl border border-white/10">
                  <span className={`material-symbols-outlined text-2xl mb-2 ${kpi.color}`}>{kpi.icon}</span>
                  <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">pie_chart</span>
                {lang === 'en' ? 'Infringement Channels' : 'Kênh phát hiện vi phạm'}
              </h3>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-xs text-slate-400">Loading...</p>
                ) : data?.channels?.map((item: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1 text-slate-300">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400">trending_up</span>
                {lang === 'en' ? 'Latest Detections' : 'Phát hiện mới nhất'}
              </h3>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-xs text-slate-400">Loading...</p>
                ) : data?.latestDetections?.length > 0 ? data.latestDetections.map((vi: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div>
                      <p className="text-sm font-bold text-white line-clamp-1">{vi.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{vi.platform} • {formatTime(vi.time)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                      (vi.status === "Chờ xử lý" || vi.status === "Pending" || vi.status.includes("open")) ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      (vi.status === "Đang gỡ" || vi.status === "Taking down" || vi.status.includes("reviewing")) ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-green-500/20 text-green-400 border border-green-500/30"
                    }`}>
                      {lang === 'en' ? 
                        (vi.status === 'Chờ xử lý' ? 'Pending' : vi.status === 'Đang gỡ' ? 'Taking down' : 'Removed') 
                        : vi.status}
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400">Không có vi phạm nào.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "infringements" && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <span className="material-symbols-outlined text-purple-400 text-3xl">radar</span>
              <div>
                <h3 className="text-xl font-bold text-white">{lang === 'en' ? 'AI Infringement Scanner' : 'Quét vi phạm bản quyền bằng AI'}</h3>
                <p className="text-slate-400 text-sm">
                  {lang === 'en' ? 'Configure and run an on-demand scan across e-commerce platforms and social media.' : 'Cấu hình và chạy quét theo yêu cầu trên các sàn TMĐT và mạng xã hội.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{lang === 'en' ? 'Target Platforms' : 'Nền tảng mục tiêu'}</label>
                <div className="flex gap-2 flex-wrap">
                  {['Shopee', 'Lazada', 'TikTok Shop', 'Facebook', 'Tiki'].map(p => (
                    <label key={p} className="flex items-center gap-2 px-3 py-1.5 bg-[#0B1623] border border-white/20 rounded-lg text-sm text-white cursor-pointer hover:border-purple-400">
                      <input type="checkbox" defaultChecked className="accent-purple-500" />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{lang === 'en' ? 'Monitored Keywords / Image Hashes' : 'Từ khóa / Mã băm hình ảnh cần theo dõi'}</label>
                <input 
                  type="text" 
                  defaultValue={lang === 'en' ? "OMEGA Logo, Alpha Shampoo" : "Logo OMEGA, Dầu gội Alpha"} 
                  className="w-full bg-[#0B1623] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
              <span className="material-symbols-outlined text-purple-400 text-2xl">info</span>
              <p className="text-sm text-slate-300 flex-1">
                {lang === 'en' ? 'The AI scanner uses OCR and image similarity matching (ResNet-50) to detect counterfeit packaging and cloned logos.' : 'Công cụ quét AI sử dụng OCR và đối chiếu hình ảnh (ResNet-50) để phát hiện bao bì giả và logo nhái.'}
              </p>
              <button 
                onClick={handleManualScan}
                disabled={isScanning}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {isScanning ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {lang === 'en' ? 'Scanning...' : 'Đang quét...'}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    {lang === 'en' ? 'Run Scan Now' : 'Bắt đầu quét'}
                  </>
                )}
              </button>
            </div>
            
            {notification && activeTab === 'infringements' && (
              <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                <span className="material-symbols-outlined">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
                <p className="text-sm font-bold">{notification.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "protection" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left: Documents List */}
            <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-400">verified</span>
                {lang === 'en' ? 'Active Legal Profiles' : 'Hồ sơ pháp lý hiện có'}
              </h3>
              
              <div className="space-y-3">
                {[
                  { type: lang === 'en' ? "Trademark Registration" : "Giấy chứng nhận nhãn hiệu", id: "VN-12345", name: "OMEGA Logo", date: "12/05/2025" },
                  { type: lang === 'en' ? "Patent Document" : "Bằng độc quyền kiểu dáng", id: "KD-9876", name: "Chai dầu gội Alpha", date: "20/11/2026" },
                  { type: lang === 'en' ? "Business License" : "Giấy phép kinh doanh", id: "0101234567", name: "Alpha Pharmaceutical Co.", date: "15/01/2030" },
                ].map((doc, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{doc.name}</p>
                      <p className="text-xs text-slate-400">{doc.type} • ID: {doc.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-1">{lang === 'en' ? 'Valid until' : 'Hiệu lực đến'}</p>
                      <p className="text-sm font-bold text-green-400">{doc.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Upload Form */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 h-fit">
              <h3 className="text-lg font-bold text-white mb-4">
                {lang === 'en' ? 'Add Protection Profile' : 'Thêm hồ sơ bảo hộ'}
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {lang === 'en' ? 'Upload trademark certificates or patents to automate Takedown Requests.' : 'Tải lên giấy chứng nhận nhãn hiệu hoặc bằng sáng chế để tự động hóa yêu cầu gỡ bỏ vi phạm (Takedown Request).'}
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{lang === 'en' ? 'Document Type' : 'Loại giấy tờ'}</label>
                  <select className="w-full bg-[#0B1623] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-400 outline-none">
                    <option>{lang === 'en' ? 'Trademark Certificate' : 'Giấy chứng nhận nhãn hiệu'}</option>
                    <option>{lang === 'en' ? 'Patent Certificate' : 'Bằng độc quyền sáng chế/kiểu dáng'}</option>
                    <option>{lang === 'en' ? 'Copyright Registration' : 'Giấy chứng nhận quyền tác giả'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{lang === 'en' ? 'Registration ID' : 'Mã số đăng ký'}</label>
                  <input type="text" placeholder="VD: VN-XXXXX" className="w-full bg-[#0B1623] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-400 outline-none" />
                </div>
                
                <div 
                  className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-purple-400 transition cursor-pointer relative"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-green-400 text-3xl mb-2">task</span>
                      <p className="text-sm text-white font-bold">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">upload_file</span>
                      <p className="text-xs text-slate-300 font-bold">{lang === 'en' ? 'Click to upload PDF/JPG' : 'Bấm để tải lên PDF/JPG'}</p>
                    </>
                  )}
                </div>
              </div>

              {notification && activeTab === 'protection' && (
                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  <span className="material-symbols-outlined text-lg">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
                  <p className="text-xs font-bold">{notification.message}</p>
                </div>
              )}

              <button 
                onClick={handleAddProtection}
                disabled={isProtecting}
                className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition disabled:opacity-50"
              >
                {isProtecting ? "..." : (lang === 'en' ? 'Submit Document' : 'Gửi hồ sơ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
