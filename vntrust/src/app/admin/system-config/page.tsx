"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type ConfigItem = {
  value: string;
  moTa?: string | null;
  source?: "db" | "default";
  ngayCapNhat?: string;
  capNhatBoi?: string;
};

type ConfigData = Record<string, Record<string, ConfigItem>>;

const NS_META: Record<string, { vi: string; en: string; icon: string; tone: string }> = {
  admin_ui: { vi: "Nội dung giao diện Admin", en: "Admin UI content", icon: "dashboard_customize", tone: "blue" },
  alert: { vi: "Ngưỡng cảnh báo", en: "Alert thresholds", icon: "warning", tone: "red" },
  notification: { vi: "Kênh thông báo", en: "Notifications", icon: "notifications", tone: "amber" },
  retention: { vi: "Lưu trữ dữ liệu", en: "Data retention", icon: "history", tone: "slate" },
};

const KEY_LABELS: Record<string, { vi: string; en: string }> = {
  admin_overview_title_vi: { vi: "Tiêu đề tổng quan (VI)", en: "Overview title (VI)" },
  admin_overview_title_en: { vi: "Tiêu đề tổng quan (EN)", en: "Overview title (EN)" },
  admin_overview_subtitle_vi: { vi: "Mô tả tổng quan (VI)", en: "Overview subtitle (VI)" },
  admin_overview_subtitle_en: { vi: "Mô tả tổng quan (EN)", en: "Overview subtitle (EN)" },
  pending_accounts_title_vi: { vi: "Tiêu đề tài khoản chờ duyệt (VI)", en: "Pending accounts title (VI)" },
  pending_accounts_title_en: { vi: "Tiêu đề tài khoản chờ duyệt (EN)", en: "Pending accounts title (EN)" },
  pending_accounts_empty_vi: { vi: "Thông báo rỗng tài khoản chờ duyệt (VI)", en: "Pending empty message (VI)" },
  pending_accounts_empty_en: { vi: "Thông báo rỗng tài khoản chờ duyệt (EN)", en: "Pending empty message (EN)" },
  no_expiring_batches_vi: { vi: "Nhãn không có lô tới hạn (VI)", en: "No expiring batches label (VI)" },
  no_expiring_batches_en: { vi: "Nhãn không có lô tới hạn (EN)", en: "No expiring batches label (EN)" },
  scan_threshold_per_day: { vi: "Ngưỡng quét mỗi ngày", en: "Daily scan threshold" },
  scan_threshold_fake: { vi: "Ngưỡng quét giả mạo", en: "Fake scan threshold" },
  geo_distance_km: { vi: "Khoảng cách phân phối tối đa", en: "Maximum distribution distance" },
  consumer_report_threshold: { vi: "Ngưỡng báo cáo người dùng", en: "Consumer report threshold" },
  cert_expiry_warning_days: { vi: "Mốc cảnh báo hết hạn chứng nhận", en: "Certificate expiry warning milestones" },
  email_enabled: { vi: "Bật thông báo email", en: "Enable email notifications" },
  sms_enabled: { vi: "Bật thông báo SMS", en: "Enable SMS notifications" },
  daily_digest_hour: { vi: "Giờ gửi báo cáo hằng ngày", en: "Daily digest hour" },
  audit_log_days: { vi: "Số ngày lưu nhật ký kiểm toán", en: "Audit log retention days" },
  scan_log_days: { vi: "Số ngày lưu lịch sử quét", en: "Scan log retention days" },
  closed_alert_days: { vi: "Số ngày lưu cảnh báo đã đóng", en: "Closed alert retention days" },
};

const labelOf = (key: string, lang: string) => {
  const label = KEY_LABELS[key];
  if (label) return lang === "en" ? label.en : label.vi;
  return key.replace(/_/g, " ");
};

