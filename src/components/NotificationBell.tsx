"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Notification {
  id: string;
  tieuDe: string;
  noiDung: string;
  loai: string;
  daDoc: boolean;
  thoiGian: string;
}

const LOAI_ICON: Record<string, string> = {
  kyc: "badge",
  shipment: "local_shipping",
  alert: "warning",
  system: "info",
};

const LOAI_COLOR: Record<string, string> = {
  kyc: "text-blue-400",
  shipment: "text-emerald-400",
  alert: "text-amber-400",
  system: "text-slate-400",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const role = localStorage.getItem("userRole") || "";
    const doanhNghiepId = localStorage.getItem("doanhNghiepId") || "";
    const nguoiDungId = localStorage.getItem("userId") || "";
    if (!role) return;

    const params = new URLSearchParams({ role });
    if (doanhNghiepId) params.set("doanhNghiepId", doanhNghiepId);
    if (nguoiDungId) params.set("nguoiDungId", nguoiDungId);

    try {
      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    const role = localStorage.getItem("userRole") || "";
    const doanhNghiepId = localStorage.getItem("doanhNghiepId") || "";
    const nguoiDungId = localStorage.getItem("userId") || "";
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true, nguoiDungId, doanhNghiepId, role }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, daDoc: true })));
    setUnread(0);
  };

  const markOne = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, daDoc: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    return `${Math.floor(hrs / 24)} ngày trước`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        className="relative w-9 h-9 flex items-center justify-center bg-white/10 rounded-full text-slate-200 hover:text-white hover:bg-white/20 transition border border-white/10 active:scale-95"
        title="Thông báo"
      >
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          notifications
        </span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5 border border-[#0b1320] animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 z-[9998] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          style={{ background: "rgba(11,19,32,0.97)", backdropFilter: "blur(20px)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
              <span className="font-bold text-white text-sm">Thông báo</span>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{unread}</span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold transition">
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <span className="material-symbols-outlined text-3xl mb-2 block">notifications_none</span>
                <p className="text-sm">Chưa có thông báo</p>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.daDoc && markOne(n.id)}
                className={`flex gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition hover:bg-white/5 ${!n.daDoc ? "bg-cyan-500/5" : ""}`}
              >
                <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${LOAI_COLOR[n.loai] || "text-slate-400"}`}>
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {LOAI_ICON[n.loai] || "info"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold leading-tight truncate ${n.daDoc ? "text-slate-300" : "text-white"}`}>
                      {n.tieuDe}
                    </p>
                    {!n.daDoc && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{n.noiDung}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.thoiGian)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
