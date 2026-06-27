"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

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
  const selectedLabel = selected ? `${selected.ten}${selected.maSoThue ? ` - MST ${selected.maSoThue}` : ""}` : "";
  const normalizedSearch = search.trim().toLowerCase();

  const filteredEnterprises = useMemo(() => {
    if (!normalizedSearch) return enterprises;
    return enterprises.filter((item) => {
      const haystack = `${item.ten} ${item.maSoThue || ""} ${item.thuongHieu || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [enterprises, normalizedSearch]);

  useEffect(() => {
    if (!open) setSearch(selectedLabel);
  }, [open, selectedLabel]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selectEnterprise = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={compact ? "w-full" : "w-full text-left"}>
      {!compact && (
        <label className="block text-[11px] font-black text-outline uppercase tracking-[0.2em] mb-3 ml-2">
          {tr("Doanh nghiệp cần đối chiếu", "Enterprise to match")}
        </label>
      )}

      <div className="relative">
        <input
          value={open ? search : selectedLabel}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setSearch(selectedLabel);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open && filteredEnterprises[0]) {
              event.preventDefault();
              selectEnterprise(filteredEnterprises[0].id);
            }
          }}
          disabled={loading}
          placeholder={loading ? tr("Đang tải doanh nghiệp...", "Loading enterprises...") : tr("Tất cả doanh nghiệp", "All enterprises")}
          className={`w-full rounded-2xl border font-bold outline-none transition-all placeholder:font-semibold ${
            compact
              ? "h-10 bg-[#0B1623]/85 border-[#C8A557]/35 text-[#F6F1E8] px-3 pr-16 text-[13px] placeholder:text-[#F6F1E8]/70"
              : "bg-[#0F1B2C] border-2 border-[#C8A557]/35 text-[#F6F1E8] px-4 py-5 pr-20 text-sm focus:border-[#C8A557] focus:ring-4 focus:ring-[#C8A557]/15 placeholder:text-[#F6F1E8]/45"
          }`}
        />

        {value && (
          <button
            type="button"
            onClick={() => selectEnterprise("")}
            className="absolute right-9 top-1/2 -translate-y-1/2 text-[#F6F1E8]/65 transition hover:text-[#F6F1E8]"
            aria-label={tr("Bỏ chọn doanh nghiệp", "Clear enterprise")}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => !loading && setOpen((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8A557]"
          aria-label={tr("Mở danh sách doanh nghiệp", "Open enterprise list")}
        >
          <span className="material-symbols-outlined text-[20px]">{open ? "expand_less" : "expand_more"}</span>
        </button>

        {open && !loading && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto rounded-2xl border border-[#C8A557]/30 bg-[#0B1623] p-2 text-left shadow-2xl shadow-black/40">
            <button
              type="button"
              onClick={() => selectEnterprise("")}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                !value ? "bg-[#C8A557] text-[#0B1623]" : "text-[#F6F1E8] hover:bg-[#F6F1E8]/10"
              }`}
            >
              {tr("Tất cả doanh nghiệp", "All enterprises")}
            </button>

            {filteredEnterprises.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectEnterprise(item.id)}
                className={`mt-1 w-full rounded-xl px-3 py-2.5 text-left transition ${
                  item.id === value ? "bg-[#C8A557] text-[#0B1623]" : "text-[#F6F1E8] hover:bg-[#F6F1E8]/10"
                }`}
              >
                <span className="block truncate text-sm font-bold">{item.ten}</span>
                {(item.maSoThue || item.thuongHieu) && (
                  <span className="block truncate text-[11px] opacity-70">
                    {[item.thuongHieu, item.maSoThue ? `MST ${item.maSoThue}` : ""].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
            ))}

            {filteredEnterprises.length === 0 && (
              <div className="px-3 py-4 text-center text-xs font-semibold text-[#F6F1E8]/65">
                {tr("Không tìm thấy doanh nghiệp phù hợp.", "No matching enterprise found.")}
              </div>
            )}
          </div>
        )}
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