const toneClass = (tone: string) => {
  if (tone === "red") return "bg-red-50 text-red-700 border-red-200";
  if (tone === "amber") return "bg-amber-50 text-amber-700 border-amber-200";
  if (tone === "blue") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [data, setData] = useState<ConfigData>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activeNs, setActiveNs] = useState("admin_ui");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const namespaces = useMemo(() => {
    const keys = Object.keys(data);
    return ["admin_ui", ...keys.filter(k => k !== "admin_ui")];
  }, [data]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/system-config", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Không tải được cấu hình");
      setData(json.config || {});
    } catch (error: any) {
      setToast({ msg: error.message || "Không tải được cấu hình", ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
      router.replace("/dashboard?error=forbidden");
      return;
    }
    fetchConfig();
  }, [fetchConfig, router]);

  const saveKey = async (namespace: string, key: string) => {
    const value = edits[key] ?? data[namespace]?.[key]?.value;
    if (value === undefined) return;
    setSaving(key);
    try {
      const response = await fetch("/api/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace, key, value }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Không lưu được cấu hình");
      setToast({ msg: tr("Đã lưu cấu hình", "Configuration saved"), ok: true });
      setEdits(current => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      await fetchConfig();
    } catch (error: any) {
      setToast({ msg: error.message || "Không lưu được cấu hình", ok: false });
    } finally {
      setSaving(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const resetKey = async (key: string) => {
    if (!confirm(tr("Đưa mục này về mặc định?", "Reset this item to default?"))) return;
    setSaving(key);
    try {
      const response = await fetch(`/api/system-config?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Không reset được cấu hình");
      setToast({ msg: tr("Đã reset về mặc định", "Reset to default"), ok: true });
      setEdits(current => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      await fetchConfig();
    } catch (error: any) {
      setToast({ msg: error.message || "Không reset được cấu hình", ok: false });
    } finally {
      setSaving(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const activeItems = data[activeNs] || {};

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6 rounded-[28px] border border-[#bfdbfe] bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1f6feb]">{tr("Quản trị hệ thống", "System Admin")}</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[#0b1623] font-display">{tr("Cài đặt Admin", "Admin Settings")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#477399]">
              {tr("Thay đổi nội dung giao diện admin, ngưỡng cảnh báo, kênh thông báo và thời gian lưu dữ liệu.", "Change admin UI content, alert thresholds, notification channels and retention rules.")}
            </p>
          </div>
          <Link href="/admin" className="rounded-xl border border-[#bfdbfe] bg-white px-3 py-2 text-xs font-black text-[#1f6feb] hover:bg-[#eff6ff]">
            {tr("Về tổng quan", "Back to overview")}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-[#bfdbfe] bg-white/80 p-10 text-center text-[#477399]">
          <span className="material-symbols-outlined mb-2 animate-pulse text-[32px] text-[#1f6feb]">progress_activity</span>
          <p className="font-bold">{tr("Đang tải cấu hình...", "Loading settings...")}</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-[#bfdbfe] bg-white/90 p-3 shadow-sm">
            <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#477399]">{tr("Nhóm cài đặt", "Setting groups")}</p>
            <div className="space-y-2">
              {namespaces.map(ns => {
                const meta = NS_META[ns] || { vi: ns, en: ns, icon: "tune", tone: "slate" };
                const active = activeNs === ns;
                return (
                  <button
                    key={ns}
                    onClick={() => setActiveNs(ns)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${active ? "border-[#1f6feb] bg-[#eff6ff] text-[#0b1623]" : "border-transparent text-[#477399] hover:bg-[#f8fbff]"}`}
                  >
                    <span className={`material-symbols-outlined rounded-xl border p-2 text-[20px] ${toneClass(meta.tone)}`}>{meta.icon}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{tr(meta.vi, meta.en)}</span>
                      <span className="text-xs text-[#6b8aa8]">{Object.keys(data[ns] || {}).length} {tr("mục", "items")}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-3xl border border-[#bfdbfe] bg-white/90 shadow-sm">
            <div className="border-b border-[#d7e8ff] px-5 py-4">
              <h2 className="text-xl font-black text-[#0b1623]">{tr(NS_META[activeNs]?.vi || activeNs, NS_META[activeNs]?.en || activeNs)}</h2>
              <p className="mt-1 text-xs text-[#477399]">
                {activeNs === "admin_ui"
                  ? tr("Các mục này đang được dùng trực tiếp ở trang tổng quan admin.", "These values are used directly on the admin overview page.")
                  : tr("Thay đổi sẽ được lưu vào cấu hình hệ thống.", "Changes will be saved into system configuration.")}
              </p>
            </div>

            <div className="divide-y divide-[#e4f0ff]">
              {Object.entries(activeItems).map(([key, item]) => {
                const value = edits[key] ?? item.value;
                const isDirty = edits[key] !== undefined && edits[key] !== item.value;
                return (
                  <div key={key} className="grid gap-3 px-5 py-4 xl:grid-cols-[minmax(240px,360px)_minmax(0,1fr)_auto] xl:items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0b1623]">{labelOf(key, lang)}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#6b8aa8]">{item.moTa || tr("Không có mô tả", "No description")}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${item.source === "db" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {item.source === "db" ? tr("Đã tùy chỉnh", "Custom") : tr("Mặc định", "Default")}
                      </span>
                    </div>

                    <input
                      value={value}
                      onChange={event => setEdits(current => ({ ...current, [key]: event.target.value }))}
                      className="min-h-11 w-full rounded-2xl border border-[#bfdbfe] bg-white px-4 py-2 text-sm font-semibold text-[#0b1623] outline-none transition focus:border-[#1f6feb] focus:ring-4 focus:ring-[#1f6feb]/10"
                    />

                    <div className="flex gap-2 xl:justify-end">
                      <button
                        onClick={() => saveKey(activeNs, key)}
                        disabled={!isDirty || saving === key}
                        className="rounded-xl bg-[#1f6feb] px-4 py-2 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {saving === key ? tr("Đang lưu", "Saving") : tr("Lưu", "Save")}
                      </button>
                      <button
                        onClick={() => resetKey(key)}
                        disabled={item.source !== "db" || saving === key}
                        className="rounded-xl border border-[#bfdbfe] bg-white px-4 py-2 text-xs font-black text-[#477399] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm font-black shadow-xl ${toast.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
