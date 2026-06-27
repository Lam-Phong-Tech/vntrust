"use client";

import { useEffect, useMemo, useState } from "react";

export interface PublicEnterprise {
  id: string;
  ten: string;
  maSoThue: string;
  loai: string;
  logoUrl?: string | null;
  trangThai: string;
  thuongHieu?: string | null;
}

interface EnterpriseSelectProps {
  lang?: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

const STORAGE_KEY = "vntrust_verify_enterprise_id";

export function getStoredVerifyEnterprise() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function extractVerifyCode(raw: string) {
  const text = raw.trim();
  const marker = "/verify/";
  const markerIndex = text.indexOf(marker);
  const value = markerIndex >= 0 ? text.slice(markerIndex + marker.length) : text;
  return value.split(/[?#]/)[0].trim();
}

export function buildVerifyHref(uid: string, doanhNghiepId?: string) {
  const cleanUid = extractVerifyCode(uid);
  const params = doanhNghiepId ? `?doanhNghiepId=${encodeURIComponent(doanhNghiepId)}` : "";
  return `/verify/${encodeURIComponent(cleanUid)}${params}`;
}

export default function EnterpriseSelect({ lang = "vi", value, onChange, compact = false }: EnterpriseSelectProps) {
  const [enterprises, setEnterprises] = useState<PublicEnterprise[]>([]);
  const [loading, setLoading] = useState(true);

  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  useEffect(() => {
    let mounted = true;
    fetch("/api/public/enterprises", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setEnterprises(Array.isArray(data.enterprises) ? data.enterprises : []);
      })
      .catch(() => {
        if (mounted) setEnterprises([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  }, [value]);

  const selected = useMemo(() => enterprises.find((item) => item.id === value), [enterprises, value]);

  return (
    <div className={compact ? "w-full" : "w-full text-left"}>
      {!compact && (
        <label className="block text-[11px] font-black text-outline uppercase tracking-[0.2em] mb-3 ml-2">
          {tr("Doanh nghiệp cần đối chiếu", "Enterprise to match")}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading}
          className={`w-full appearance-none rounded-2xl border font-bold outline-none transition-all ${
            compact
              ? "bg-[#0B1623]/85 border-[#C8A557]/35 text-[#F6F1E8] px-4 py-3 pr-10 text-sm"
              : "bg-[#0F1B2C] border-2 border-[#C8A557]/35 text-[#F6F1E8] px-4 py-5 pr-12 text-sm focus:border-[#C8A557] focus:ring-4 focus:ring-[#C8A557]/15"
          }`}
        >
          <option value="">
            {loading ? tr("Đang tải doanh nghiệp...", "Loading enterprises...") : tr("Tất cả doanh nghiệp", "All enterprises")}
          </option>
          {enterprises.map((item) => (
            <option key={item.id} value={item.id}>
              {item.ten}{item.maSoThue ? ` - MST ${item.maSoThue}` : ""}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#C8A557]">
          expand_more
        </span>
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-on-surface-variant">
          {selected
            ? tr("Chỉ xác thực mã thuộc doanh nghiệp đã chọn.", "Only codes from the selected enterprise will be accepted.")
            : tr("Không chọn doanh nghiệp thì hệ thống xác thực trên toàn bộ dữ liệu.", "Leave empty to verify across all enterprise data.")}
        </p>
      )}
    </div>
  );
}
