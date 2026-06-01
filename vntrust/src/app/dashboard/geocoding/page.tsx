"use client";
// Phase 3 — Admin tool: batch geocode DN addresses
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface Stats {
  total: number;
  hasCoords: number;
  needsGeocoding: number;
  noAddress: number;
  coverage: number;
}

interface BatchResult {
  ok: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  failedList: Array<{ id: string; ten: string; address: string }>;
  durationMs: number;
}

export default function GeocodingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [delayMs, setDelayMs] = useState(600);
  const [lastResult, setLastResult] = useState<BatchResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") { router.replace("/dashboard?error=forbidden"); return; }
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/geocode-dn", { cache: "no-store" });
      const data = await r.json();
      setStats(data);
    } catch { setToast("Lỗi tải stats"); }
    finally { setLoading(false); }
  };

  const runBatch = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const r = await fetch("/api/admin/geocode-dn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: batchSize, delayMs }),
      });
      const data: BatchResult = await r.json();
      setLastResult(data);
      setToast(tr(`Đã xử lý ${data.processed} DN — ${data.succeeded} thành công, ${data.failed} thất bại`,
                  `Processed ${data.processed} — ${data.succeeded} OK, ${data.failed} failed`));
      await fetchStats();
    } catch (e: any) {
      setToast("Lỗi: " + (e.message || "unknown"));
    } finally {
      setRunning(false);
      setTimeout(() => setToast(null), 6000);
    }
  };

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 pb-[100px] md:pb-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">{tr("Quản trị · Bản đồ", "Admin · Map")}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            {tr("Geocoding doanh nghiệp", "Enterprise geocoding")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {tr("Chuyển địa chỉ DN → tọa độ lat/lng để hiển thị trên heatmap bản đồ", "Convert addresses → lat/lng for heatmap")}
          </p>
        </div>
        <Link href="/dashboard" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> {tr("Quay lại", "Back")}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label={tr("Tổng DN", "Total")} value={stats?.total ?? "—"} color="border-white/10 bg-white/5" />
        <StatCard label={tr("Đã geocode", "Geocoded")} value={stats?.hasCoords ?? "—"} color="border-emerald-500/30 bg-emerald-500/5 text-emerald-300" sub={`${stats?.coverage ?? 0}%`} />
        <StatCard label={tr("Cần geocode", "Pending")} value={stats?.needsGeocoding ?? "—"} color="border-amber-500/30 bg-amber-500/5 text-amber-300" />
        <StatCard label={tr("Thiếu địa chỉ", "No address")} value={stats?.noAddress ?? "—"} color="border-slate-500/30 bg-slate-500/5 text-slate-400" />
      </div>

      {/* Coverage bar */}
      {stats && stats.total > 0 && (
        <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex justify-between text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">
            <span>{tr("Tiến độ geocoding", "Coverage")}</span>
            <span className="text-emerald-300">{stats.coverage}%</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-[#22d3ee] transition-all"
                 style={{ width: `${stats.coverage}%` }} />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.hasCoords}/{stats.total} {tr("DN đã có tọa độ trên bản đồ heatmap", "enterprises geocoded for heatmap")}
          </p>
        </div>
      )}

      {/* Run batch */}
      <div className="p-5 bg-[#C8A557]/5 border border-[#C8A557]/30 rounded-2xl mb-4">
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C8A557]">play_arrow</span>
          {tr("Chạy batch geocode", "Run batch geocoding")}
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          {tr("Mỗi batch sẽ xử lý tuần tự với delay để tránh rate limit VietMap API.",
              "Each batch processes sequentially with delay to avoid VietMap rate limit.")}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr("Số DN/batch", "Batch size")}</label>
            <input type="number" value={batchSize} min={1} max={500}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8A557]/50" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr("Delay (ms)", "Delay (ms)")}</label>
            <input type="number" value={delayMs} min={200} max={5000}
              onChange={(e) => setDelayMs(parseInt(e.target.value) || 600)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8A557]/50" />
          </div>
        </div>

        <button
          onClick={runBatch}
          disabled={loading || running || !stats || stats.needsGeocoding === 0}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] font-bold text-sm hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {running ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#0B1623]" />
              {tr("Đang chạy…", "Running…")}
            </>
          ) : stats?.needsGeocoding === 0 ? (
            tr("✓ Tất cả DN đã geocode", "✓ All enterprises geocoded")
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">my_location</span>
              {tr(`Geocode ${Math.min(batchSize, stats?.needsGeocoding || 0)} DN tiếp theo`, `Geocode next ${Math.min(batchSize, stats?.needsGeocoding || 0)}`)}
            </>
          )}
        </button>

        <p className="text-[10px] text-slate-500 mt-2 italic">
          {tr("Ước tính:", "Estimated:")} ~{Math.round((batchSize * delayMs) / 1000)}s
        </p>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#6FB585]">check_circle</span>
            {tr("Kết quả batch gần nhất", "Last batch result")}
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-white/5 rounded-lg p-2"><div className="text-xs text-slate-400">Total</div><div className="text-lg font-bold text-white">{lastResult.processed}</div></div>
            <div className="bg-emerald-500/10 rounded-lg p-2"><div className="text-xs text-emerald-300">OK</div><div className="text-lg font-bold text-emerald-300">{lastResult.succeeded}</div></div>
            <div className="bg-red-500/10 rounded-lg p-2"><div className="text-xs text-red-300">Fail</div><div className="text-lg font-bold text-red-300">{lastResult.failed}</div></div>
          </div>
          <p className="text-[11px] text-slate-500">{tr("Thời gian", "Duration")}: {(lastResult.durationMs / 1000).toFixed(1)}s</p>

          {lastResult.failedList.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-red-300 cursor-pointer">
                {tr(`Xem ${lastResult.failedList.length} DN thất bại`, `View ${lastResult.failedList.length} failed`)}
              </summary>
              <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                {lastResult.failedList.map(f => (
                  <div key={f.id} className="text-[11px] text-slate-400 p-2 bg-red-500/5 rounded">
                    <strong className="text-white">{f.ten}</strong>
                    <p className="text-slate-500 truncate">{f.address}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-[90px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-[#C8A557]/15 border border-[#C8A557]/40 text-amber-200 text-sm font-bold shadow-lg backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: any; color: string; sub?: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold mb-1 opacity-80">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-[11px] mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}
