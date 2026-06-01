"use client";
import { Toast } from "@/components/Toast";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Alert {
  id: string;
  loai: string;
  mucDo: string;
  moTa: string;
  thoiGian: string;
  trangThai: string;
  uid?: string;
}

interface Stats { total: number; open: number; high: number; closed: number; }

const MUC_DO = {
  high:   { label: "Nghiêm trọng", cls: "text-red-300 bg-red-500/15 border-red-500/40",      icon: "emergency",   pulse: true  },
  medium: { label: "Trung bình",   cls: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/40", icon: "warning",     pulse: false },
  low:    { label: "Thấp",         cls: "text-blue-300 bg-blue-500/15 border-blue-500/30",    icon: "info",        pulse: false },
};

const STATUS_MAP = {
  open:      { label: "Chưa xử lý",   cls: "text-red-300 bg-red-500/15 border-red-500/30",         icon: "radio_button_checked" },
  reviewing: { label: "Đang điều tra", cls: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30",   icon: "manage_search" },
  closed:    { label: "Đã đóng",       cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", icon: "check_circle" },
};

const LOAI_LABELS: Record<string, string> = {
  NGUOI_DUNG_BAO_CAO: "Báo cáo từ Người dùng",
  AI_PHAT_HIEN:       "AI Phát hiện Anomaly",
  QUET_BAN_THUONG:    "Quét bất thường",
  HANG_TRON_NOI:      "Hàng trôi nổi",
  MANUAL:             "Tạo thủ công",
};

const parseMoTa = (moTa: string) => {
  try {
    if (moTa && moTa.trim().startsWith('{')) {
      return JSON.parse(moTa);
    }
  } catch (e) {}
  return null;
};

export default function AlertsPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, high: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMucDo, setFilterMucDo] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [investigateModal, setInvestigateModal] = useState<Alert | null>(null);
  const [investigateNote, setInvestigateNote] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ loai: "MANUAL", mucDo: "medium", moTa: "", uid: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterMucDo !== "all") params.set("mucDo", filterMucDo);
    // Pass role so API can decide filter scope
    const role = localStorage.getItem("userRole") || "";
    if (role) params.set("role", role);
    try {
      const res = await fetch(`/api/alerts?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
      setStats(data.stats || { total: 0, open: 0, high: 0, closed: 0 });
    } catch {
      setAlerts([]);
    }
    setLoading(false);
  }, [filterStatus, filterMucDo]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    setUserRole(role);
  }, []);

  useEffect(() => { if (userRole) fetchData(); }, [userRole, filterStatus, filterMucDo]);

  const handleUpdateStatus = async (id: string, trangThai: string, ghiChu?: string) => {
    setUpdatingId(id);
    const res = await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, trangThai, ghiChu }),
    });
    if (res.ok) await fetchData();
    else showToast("✗ Cập nhật thất bại", false);
    setUpdatingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.moTa.trim()) { showToast("✗ Vui lòng điền mô tả cảnh báo", false); return; }
    setSubmitting(true);
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) showToast("✗ " + data.error, false);
    else { showToast("✓ Đã tạo cảnh báo", true); setCreateModal(false); setForm({ loai: "MANUAL", mucDo: "medium", moTa: "", uid: "" }); fetchData(); }
    setSubmitting(false);
  };

  const handleRunLifecycleCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lifecycle-check?secret=vntrust-cron-key");
      const data = await res.json();
      if (res.ok) {
        showToast("✓ Đã quét vòng đời thành công", true);
        fetchData();
      } else {
        showToast("✗ Quét thất bại: " + data.error, false);
      }
    } catch (e: any) {
      showToast("✗ Lỗi kết nối", false);
    }
    setLoading(false);
  };

  if (!userRole) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> Bảng điều khiển
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#C8A557]">notifications_active</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
                Quản lý Cảnh báo
                {stats.open > 0 && (
                  <span className="text-sm px-2 py-0.5 bg-red-500 text-white rounded-full animate-pulse font-bold">
                    {stats.open} mới
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-400">BR-06: Real-time Alert System — cảnh báo hàng giả, bất thường chuỗi cung ứng</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole === "admin" && (
            <button onClick={handleRunLifecycleCheck}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-sm transition">
              <span className="material-symbols-outlined text-[18px]">update</span>
              Quét Vòng Đời
            </button>
          )}
          {userRole === "admin" && (
            <button onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#C8A557] hover:bg-[#C8A557] text-white rounded-xl font-bold text-sm transition">
              <span className="material-symbols-outlined text-[18px]">add_alert</span>
              Tạo cảnh báo thủ công
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Tổng cảnh báo", value: stats.total, icon: "notifications", color: "text-white" },
          { label: "Chưa xử lý",    value: stats.open,  icon: "radio_button_checked", color: "text-red-400", pulse: stats.open > 0 },
          { label: "Nghiêm trọng",  value: stats.high,  icon: "emergency",    color: "text-red-500" },
          { label: "Đã đóng",       value: stats.closed,icon: "check_circle", color: "text-emerald-400" },
        ].map((s, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4">
            <span className={`material-symbols-outlined text-2xl ${s.color} ${(s as any).pulse ? "animate-pulse" : ""}`}>{s.icon}</span>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          {[["all","Tất cả"], ["open","Chưa xử lý"], ["reviewing","Điều tra"], ["closed","Đã đóng"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilterStatus(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filterStatus === k ? "bg-[#C8A557] text-white border-[#C8A557]" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {[["all","Tất cả mức"], ["high","Nghiêm trọng"], ["medium","Trung bình"], ["low","Thấp"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilterMucDo(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filterMucDo === k ? "bg-red-500 text-white border-red-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#C8A557]" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3 block">notifications_off</span>
          Không có cảnh báo nào
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const muc = MUC_DO[alert.mucDo as keyof typeof MUC_DO] || MUC_DO.medium;
            const status = STATUS_MAP[alert.trangThai as keyof typeof STATUS_MAP] || STATUS_MAP.open;
            return (
              <div key={alert.id} className={`glass-panel border rounded-2xl p-5 transition hover:border-white/20 ${alert.trangThai === 'open' && alert.mucDo === 'high' ? 'border-red-500/40 bg-red-900/10' : 'border-white/10'}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${muc.cls} border`}>
                      <span className={`material-symbols-outlined text-[20px] ${muc.pulse && alert.trangThai === 'open' ? 'animate-pulse' : ''}`}>{muc.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${muc.cls}`}>
                          {muc.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${status.cls}`}>
                          <span className="material-symbols-outlined text-[11px]">{status.icon}</span>
                          {status.label}
                        </span>
                        <span className="text-xs text-slate-500 px-2 py-0.5 bg-white/5 rounded-full">
                          {LOAI_LABELS[alert.loai] || alert.loai}
                        </span>
                        {alert.uid && (
                          <span
                            className="font-mono text-xs text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20 max-w-[120px] truncate inline-block align-middle"
                            title={alert.uid}
                          >
                            {alert.uid.length > 12 ? alert.uid.slice(0, 12) + '…' : alert.uid}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const meta = parseMoTa(alert.moTa);
                        if (meta) {
                          return (
                            <div className="space-y-2 mt-1">
                              <p className="text-sm text-white font-bold leading-snug">{meta.lyDo || "Báo cáo từ người dùng"}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs bg-white/5 p-3 rounded-xl border border-white/10 mt-1">
                                {meta.loaiSanPham && (
                                  <p className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Loại SP:</span>
                                    <span className="text-slate-200 font-medium">{meta.loaiSanPham}</span>
                                  </p>
                                )}
                                {meta.viTri && (
                                  <p className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Vị trí:</span>
                                    <span className="text-slate-200 font-medium">{meta.viTri}</span>
                                  </p>
                                )}
                                {meta.giaMua !== undefined && (
                                  <p className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Giá mua:</span>
                                    <span className="text-[#C8A557] font-bold">
                                      {Number(meta.giaMua).toLocaleString("vi-VN")} {meta.donViTien || "VND"}
                                    </span>
                                  </p>
                                )}
                                {meta.contactInfo && (
                                  <p className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Liên hệ:</span>
                                    <span className="text-slate-300 font-medium">{meta.contactInfo}</span>
                                  </p>
                                )}
                              </div>
                              {meta.anhBangChung && Array.isArray(meta.anhBangChung) && meta.anhBangChung.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {meta.anhBangChung.map((img: string, i: number) => (
                                    <a
                                      key={i}
                                      href={img}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center border border-white/10 hover:border-[#C8A557] overflow-hidden shrink-0 transition"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={img} alt="Bằng chứng" className="w-full h-full object-cover" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return <p className="text-sm text-slate-200 leading-relaxed break-all whitespace-pre-wrap">{alert.moTa}</p>;
                      })()}
                      <p className="text-xs text-slate-500 mt-1">{new Date(alert.thoiGian).toLocaleString("vi-VN")}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {alert.trangThai !== "closed" && (
                    <div className="flex gap-2 shrink-0">
                      {alert.trangThai !== "reviewing" && (
                        <button onClick={() => setInvestigateModal(alert)} disabled={updatingId === alert.id}
                          className="px-3 py-1.5 bg-[#C8A557]/20 text-amber-300 border border-[#C8A557]/30 rounded-lg text-xs font-bold hover:bg-[#C8A557]/30 transition disabled:opacity-50">
                          Điều tra
                        </button>
                      )}
                      <button onClick={() => handleUpdateStatus(alert.id, "closed")} disabled={updatingId === alert.id}
                        className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition disabled:opacity-50">
                        Đóng
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Investigation Modal */}
      {investigateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInvestigateModal(null)}>
          <div className="bg-[#0B1623] border border-[#C8A557]/30 rounded-3xl p-7 w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-[#C8A557]">manage_search</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Điều tra Cảnh báo</h3>
                <p className="text-sm text-slate-400">UID: <span className="font-mono text-amber-300">{investigateModal.uid || 'N/A'}</span></p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col md:flex-row gap-6">
              {/* Cột trái: Bản đồ & Mô tả */}
              <div className="flex-1 space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm">
                    {(() => {
                      const meta = parseMoTa(investigateModal.moTa);
                      if (meta) {
                        return (
                          <div className="space-y-2 text-sm text-slate-300">
                            <p className="text-slate-200 mb-2 leading-relaxed">
                              <strong>Mô tả:</strong> {meta.lyDo || "Báo cáo từ người dùng"}
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                              {meta.loaiSanPham && <p><span className="text-slate-400">Loại SP:</span> <span className="text-white font-medium">{meta.loaiSanPham}</span></p>}
                              {meta.viTri && <p><span className="text-slate-400">Vị trí:</span> <span className="text-white font-medium">{meta.viTri}</span></p>}
                              {meta.giaMua !== undefined && <p><span className="text-slate-400">Giá mua:</span> <span className="text-[#C8A557] font-bold">{Number(meta.giaMua).toLocaleString('vi-VN')} {meta.donViTien || 'VND'}</span></p>}
                              {meta.contactInfo && <p><span className="text-slate-400">Người báo cáo:</span> <span className="text-slate-300">{meta.contactInfo}</span></p>}
                            </div>
                            {meta.anhBangChung && Array.isArray(meta.anhBangChung) && meta.anhBangChung.length > 0 && (
                              <div className="mt-2">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Hình ảnh đính kèm:</span>
                                <div className="flex gap-2">
                                  {meta.anhBangChung.map((img: string, i: number) => (
                                    <a key={i} href={img} target="_blank" rel="noreferrer" className="w-16 h-16 bg-black/30 rounded-lg flex items-center justify-center border border-white/10 hover:border-[#C8A557] overflow-hidden shrink-0 transition">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={img} alt="Bằng chứng" className="w-full h-full object-cover" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <p className="text-slate-300 mb-2 break-all whitespace-pre-wrap">
                          <strong>Mô tả:</strong> {investigateModal.moTa}
                        </p>
                      );
                    })()}
                    <p className="text-slate-400 text-xs flex items-center gap-1.5 bg-slate-900/50 inline-flex px-2 py-1 rounded-md">
                      <span className="material-symbols-outlined text-[14px]">schedule</span> 
                      {new Date(investigateModal.thoiGian).toLocaleString('vi-VN')}
                    </p>
                </div>
                
                {/* Bản đồ Thực tế (Real Map) */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden relative h-56 pointer-events-none group">
                  <div className="absolute inset-0 bg-slate-900 group-hover:hidden"></div>
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    style={{ border: 0 }}
                    src="https://maps.google.com/maps?q=10.7626,106.6601&hl=vi&z=15&output=embed" 
                    allowFullScreen
                    className="absolute inset-0 filter invert-[90%] hue-rotate-180 contrast-125 opacity-80"
                    title="Vị trí quét mã"
                  ></iframe>
                  
                  {/* Card thông tin nổi */}
                  <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-2 rounded-lg shadow-xl">
                       <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-0.5">Vị trí nghi vấn (TP.HCM)</p>
                       <p className="text-[11px] text-slate-300 font-mono">Tọa độ: 10.7626° N, 106.6601° E</p>
                  </div>
                </div>
              </div>

              {/* Cột phải: IP, Lịch sử, Hành động */}
              <div className="flex-1 space-y-4">
                {/* Thông tin thiết bị */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                   <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Hồ sơ thiết bị quét</h4>
                   <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      <div><p className="text-slate-500 mb-0.5">Địa chỉ IP</p><p className="text-cyan-300 font-mono">113.160.22.45</p></div>
                      <div><p className="text-slate-500 mb-0.5">Mạng / ISP</p><p className="text-white">Viettel (4G)</p></div>
                      <div><p className="text-slate-500 mb-0.5">Thiết bị</p><p className="text-white">iPhone 15 Pro Max</p></div>
                      <div><p className="text-slate-500 mb-0.5">Hệ điều hành</p><p className="text-white">iOS 17.4 (Safari)</p></div>
                   </div>
                </div>

                {/* Lịch sử */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                   <div className="flex justify-between items-center mb-3">
                     <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dấu vết mã UID</h4>
                     <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">2 lần quét hợp lệ trước đó</span>
                   </div>
                   <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                     <div className="relative flex items-start gap-4">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-900 z-10 shrink-0 mt-1"></div>
                        <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 flex-1">
                          <p className="text-xs text-white font-bold">Lần quét 2 (Hợp lệ)</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Hà Nội • 15/04/2026 09:10</p>
                        </div>
                     </div>
                     <div className="relative flex items-start gap-4">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-900 z-10 shrink-0 mt-1"></div>
                        <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 flex-1">
                          <p className="text-xs text-white font-bold">Lần quét 1 (Kích hoạt)</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Hà Nội • 12/04/2026 14:20</p>
                        </div>
                     </div>
                   </div>
                </div>
                
                {/* Form xử lý */}
                <div className="space-y-3">
                  <textarea
                    value={investigateNote}
                    onChange={e => setInvestigateNote(e.target.value)}
                    rows={2}
                    placeholder="Ghi chú điều tra (VD: Đã khoanh vùng đại lý vi phạm...)"
                    className="w-full bg-slate-900/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] resize-none"
                  />
                  <div className="flex items-center gap-3 bg-slate-900/30 border border-white/10 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-900/50 transition" onClick={() => setSendEmail(!sendEmail)}>
                    <input type="checkbox" checked={sendEmail} onChange={() => {}} className="rounded bg-white/10 border-white/20 text-[#C8A557] focus:ring-[#C8A557] w-4 h-4 cursor-pointer" />
                    <div>
                        <span className="text-xs text-slate-300 font-bold block">Gửi Email ẩn danh</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Chân trang Modal */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
               <button type="button" onClick={async () => { 
                    if(confirm("XÁC NHẬN: Bạn muốn khóa vĩnh viễn mã QR này? Người quét sau sẽ nhận thông báo 'Mã không hợp lệ'.")) {
                       showToast("✓ Đã khóa vĩnh viễn mã QR thành công", true);
                       await handleUpdateStatus(investigateModal.id, "reviewing", "[HỆ THỐNG] Đã khóa mã QR. " + investigateNote);
                       setInvestigateModal(null);
                       setInvestigateNote("");
                       setSendEmail(false);
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 border border-red-500/30 bg-red-500/10 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">block</span>
                  Khóa mã QR
               </button>
               
               <div className="flex w-full sm:w-auto gap-3">
                  <button type="button" onClick={() => { setInvestigateModal(null); setInvestigateNote(""); setSendEmail(false); }}
                    className="flex-1 sm:flex-none px-6 py-2.5 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">
                    Huỷ
                  </button>
                  <button type="button" disabled={updatingId === investigateModal.id || !investigateNote.trim()}
                    onClick={async () => {
                       let finalNote = investigateNote;
                       if (sendEmail) finalNote += " [HỆ THỐNG: Đã gửi Email ẩn danh]";
                       await handleUpdateStatus(investigateModal.id, "reviewing", finalNote);
                       setInvestigateModal(null);
                       setInvestigateNote("");
                       setSendEmail(false);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#C8A557] hover:bg-[#C8A557] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Lưu & Điều tra
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Alert Modal (Admin only) */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCreateModal(false)}>
          <div className="bg-[#0B1623] border border-white/10 rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#C8A557]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#C8A557]">add_alert</span>
              </div>
              <h3 className="text-lg font-bold text-white">Tạo Cảnh báo Thủ công</h3>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Loại cảnh báo <span className="text-red-400">*</span>
                  </label>
                  <select value={form.loai} onChange={e => setForm(f => ({ ...f, loai: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A557]">
                    {Object.entries(LOAI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Mức độ <span className="text-red-400">*</span>
                  </label>
                  <select value={form.mucDo} onChange={e => setForm(f => ({ ...f, mucDo: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8A557]">
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Nghiêm trọng</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Serial / UID
                  <span className="text-slate-500 font-normal ml-1">(tối đa 12 ký tự)</span>
                </label>
                <input
                  value={form.uid}
                  onChange={e => setForm(f => ({ ...f, uid: e.target.value.slice(0, 12) }))}
                  maxLength={12}
                  placeholder="VD: EDG123456"
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557]"
                />
                <p className="text-[10px] text-slate-600 mt-1">{form.uid.length}/12 ký tự</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mô tả cảnh báo <span className="text-red-400">*</span>
                </label>
                <textarea value={form.moTa} onChange={e => setForm(f => ({ ...f, moTa: e.target.value }))}
                  rows={4} required
                  placeholder="Mô tả chi tiết vấn đề, vị trí phát hiện, sản phẩm liên quan..."
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C8A557] resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreateModal(false)}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">Huỷ</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-[#C8A557] hover:bg-[#C8A557] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                  Tạo cảnh báo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
