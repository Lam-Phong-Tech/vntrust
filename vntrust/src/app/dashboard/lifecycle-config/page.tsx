"use client";
// §V.4 — UI cho DN tự cấu hình ngưỡng cảnh báo vòng đời
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface Config {
  expWarnDays: number;
  expCriticalDays: number;
  certWarnDays: number;
  certCriticalDays: number;
  autoSuspendExpired: boolean;
  emailFrequency: 'daily' | 'weekly';
  emailRecipients: string[];
  customByNganhHang?: Record<string, { expWarnDays: number; description: string }>;
}

interface FetchResp {
  config: Config;
  defaults: Config;
  isDefault: boolean;
  doanhNghiepId: string | null;
  ranges: {
    expWarnDays: { min: number; max: number };
    certWarnDays: { min: number; max: number };
  };
}

export default function LifecycleConfigPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [role, setRole] = useState<string | null>(null);
  const [data, setData] = useState<FetchResp | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [orig, setOrig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDays, setNewCategoryDays] = useState(60);

  useEffect(() => {
    const r = localStorage.getItem("userRole");
    if (!r) { router.replace("/login"); return; }
    if (!["admin", "manufacturer", "importer"].includes(r)) {
      router.replace("/dashboard?error=forbidden"); return;
    }
    setRole(r);
  }, [router]);

  const fetchConfig = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    try {
      const r = await fetch("/api/lifecycle-config", { cache: "no-store" });
      const json: FetchResp = await r.json();
      if (!r.ok) throw new Error((json as any).error || "Fetch failed");
      setData(json);
      setConfig(json.config);
      setOrig(JSON.parse(JSON.stringify(json.config)));
    } catch (e: any) {
      setToast({ msg: e.message, ok: false });
    } finally { setLoading(false); }
  }, [role]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const isDirty = JSON.stringify(config) !== JSON.stringify(orig);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const r = await fetch("/api/lifecycle-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Save failed");
      setOrig(JSON.parse(JSON.stringify(config)));
      setToast({ msg: tr("Đã lưu cấu hình", "Configuration saved"), ok: true });
    } catch (e: any) {
      setToast({ msg: e.message, ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const resetToDefault = () => {
    if (!data) return;
    if (!confirm(tr("Khôi phục cấu hình mặc định?", "Reset to default config?"))) return;
    setConfig(JSON.parse(JSON.stringify(data.defaults)));
  };

  const addEmail = () => {
    if (!newEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) return;
    setConfig(c => c ? { ...c, emailRecipients: [...c.emailRecipients, newEmail] } : c);
    setNewEmail("");
  };

  const removeEmail = (idx: number) => {
    setConfig(c => c ? { ...c, emailRecipients: c.emailRecipients.filter((_, i) => i !== idx) } : c);
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    setConfig(c => c ? {
      ...c,
      customByNganhHang: {
        ...(c.customByNganhHang || {}),
        [newCategoryName.trim()]: {
          expWarnDays: newCategoryDays,
          description: `${newCategoryName.trim()} — cảnh báo trước ${newCategoryDays} ngày`,
        },
      },
    } : c);
    setNewCategoryName(""); setNewCategoryDays(60);
  };

  const removeCategory = (name: string) => {
    setConfig(c => {
      if (!c?.customByNganhHang) return c;
      const next = { ...c.customByNganhHang };
      delete next[name];
      return { ...c, customByNganhHang: next };
    });
  };

  if (!role) return null;

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 pb-[100px] md:pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">§V.4 — Cảnh báo vòng đời</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            {tr("Cấu hình ngưỡng cảnh báo", "Lifecycle alert config")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {tr("Tùy chỉnh thời gian cảnh báo trước khi sản phẩm/chứng nhận hết hạn",
                "Customize warning periods before product/cert expiry")}
          </p>
        </div>
        <Link href="/dashboard" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> {tr("Quay lại", "Back")}
        </Link>
      </div>

      {loading || !config || !data ? (
        <div className="flex justify-center py-20">
          <span className="w-10 h-10 border-2 border-[#C8A557] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {data.isDefault && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">info</span>
              {tr("Đang dùng cấu hình mặc định — chỉnh sửa và Lưu để áp dụng riêng cho DN của bạn.",
                  "Using default config — edit and save to customize for your enterprise.")}
            </div>
          )}

          {/* ─── EXP warning ─── */}
          <Section icon="schedule" title={tr("Cảnh báo hết hạn sản phẩm (EXP)", "Product expiry (EXP)")}>
            <Range label={tr("Cảnh báo trước (ngày)", "Warning days before")}
              min={data.ranges.expWarnDays.min} max={data.ranges.expWarnDays.max}
              value={config.expWarnDays}
              onChange={v => setConfig({ ...config, expWarnDays: v })} />
            <Range label={tr("Cảnh báo CRITICAL trước (ngày)", "Critical warning days")}
              min={1} max={config.expWarnDays} value={config.expCriticalDays}
              onChange={v => setConfig({ ...config, expCriticalDays: v })} />
            <Toggle label={tr("Tự động chặn xuất kho khi quá hạn", "Auto block expired batches")}
              checked={config.autoSuspendExpired}
              onChange={v => setConfig({ ...config, autoSuspendExpired: v })} />
          </Section>

          {/* ─── Certificate warning ─── */}
          <Section icon="workspace_premium" title={tr("Cảnh báo chứng nhận", "Certificate expiry")}>
            <Range label={tr("Cảnh báo trước (ngày)", "Warning days before")}
              min={data.ranges.certWarnDays.min} max={data.ranges.certWarnDays.max}
              value={config.certWarnDays}
              onChange={v => setConfig({ ...config, certWarnDays: v })} />
            <Range label={tr("Cảnh báo CRITICAL trước (ngày)", "Critical warning days")}
              min={1} max={config.certWarnDays} value={config.certCriticalDays}
              onChange={v => setConfig({ ...config, certCriticalDays: v })} />
          </Section>

          {/* ─── Email notification ─── */}
          <Section icon="mail" title={tr("Thông báo email", "Email notification")}>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr("Tần suất", "Frequency")}</label>
              <div className="flex gap-2">
                {(['daily', 'weekly'] as const).map(f => (
                  <button key={f} onClick={() => setConfig({ ...config, emailFrequency: f })}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border ${
                      config.emailFrequency === f ? "bg-[#C8A557] text-[#0B1623] border-[#C8A557]" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                    }`}>
                    {f === 'daily' ? tr("Hàng ngày", "Daily") : tr("Hàng tuần", "Weekly")}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr("Danh sách nhận email", "Email recipients")}</label>
              <div className="space-y-2 mb-2">
                {config.emailRecipients.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">{tr("Chưa có — sẽ gửi tới admin DN mặc định", "None — will send to default admin")}</p>
                ) : config.emailRecipients.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl">
                    <span className="material-symbols-outlined text-[14px] text-[#C8A557]">mail</span>
                    <span className="text-sm text-white flex-1">{e}</span>
                    <button onClick={() => removeEmail(i)} className="text-red-300 hover:text-red-400 text-xs">Xóa</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="email@congty.vn"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8A557]/50" />
                <button onClick={addEmail} disabled={!newEmail}
                  className="px-4 py-2 rounded-xl bg-[#C8A557]/20 text-[#C8A557] border border-[#C8A557]/30 text-sm font-bold hover:bg-[#C8A557]/30 disabled:opacity-40">
                  + Thêm
                </button>
              </div>
            </div>
          </Section>

          {/* ─── Custom theo ngành ─── */}
          <Section icon="category" title={tr("Tùy chỉnh theo ngành hàng", "Custom by category")}>
            <p className="text-xs text-slate-400 mb-3">
              {tr("Vd: Sữa bột cần cảnh báo trước 60 ngày, mỹ phẩm 90 ngày, dược phẩm 30 ngày",
                  "E.g., milk powder needs 60-day warning, cosmetics 90, pharma 30")}
            </p>
            <div className="space-y-2 mb-3">
              {config.customByNganhHang && Object.entries(config.customByNganhHang).map(([name, cfg]) => (
                <div key={name} className="flex items-center gap-3 p-2.5 bg-white/5 border border-white/10 rounded-xl">
                  <span className="material-symbols-outlined text-[#C8A557]">label</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-bold truncate">{name}</p>
                    <p className="text-[11px] text-slate-400">{cfg.description}</p>
                  </div>
                  <span className="text-sm text-[#C8A557] font-bold">{cfg.expWarnDays}d</span>
                  <button onClick={() => removeCategory(name)} className="text-red-300 hover:text-red-400 text-xs">Xóa</button>
                </div>
              ))}
              {(!config.customByNganhHang || Object.keys(config.customByNganhHang).length === 0) && (
                <p className="text-[11px] text-slate-500 italic">{tr("Chưa có ngành nào — dùng ngưỡng mặc định ở trên", "No categories — using default above")}</p>
              )}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                placeholder={tr("Tên ngành (vd: Sữa bột)", "Category (e.g., Milk powder)")}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8A557]/50" />
              <input type="number" min={1} max={365} value={newCategoryDays} onChange={e => setNewCategoryDays(parseInt(e.target.value) || 60)}
                className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8A557]/50" />
              <button onClick={addCategory} disabled={!newCategoryName.trim()}
                className="px-4 py-2 rounded-xl bg-[#C8A557]/20 text-[#C8A557] border border-[#C8A557]/30 text-sm font-bold hover:bg-[#C8A557]/30 disabled:opacity-40">
                + Thêm
              </button>
            </div>
          </Section>

          {/* Save bar */}
          <div className="sticky bottom-4 z-20 flex items-center gap-3 p-3 bg-[#0B1623]/95 backdrop-blur-md border border-[#C8A557]/30 rounded-2xl shadow-2xl">
            {isDirty && <span className="text-xs text-amber-300 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit_note</span>{tr("Có thay đổi chưa lưu", "Unsaved changes")}</span>}
            <div className="flex-1" />
            <button onClick={resetToDefault} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-300 hover:bg-white/10">
              {tr("Khôi phục mặc định", "Reset default")}
            </button>
            <button onClick={save} disabled={!isDirty || saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] text-sm font-bold disabled:opacity-50 flex items-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-[#0B1623] border-t-transparent rounded-full animate-spin" />}
              {saving ? tr("Đang lưu…", "Saving…") : tr("Lưu cấu hình", "Save config")}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-[90px] md:bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-bold border shadow-lg backdrop-blur ${
          toast.ok ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" : "bg-red-500/15 border-red-500/40 text-red-200"
        }`}>{toast.msg}</div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2 bg-[#C8A557]/5">
        <span className="material-symbols-outlined text-[#C8A557]">{icon}</span>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Range({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
        <span className="text-sm font-bold text-[#C8A557]">{value} <span className="text-[10px] text-slate-500">ngày</span></span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C8A557]" />
      <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-white/5 rounded-xl">
      <span className="text-sm text-white">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${checked ? "bg-[#C8A557]" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
