"use client";
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
  medium: { label: "Trung bình",   cls: "text-amber-300 bg-amber-500/15 border-amber-500/40", icon: "warning",     pulse: false },
  low:    { label: "Thấp",         cls: "text-blue-300 bg-blue-500/15 border-blue-500/30",    icon: "info",        pulse: false },
};

const STATUS_MAP = {
  open:      { label: "Chưa xử lý",   cls: "text-red-300 bg-red-500/15 border-red-500/30",         icon: "radio_button_checked" },
  reviewing: { label: "Đang điều tra", cls: "text-amber-300 bg-amber-500/15 border-amber-500/30",   icon: "manage_search" },
  closed:    { label: "Đã đóng",       cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", icon: "check_circle" },
};

const LOAI_LABELS: Record<string, string> = {
  NGUOI_DUNG_BAO_CAO: "Báo cáo từ Người dùng",
  AI_PHAT_HIEN:       "AI Phát hiện Anomaly",
  QUET_BAN_THUONG:    "Quét bất thường",
  HANG_TRON_NOI:      "Hàng trôi nổi",
  MANUAL:             "Tạo thủ công",
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
        <div className={`fixed bottom-8 right-8 z-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl ${toast.ok ? "bg-emerald-600" : "bg-red-600"} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span> Bảng điều khiển
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-400">notifications_active</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-headline flex items-center gap-2">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold text-sm transition">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filterStatus === k ? "bg-amber-500 text-white border-amber-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
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
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400" />
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
                      <p className="text-sm text-slate-200 leading-relaxed">{alert.moTa}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(alert.thoiGian).toLocaleString("vi-VN")}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {alert.trangThai !== "closed" && (
                    <div className="flex gap-2 shrink-0">
                      {alert.trangThai !== "reviewing" && (
                        <button onClick={() => setInvestigateModal(alert)} disabled={updatingId === alert.id}
                          className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition disabled:opacity-50">
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
          <div className="bg-[#0f1e33] border border-amber-500/30 rounded-3xl p-7 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-400">manage_search</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Điều tra Cảnh báo</h3>
                <p className="text-xs text-slate-400">Cập nhật trạng thái và lưu ghi chú</p>
              </div>
            </div>
            
            <div className="mb-5 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 text-sm">
                <p className="text-slate-300"><strong>UID/Serial:</strong> {investigateModal.uid || 'N/A'}</p>
                <p className="text-slate-300"><strong>Mô tả:</strong> {investigateModal.moTa}</p>
                <p className="text-slate-300 text-xs"><strong>Thời gian:</strong> {new Date(investigateModal.thoiGian).toLocaleString('vi-VN')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Ghi chú điều tra / Kết quả xử lý
                </label>
                <textarea
                  value={investigateNote}
                  onChange={e => setInvestigateNote(e.target.value)}
                  rows={4}
                  placeholder="VD: Đã liên hệ đại lý, xác nhận lỗi in ấn tem nhãn... hoặc phát hiện hàng giả, yêu cầu cơ quan chức năng can thiệp."
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer" onClick={() => setSendEmail(!sendEmail)}>
                <input type="checkbox" checked={sendEmail} onChange={() => {}} className="rounded bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer" />
                <div>
                    <span className="text-sm text-slate-300 font-bold block">Gửi Email thông báo</span>
                    <span className="text-xs text-slate-500 block">Gửi kết quả điều tra ẩn danh (nếu có email)</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setInvestigateModal(null); setInvestigateNote(""); setSendEmail(false); }}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">Huỷ</button>
                <button type="button" disabled={updatingId === investigateModal.id || !investigateNote.trim()}
                  onClick={async () => {
                     let finalNote = investigateNote;
                     if (sendEmail) finalNote += " [HỆ THỐNG: Đã gửi Email kết quả tới người báo cáo]";
                     await handleUpdateStatus(investigateModal.id, "reviewing", finalNote);
                     setInvestigateModal(null);
                     setInvestigateNote("");
                     setSendEmail(false);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
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
          <div className="bg-[#0f1e33] border border-white/10 rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-400">add_alert</span>
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
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400">
                    {Object.entries(LOAI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Mức độ <span className="text-red-400">*</span>
                  </label>
                  <select value={form.mucDo} onChange={e => setForm(f => ({ ...f, mucDo: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400">
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
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
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
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreateModal(false)}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">Huỷ</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
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
