"use client";
// §I PH6 — UI cho DN tự cấu hình webhook ERP outbound
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface Webhook {
  id: string;
  doanhNghiepId: string;
  endpointUrl: string;
  secret: string;       // masked
  events: string;
  retryMax: number;
  trangThai: string;
  ngayTao: string;
}

const ALL_EVENTS = [
  { value: 'batch.suspend',       label: 'Lô bị tạm khóa',         color: 'text-red-300' },
  { value: 'batch.recall',        label: 'Lô bị thu hồi',          color: 'text-red-400' },
  { value: 'batch.ready',         label: 'Lô sẵn sàng',            color: 'text-emerald-300' },
  { value: 'cert.expire',         label: 'Chứng nhận hết hạn',     color: 'text-amber-300' },
  { value: 'cert.expiring_soon',  label: 'CN sắp hết hạn',         color: 'text-amber-200' },
  { value: 'haukiem.violation',   label: 'Hậu kiểm vi phạm',       color: 'text-red-300' },
  { value: 'alert.escalated',     label: 'Cảnh báo leo thang',     color: 'text-orange-300' },
  { value: '*',                   label: 'TẤT CẢ events',          color: 'text-[#C8A557]' },
];

export default function WebhookPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [role, setRole] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Form state
  const [endpointUrl, setEndpointUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['*']);
  const [retryMax, setRetryMax] = useState(3);

  useEffect(() => {
    const r = localStorage.getItem("userRole");
    if (!r) { router.replace("/login"); return; }
    if (!["admin", "manufacturer", "importer"].includes(r)) {
      router.replace("/dashboard?error=forbidden"); return;
    }
    setRole(r);
  }, [router]);

  const fetchHooks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/webhook", { cache: "no-store" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Fetch failed");
      setWebhooks(json.webhooks || []);
    } catch (e: any) { setToast({ msg: e.message, ok: false }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (role) fetchHooks(); }, [role, fetchHooks]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleEvent = (e: string) => {
    setSelectedEvents(prev => {
      if (e === '*') return prev.includes('*') ? [] : ['*'];
      const without = prev.filter(x => x !== '*');
      return without.includes(e) ? without.filter(x => x !== e) : [...without, e];
    });
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let s = 'whk_';
    for (let i = 0; i < 40; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setSecret(s);
  };

  const createHook = async () => {
    if (!endpointUrl || !secret || selectedEvents.length === 0) {
      showToast(tr("Vui lòng điền đầy đủ", "Fill all required fields"), false);
      return;
    }
    setActing("create");
    try {
      const r = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointUrl, secret, events: selectedEvents.join(','), retryMax }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Create failed");
      showToast(tr("Đã tạo webhook", "Webhook created"));
      setShowAddModal(false);
      setEndpointUrl(""); setSecret(""); setSelectedEvents(['*']); setRetryMax(3);
      await fetchHooks();
    } catch (e: any) { showToast(e.message, false); }
    finally { setActing(null); }
  };

  const deleteHook = async (id: string) => {
    if (!confirm(tr("Xóa webhook này?", "Delete this webhook?"))) return;
    setActing(id);
    try {
      const r = await fetch(`/api/webhook?id=${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(((await r.json()) as any).error || "Delete failed");
      showToast(tr("Đã xóa", "Deleted"));
      await fetchHooks();
    } catch (e: any) { showToast(e.message, false); }
    finally { setActing(null); }
  };

  const testHook = async (id: string) => {
    setActing(id);
    try {
      const r = await fetch(`/api/webhook/test?id=${id}`, { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Test failed");
      showToast(tr(`Test: HTTP ${json.statusCode || 'OK'}`, `Test: HTTP ${json.statusCode || 'OK'}`),
                json.success !== false);
    } catch (e: any) { showToast(e.message, false); }
    finally { setActing(null); }
  };

  if (!role) return null;

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 pb-[100px] md:pb-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">§I PH6 · Tích hợp ERP</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            {tr("Webhook ERP", "ERP Webhooks")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {tr("Đăng ký endpoint URL để nhận events khi có sự kiện trên hệ thống (HMAC-SHA256 signed)",
                "Register endpoint URL to receive events (HMAC-SHA256 signed)")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> {tr("Quay lại", "Back")}
          </Link>
          <button onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] font-bold text-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">add_link</span>
            {tr("Thêm webhook", "Add webhook")}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs text-blue-200 flex items-start gap-2">
        <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
        <p>
          {tr("Mỗi webhook payload sẽ kèm header ", "Each webhook will include header ")}
          <code className="bg-black/30 px-1 rounded text-[#C8A557]">X-VNTrust-Signature</code>
          {tr(" = HMAC-SHA256(secret, body). ERP của bạn cần verify chữ ký này để đảm bảo nguồn.",
              " = HMAC-SHA256(secret, body). Your ERP must verify this signature.")}
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><span className="w-10 h-10 border-2 border-[#C8A557] border-t-transparent rounded-full animate-spin" /></div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
          <span className="material-symbols-outlined text-5xl text-slate-600 mb-3">webhook</span>
          <p className="text-slate-400 mb-3">{tr("Chưa có webhook nào", "No webhooks configured")}</p>
          <button onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#C8A557]/20 text-[#C8A557] border border-[#C8A557]/30 text-sm font-bold hover:bg-[#C8A557]/30">
            {tr("+ Thêm webhook đầu tiên", "+ Add first webhook")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  wh.trangThai === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'
                }`}>
                  <span className="material-symbols-outlined">webhook</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold font-mono text-sm break-all">{wh.endpointUrl}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {wh.events.split(',').map(e => {
                      const meta = ALL_EVENTS.find(x => x.value === e.trim());
                      return (
                        <span key={e} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 ${meta?.color || 'text-slate-300'}`}>
                          {meta?.label || e.trim()}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Secret: {wh.secret} · Retry max: {wh.retryMax} ·
                    {tr(" Tạo:", " Created:")} {new Date(wh.ngayTao).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  wh.trangThai === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                }`}>{wh.trangThai}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => testHook(wh.id)} disabled={acting === wh.id}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-bold hover:bg-blue-500/25 disabled:opacity-50">
                  <span className="material-symbols-outlined text-[13px] align-middle mr-1">send</span>
                  {tr("Test ping", "Test ping")}
                </button>
                <button onClick={() => deleteHook(wh.id)} disabled={acting === wh.id}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-bold hover:bg-red-500/25 disabled:opacity-50">
                  <span className="material-symbols-outlined text-[13px] align-middle mr-1">delete</span>
                  {tr("Xóa", "Delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4 pb-[88px] md:pb-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#0B1623] border border-[#C8A557]/30 rounded-2xl max-w-md w-full max-h-[calc(100dvh-168px)] md:max-h-[88dvh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">{tr("Thêm webhook mới", "Add new webhook")}</h3>
            <p className="text-xs text-slate-400 mb-4">{tr("Endpoint sẽ nhận POST request với payload JSON + signature", "Endpoint receives POST with JSON + signature")}</p>

            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Endpoint URL *</label>
            <input type="url" value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)}
              placeholder="https://erp.congty.vn/api/vntrust/webhook"
              className="w-full mb-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#C8A557]/50" />

            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Secret * (HMAC key)</label>
            <div className="flex gap-2 mb-3">
              <input type="text" value={secret} onChange={e => setSecret(e.target.value)}
                placeholder="whk_..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#C8A557]/50" />
              <button onClick={generateSecret} className="px-3 py-2 rounded-xl bg-[#C8A557]/20 text-[#C8A557] border border-[#C8A557]/30 text-xs font-bold">
                {tr("Gen", "Gen")}
              </button>
            </div>

            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{tr("Events đăng ký *", "Events *")}</label>
            <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
              {ALL_EVENTS.map(e => (
                <label key={e.value} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={selectedEvents.includes(e.value)} onChange={() => toggleEvent(e.value)}
                    className="w-4 h-4 accent-[#C8A557]" />
                  <span className={`text-xs font-bold ${e.color}`}>{e.label}</span>
                  <code className="ml-auto text-[10px] text-slate-500 font-mono">{e.value}</code>
                </label>
              ))}
            </div>

            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Retry max</label>
            <input type="number" value={retryMax} min={1} max={10} onChange={e => setRetryMax(parseInt(e.target.value) || 3)}
              className="w-20 mb-4 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8A557]/50" />

            <div className="flex gap-2 sticky bottom-0 bg-[#0B1623] pt-3 -mx-1 px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold">
                {tr("Hủy", "Cancel")}
              </button>
              <button onClick={createHook} disabled={acting === "create"}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] text-sm font-bold disabled:opacity-50">
                {acting === "create" ? tr("Đang tạo…", "Creating…") : tr("Tạo webhook", "Create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-[90px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-bold border shadow-lg backdrop-blur ${
          toast.ok ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" : "bg-red-500/15 border-red-500/40 text-red-200"
        }`}>{toast.msg}</div>
      )}
    </div>
  );
}
