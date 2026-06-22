"use client";
// UC14 — Admin cấu hình hệ thống: ngưỡng AI, retention, email/SMS toggle
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfigItem {
  value: string;
  moTa?: string | null;
  source?: 'db' | 'default';
  ngayCapNhat?: string;
  capNhatBoi?: string;
}
type ConfigNS = Record<string, ConfigItem>;
interface ConfigData {
  alert: ConfigNS;
  notification: ConfigNS;
  retention: ConfigNS;
}

const NS_META: Record<string, { label: string; en: string; icon: string; color: string }> = {
  alert:        { label: "Ngưỡng cảnh báo",   en: "Alert thresholds",   icon: "warning",   color: "text-red-300" },
  notification: { label: "Thông báo",         en: "Notification",       icon: "notifications", color: "text-amber-300" },
  retention:    { label: "Lưu trữ dữ liệu",   en: "Data retention",     icon: "history",   color: "text-blue-300" },
};

export default function SystemConfigPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [data, setData] = useState<ConfigData | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});  // key → new value
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    const r = localStorage.getItem("userRole");
    if (r !== "admin") { router.replace("/dashboard?error=forbidden"); return; }
    fetchAll();
  }, [router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/system-config", { cache: "no-store" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Fetch failed");
      // API trả { config: { alert, notification, retention } } — phải đọc json.config
      setData(json.config ?? json);
    } catch (e: any) { setToast({ msg: e.message, ok: false }); }
    finally { setLoading(false); }
  }, []);

  const saveKey = async (key: string, namespace: string) => {
    const value = edits[key] ?? data?.[namespace as keyof ConfigData]?.[key]?.value;
    if (value === undefined) return;
    setSaving(key);
    try {
      const r = await fetch("/api/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace, key, value }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Save failed");
      setToast({ msg: tr(`Đã cập nhật ${key}`, `Updated ${key}`), ok: true });
      // Clear edit + refetch
      setEdits(e => { const n = { ...e }; delete n[key]; return n; });
      await fetchAll();
    } catch (e: any) { setToast({ msg: e.message, ok: false }); }
    finally {
      setSaving(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const resetKey = async (key: string, namespace: string) => {
    if (!confirm(tr(`Reset ${key} về default?`, `Reset ${key} to default?`))) return;
    setSaving(key);
    try {
      const r = await fetch(`/api/system-config?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(((await r.json()) as any).error || "Reset failed");
      setToast({ msg: tr(`Đã reset ${key}`, `Reset ${key}`), ok: true });
      setEdits(e => { const n = { ...e }; delete n[key]; return n; });
      await fetchAll();
    } catch (e: any) { setToast({ msg: e.message, ok: false }); }
    finally {
      setSaving(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 pb-[100px] md:pb-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">UC14 · Admin</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            {tr("Cấu hình hệ thống", "System configuration")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {tr("Điều chỉnh ngưỡng AI, retention, kênh thông báo toàn hệ thống",
                "Adjust AI thresholds, retention, notification channels")}
          </p>
        </div>
        <Link href="/dashboard" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> {tr("Quay lại", "Back")}
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-10 h-10 border-2 border-[#C8A557] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-slate-400">{tr("Không có dữ liệu", "No data")}</p>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {(Object.keys(NS_META) as Array<keyof typeof NS_META>).map(ns => {
            const meta = NS_META[ns];
            const items = data[ns as keyof ConfigData] || {};
            return (
              <div key={ns} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2 bg-[#C8A557]/5">
                  <span className={`material-symbols-outlined ${meta.color}`}>{meta.icon}</span>
                  <h2 className="text-sm font-bold text-white">{lang === 'en' ? meta.en : meta.label}</h2>
                  <span className="ml-auto text-[10px] text-slate-500 font-mono">{Object.keys(items).length} keys</span>
                </div>
                <div className="divide-y divide-white/5">
                  {Object.entries(items).map(([key, item]) => {
                    const currentEdit = edits[key];
                    const displayValue = currentEdit ?? item.value;
                    const isDirty = currentEdit !== undefined && currentEdit !== item.value;
                    return (
                      <div key={key} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <code className="text-xs text-[#C8A557] font-mono">{key}</code>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.moTa || tr("(không có mô tả)", "(no description)")}</p>
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.source === 'db' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                            {item.source === 'db' ? 'custom' : 'default'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={displayValue} onChange={e => setEdits(ed => ({ ...ed, [key]: e.target.value }))}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-[#C8A557]/50" />
                          {isDirty && (
                            <button onClick={() => saveKey(key, ns)} disabled={saving === key}
                              className="px-3 py-1.5 rounded-lg bg-[#C8A557]/20 text-[#C8A557] border border-[#C8A557]/30 text-xs font-bold hover:bg-[#C8A557]/30 disabled:opacity-50 flex items-center gap-1">
                              {saving === key && <span className="w-3 h-3 border border-[#C8A557] border-t-transparent rounded-full animate-spin" />}
                              {tr("Lưu", "Save")}
                            </button>
                          )}
                          {item.source === 'db' && !isDirty && (
                            <button onClick={() => resetKey(key, ns)} disabled={saving === key}
                              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50">
                              {tr("Reset", "Reset")}
                            </button>
                          )}
                        </div>
                        {item.ngayCapNhat && (
                          <p className="text-[9px] text-slate-500 mt-1 font-mono">
                            {tr("Cập nhật lần cuối:", "Last updated:")} {new Date(item.ngayCapNhat).toLocaleString('vi-VN')} · {item.capNhatBoi || 'admin'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
