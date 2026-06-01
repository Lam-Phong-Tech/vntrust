"use client";
// VietMapView — interactive Vietnam map với 4 heatmap layers + satellite toggle
// Phase 1: foundation + markers
// Phase 2: 4 heatmap layers (scan / fake / alert / dn) + period filter
import { useEffect, useRef, useState, useMemo } from "react";
import Map, { Source, Layer, Marker, NavigationControl, AttributionControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLanguage } from "@/contexts/LanguageContext";

// ──────────────────────────────────────────────────────────────────────
// Style spec: free tile providers (VietMap Trial không bao gồm Tile)
// ──────────────────────────────────────────────────────────────────────
const rasterStyle = (tileUrl: string, attribution: string) => ({
  version: 8 as const,
  glyphs: 'https://glfonts.lukasmartinelli.ch/fonts/{fontstack}/{range}.pbf',
  sources: {
    'tiles': {
      type: 'raster' as const,
      tiles: [tileUrl],
      tileSize: 256,
      attribution,
      maxzoom: 18,
    },
  },
  layers: [
    { id: 'background', type: 'background' as const, paint: { 'background-color': '#0B1623' } },
    { id: 'tiles', type: 'raster' as const, source: 'tiles', minzoom: 0, maxzoom: 22 },
  ],
});

const STYLE_URLS: Record<string, any> = {
  light:     rasterStyle('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                          '© CARTO © OSM'),
  dark:      rasterStyle('https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                          '© CARTO © OSM'),
  satellite: rasterStyle('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                          'Tiles © Esri'),
};
type StyleKey = keyof typeof STYLE_URLS;

// ──────────────────────────────────────────────────────────────────────
// Heatmap configs cho 4 layer
// ──────────────────────────────────────────────────────────────────────
type LayerKey = 'scan' | 'fake' | 'alert' | 'dn';
type PeriodKey = '24h' | '7d' | '30d' | 'all';

const LAYER_META: Record<LayerKey, { label: string; en: string; icon: string; baseColor: string; gradient: any[] }> = {
  scan: {
    label: 'Lượt quét', en: 'Scans', icon: 'qr_code_scanner',
    baseColor: '#3b82f6',
    gradient: [
      'interpolate', ['linear'], ['heatmap-density'],
      0,    'rgba(0,0,0,0)',
      0.15, 'rgba(59,130,246,0.4)',
      0.4,  'rgba(34,211,238,0.6)',
      0.7,  'rgba(132,204,22,0.7)',
      1,    'rgba(250,204,21,0.9)',
    ],
  },
  fake: {
    label: 'Hàng giả', en: 'Counterfeit', icon: 'gpp_bad',
    baseColor: '#ef4444',
    gradient: [
      'interpolate', ['linear'], ['heatmap-density'],
      0,    'rgba(0,0,0,0)',
      0.2,  'rgba(245,158,11,0.5)',
      0.5,  'rgba(239,68,68,0.7)',
      0.8,  'rgba(190,18,60,0.85)',
      1,    'rgba(127,29,29,1)',
    ],
  },
  alert: {
    label: 'Cảnh báo', en: 'Alerts', icon: 'warning',
    baseColor: '#f59e0b',
    gradient: [
      'interpolate', ['linear'], ['heatmap-density'],
      0,    'rgba(0,0,0,0)',
      0.2,  'rgba(168,85,247,0.4)',
      0.5,  'rgba(217,70,239,0.7)',
      0.8,  'rgba(245,158,11,0.85)',
      1,    'rgba(234,88,12,1)',
    ],
  },
  dn: {
    label: 'Doanh nghiệp', en: 'Enterprises', icon: 'apartment',
    baseColor: '#10b981',
    gradient: [
      'interpolate', ['linear'], ['heatmap-density'],
      0,    'rgba(0,0,0,0)',
      0.2,  'rgba(20,184,166,0.4)',
      0.5,  'rgba(16,185,129,0.6)',
      0.8,  'rgba(5,150,105,0.85)',
      1,    'rgba(6,95,70,1)',
    ],
  },
};

// ──────────────────────────────────────────────────────────────────────
// Marker scan locations từ /api/map-stats
// ──────────────────────────────────────────────────────────────────────
interface ScanLocation {
  city: string;
  count: number;
  realCount?: number;
  type?: "hot" | "warning" | "normal";
  lat: number;
  lng: number;
}
interface MapMarker {
  id: number; name: string; country: string;
  lat: number; lon: number;
  scans: number; fake: number; type: string;
}

// ──────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────
interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  source?: 'gps' | 'ip';
}

export default function VietMapView({
  height = 500,
  onMarkerClick,
  userLocation,
}: {
  height?: number;
  onMarkerClick?: (m: MapMarker) => void;
  userLocation?: UserLocation | null;
}) {
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);
  const mapRef = useRef<MapRef>(null);
  const [styleKey, setStyleKey] = useState<StyleKey>("dark");

  // Markers
  const [locations, setLocations] = useState<ScanLocation[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<ScanLocation | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);

  // Heatmap state
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(['fake']));
  const [period, setPeriod] = useState<PeriodKey>('7d');
  const [heatmapData, setHeatmapData] = useState<Record<LayerKey, any>>({
    scan: null, fake: null, alert: null, dn: null,
  });
  const [loadingLayers, setLoadingLayers] = useState<Set<LayerKey>>(new Set());

  // Panel collapse
  const [panelOpen, setPanelOpen] = useState(true);

  // ─── Phase 4: Time slider animation ─────────────────────────────
  // sliderStep: null = "Now / toàn period" · 0..N-1 = bucket index
  const [sliderStep, setSliderStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(700);  // ms per frame

  // Buckets cho slider (chia period thành N khung thời gian)
  const buckets = useMemo(() => {
    if (period === 'all') return [];
    const totalMs: Record<string, number> = { '24h': 24*3600*1000, '7d': 7*24*3600*1000, '30d': 30*24*3600*1000 };
    const ms = totalMs[period];
    if (!ms) return [];
    const N = period === '24h' ? 24 : period === '7d' ? 7 : 15;  // 24 hours, 7 days, 15 = 30d/2-day buckets
    const bucketMs = ms / N;
    const now = Date.now();
    return Array.from({ length: N }, (_, i) => {
      const from = new Date(now - ms + i * bucketMs);
      const to   = new Date(now - ms + (i + 1) * bucketMs);
      const label = period === '24h'
        ? `${from.getHours().toString().padStart(2,'0')}:00`
        : `${from.getDate()}/${from.getMonth() + 1}`;
      return { from, to, label };
    });
  }, [period]);

  // Reset slider khi period đổi
  useEffect(() => {
    setSliderStep(null);
    setPlaying(false);
  }, [period]);

  // Auto-play timer
  useEffect(() => {
    if (!playing || buckets.length === 0) return;
    const interval = setInterval(() => {
      setSliderStep(s => {
        if (s === null) return 0;
        if (s >= buckets.length - 1) return 0;  // Loop
        return s + 1;
      });
    }, playSpeed);
    return () => clearInterval(interval);
  }, [playing, buckets.length, playSpeed]);

  // ── Device heading cho directional cone (Google Maps style) ─────
  const [heading, setHeading] = useState<number | null>(null);
  const [compassStatus, setCompassStatus] = useState<'idle' | 'asking' | 'ready' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (!userLocation) return;
    if (typeof window === 'undefined') return;

    const ReqClass = (window as any).DeviceOrientationEvent;
    const needsPermission = ReqClass && typeof ReqClass.requestPermission === 'function';

    // iOS chưa cấp quyền → không gắn listener (chờ user bấm nút)
    if (needsPermission && compassStatus !== 'ready') {
      if (compassStatus === 'idle') setCompassStatus('idle');
      return;
    }

    const handler = (e: DeviceOrientationEvent) => {
      // iOS: webkitCompassHeading (0=N, clockwise) — chính xác nhất
      const iosHeading = (e as any).webkitCompassHeading;
      let h: number | null = null;
      if (typeof iosHeading === 'number' && !isNaN(iosHeading)) {
        h = iosHeading;
      } else if (e.alpha !== null && !isNaN(e.alpha)) {
        // Android: alpha là rotation quanh trục z (counter-clockwise từ N)
        // Cần hiệu chỉnh theo screen orientation (portrait/landscape)
        const orient = (screen.orientation?.angle ?? (window as any).orientation ?? 0) as number;
        h = (360 - e.alpha + orient) % 360;
      }
      if (h !== null && !isNaN(h)) {
        setHeading(h);
        if (compassStatus !== 'ready') setCompassStatus('ready');
      }
    };

    // Gắn cả 2 event (absolute ưu tiên, fallback regular)
    window.addEventListener('deviceorientationabsolute', handler as any, true);
    window.addEventListener('deviceorientation', handler, true);

    // Nếu sau 3s không nhận được sự kiện → unsupported
    const timeout = setTimeout(() => {
      if (heading === null) setCompassStatus('unsupported');
    }, 3000);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handler as any, true);
      window.removeEventListener('deviceorientation', handler, true);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, compassStatus]);

  // Request iOS permission (manual via button)
  const requestHeadingPermission = async () => {
    if (typeof window === 'undefined') return;
    const ReqClass = (window as any).DeviceOrientationEvent;
    setCompassStatus('asking');
    if (ReqClass && typeof ReqClass.requestPermission === 'function') {
      try {
        const perm = await ReqClass.requestPermission();
        setCompassStatus(perm === 'granted' ? 'ready' : 'denied');
      } catch {
        setCompassStatus('denied');
      }
    } else {
      setCompassStatus('ready');
    }
  };

  // ── Fetch markers từ /api/map-stats ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/map-stats", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        // FIX: API trả {markers: [...]} với field `lon` (không phải `cities`/`lng`)
        const rows: ScanLocation[] = (data.markers || data.cities || [])
          .filter((m: any) => (m.lat ?? null) !== null && (m.lon ?? m.lng ?? null) !== null)
          .map((m: any) => ({
            city:      m.name || m.city || '',
            count:     m.scans || m.count || 0,
            realCount: m.realCount,
            type:      m.type || 'normal',
            lat:       m.lat,
            lng:       m.lon ?? m.lng,
          }));
        if (!cancelled) setLocations(rows);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch heatmap layers khi activeLayers/period/sliderStep thay đổi ───
  useEffect(() => {
    const toFetch = Array.from(activeLayers).filter(k => !heatmapData[k]);
    if (toFetch.length === 0) return;
    setLoadingLayers(new Set(toFetch));

    // Build query: nếu sliderStep != null + có bucket, dùng from/to
    let queryExtra = '';
    if (sliderStep !== null && buckets[sliderStep]) {
      const b = buckets[sliderStep];
      queryExtra = `&from=${encodeURIComponent(b.from.toISOString())}&to=${encodeURIComponent(b.to.toISOString())}`;
    }

    Promise.all(
      toFetch.map(async (type) => {
        try {
          const r = await fetch(`/api/heatmap?type=${type}&period=${period}${queryExtra}`, { cache: 'no-store' });
          if (!r.ok) return [type, null];
          return [type, await r.json()];
        } catch {
          return [type, null];
        }
      })
    ).then((results) => {
      setHeatmapData(prev => {
        const next = { ...prev };
        for (const [k, v] of results as [LayerKey, any][]) next[k] = v;
        return next;
      });
      setLoadingLayers(new Set());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers, period, sliderStep]);

  // Reset cache khi period HOẶC slider thay đổi (refetch all active)
  useEffect(() => {
    setHeatmapData({ scan: null, fake: null, alert: null, dn: null });
  }, [period, sliderStep]);

  // ── Toggle helpers ──────────────────────────────────────────────
  const toggleLayer = (k: LayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#C8A557]/30 bg-[#0B1623]" style={{ height }}>
      <Map
        ref={mapRef}
        mapStyle={STYLE_URLS[styleKey]}
        initialViewState={{ longitude: 107, latitude: 16, zoom: 5, pitch: 0 }}
        maxBounds={[[100, 5], [115, 25]]}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-left" showCompass={false} />
        <AttributionControl
          position="bottom-right"
          compact
          customAttribution={styleKey === 'satellite' ? 'Tiles © Esri' : '© CARTO © OSM'}
        />

        {/* Heatmap layers */}
        {(Object.keys(LAYER_META) as LayerKey[]).map((k) => {
          if (!activeLayers.has(k)) return null;
          const data = heatmapData[k];
          if (!data) return null;
          const meta = LAYER_META[k];
          return (
            <Source key={k} id={`heat-${k}`} type="geojson" data={data}>
              <Layer
                id={`heat-${k}-layer`}
                type="heatmap"
                paint={{
                  'heatmap-weight':    ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 4, 1],
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                  'heatmap-color':     meta.gradient as any,
                  'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 0, 12, 9, 50, 14, 100],
                  'heatmap-opacity':   ['interpolate', ['linear'], ['zoom'], 7, 0.9, 12, 0.55],
                }}
              />
            </Source>
          );
        })}

        {/* ─── USER GPS LOCATION (Google Maps style: chấm + cone hướng) ─── */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center" offset={[0, 0]}>
            <div style={{ position: 'relative', width: 80, height: 80, pointerEvents: 'none' }}>
              {/* Directional cone — chỉ hiện khi có heading data */}
              {heading !== null && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: 80, height: 80,
                  transform: `rotate(${heading}deg)`,
                  transformOrigin: '50% 50%',
                  transition: 'transform 0.18s ease-out',
                }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ overflow: 'visible' }}>
                    <defs>
                      <radialGradient id="coneGrad" cx="0.5" cy="1" r="0.8" fx="0.5" fy="1">
                        <stop offset="0%"   stopColor={userLocation.source === 'gps' ? 'rgba(34,211,238,0.95)' : 'rgba(200,165,87,0.95)'} />
                        <stop offset="60%"  stopColor={userLocation.source === 'gps' ? 'rgba(34,211,238,0.4)'  : 'rgba(200,165,87,0.4)'} />
                        <stop offset="100%" stopColor={userLocation.source === 'gps' ? 'rgba(34,211,238,0)'    : 'rgba(200,165,87,0)'} />
                      </radialGradient>
                    </defs>
                    {/* Sector ~70° wide pointing UP (north before rotation) */}
                    <path
                      d="M 40 40 L 14 0 A 40 40 0 0 1 66 0 Z"
                      fill="url(#coneGrad)"
                    />
                  </svg>
                </div>
              )}
              {/* Pulse ring (chỉ pulse khi KHÔNG có cone — tránh rối) */}
              {heading === null && (
                <div style={{
                  position: 'absolute', top: 28, left: 28, width: 24, height: 24,
                  borderRadius: '50%',
                  background: userLocation.source === 'gps' ? 'rgba(34,211,238,0.35)' : 'rgba(200,165,87,0.35)',
                  animation: 'vmpulse 2s ease-out infinite',
                }} />
              )}
              {/* Dot solid ở giữa */}
              <div style={{
                position: 'absolute', top: 33, left: 33, width: 14, height: 14,
                borderRadius: '50%',
                background: userLocation.source === 'gps' ? '#22d3ee' : '#C8A557',
                border: '3px solid white',
                boxShadow: `0 0 12px ${userLocation.source === 'gps' ? '#22d3ee' : '#C8A557'}, 0 2px 4px rgba(0,0,0,0.5)`,
              }} title={`${tr('Vị trí của bạn', 'Your location')}${userLocation.city ? ` — ${userLocation.city}` : ''}`} />
            </div>
          </Marker>
        )}
        {/* CSS animation pulse */}
        <style jsx global>{`
          @keyframes vmpulse {
            0%   { transform: scale(0.8); opacity: 0.9; }
            70%  { transform: scale(2.8); opacity: 0; }
            100% { transform: scale(0.8); opacity: 0; }
          }
        `}</style>

        {/* Scan markers (toggle bằng showMarkers) */}
        {showMarkers && locations.map((loc) => {
          const size = loc.type === "hot" ? 14 : loc.type === "warning" ? 11 : 9;
          const color = loc.type === "hot" ? "#ef4444"
                      : loc.type === "warning" ? "#f59e0b" : "#10b981";
          return (
            <Marker
              key={loc.city}
              longitude={loc.lng}
              latitude={loc.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedLoc(loc);
                if (onMarkerClick) {
                  onMarkerClick({
                    id: 0, name: loc.city, country: 'Việt Nam',
                    lat: loc.lat, lon: loc.lng,
                    scans: loc.count, fake: 0,
                    type: loc.type || 'normal',
                  });
                }
              }}
            >
              <div
                style={{
                  width: size, height: size,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 ${size}px ${color}`,
                  border: "2px solid white",
                  cursor: "pointer",
                  transition: "transform 0.15s",
                }}
                title={`${loc.city}: ${loc.count} ${tr('lượt quét', 'scans')}`}
              />
            </Marker>
          );
        })}
      </Map>

      {/* ─── Nút bật/status la bàn (hiện khi có userLocation) ─── */}
      {userLocation && (
        <button
          onClick={requestHeadingPermission}
          className={`absolute bottom-16 left-3 z-10 rounded-full px-3 py-2 shadow-lg flex items-center gap-1.5 text-[11px] font-bold transition ${
            compassStatus === 'ready'
              ? 'bg-[#22d3ee] text-[#0B1623]'
              : compassStatus === 'denied'
                ? 'bg-red-500/80 text-white'
                : compassStatus === 'unsupported'
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-[#22d3ee]/90 hover:bg-[#22d3ee] text-[#0B1623] animate-pulse'
          }`}
          title={
            compassStatus === 'ready' ? tr(`La bàn: ${Math.round(heading || 0)}°`, `Compass: ${Math.round(heading || 0)}°`)
            : compassStatus === 'denied' ? tr('Bị từ chối — bấm để thử lại', 'Denied — tap to retry')
            : compassStatus === 'unsupported' ? tr('Thiết bị không hỗ trợ la bàn', 'Device has no compass')
            : tr('Bật la bàn để hiện hướng', 'Enable compass')
          }
        >
          <span className="material-symbols-outlined text-[16px]">
            {compassStatus === 'ready' ? 'navigation' : compassStatus === 'denied' || compassStatus === 'unsupported' ? 'explore_off' : 'explore'}
          </span>
          {compassStatus === 'ready' ? `${Math.round(heading || 0)}°`
            : compassStatus === 'asking' ? tr('Đang xin…', 'Asking…')
            : compassStatus === 'denied' ? tr('Thử lại', 'Retry')
            : compassStatus === 'unsupported' ? tr('Không có la bàn', 'No compass')
            : tr('Bật la bàn', 'Compass')}
        </button>
      )}

      {/* ─── Style toggle: bottom-left góc map, không đè header ─── */}
      <div className="absolute top-3 left-3 z-10 flex gap-1 bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-1 shadow-lg">
        {(["light", "dark", "satellite"] as StyleKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setStyleKey(k)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
              styleKey === k ? "bg-[#C8A557] text-[#0B1623]" : "text-white/70 hover:bg-white/10"
            }`}
            title={k}
          >
            {k === "light" ? tr("Sáng", "Light") : k === "dark" ? tr("Tối", "Dark") : tr("Vệ tinh", "Satellite")}
          </button>
        ))}
      </div>

      {/* ─── Heatmap control panel (top-right, collapsible) ─── */}
      <div className="absolute top-3 right-3 z-10 max-w-[260px]">
        {panelOpen ? (
          <div className="bg-black/80 backdrop-blur-md rounded-2xl border border-[#C8A557]/30 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#C8A557]/10">
              <span className="material-symbols-outlined text-[#C8A557] text-[16px]">layers</span>
              <span className="text-xs font-bold text-white flex-1">{tr("Lớp dữ liệu", "Layers")}</span>
              <button onClick={() => setPanelOpen(false)} className="text-white/60 hover:text-white text-[16px] leading-none p-0.5">
                <span className="material-symbols-outlined text-[16px]">expand_less</span>
              </button>
            </div>

            {/* Period selector */}
            <div className="px-3 py-2 border-b border-white/10">
              <div className="text-[9px] text-white/40 uppercase tracking-wider font-bold mb-1.5">{tr("Khoảng thời gian", "Period")}</div>
              <div className="grid grid-cols-4 gap-1">
                {(['24h', '7d', '30d', 'all'] as PeriodKey[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`py-1 rounded-md text-[10px] font-bold transition ${
                      period === p ? "bg-[#C8A557] text-[#0B1623]" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {p === 'all' ? tr('Tất cả', 'All') : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 4: Time Slider (chỉ hiện khi period != all) */}
            {buckets.length > 0 && (
              <div className="px-3 py-2 border-b border-white/10">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[9px] text-white/40 uppercase tracking-wider font-bold">🎬 {tr("Timeline", "Timeline")}</div>
                  <div className="flex items-center gap-1">
                    {/* Play/Pause button */}
                    <button onClick={() => {
                      if (!playing && sliderStep === null) setSliderStep(0);
                      setPlaying(p => !p);
                    }}
                      className={`rounded-md p-1 transition ${playing ? "bg-[#C8A557] text-[#0B1623]" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                      title={playing ? tr("Tạm dừng", "Pause") : tr("Phát", "Play")}>
                      <span className="material-symbols-outlined text-[14px]">{playing ? 'pause' : 'play_arrow'}</span>
                    </button>
                    {/* Reset/Now button */}
                    <button onClick={() => { setSliderStep(null); setPlaying(false); }}
                      className="rounded-md p-1 bg-white/5 text-white/70 hover:bg-white/10 transition"
                      title={tr("Hiện toàn period", "Show all period")}>
                      <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                    </button>
                    {/* Speed selector */}
                    <select value={playSpeed} onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
                      className="bg-white/5 text-white/70 text-[9px] font-bold rounded px-1 py-0.5 border border-white/10 focus:outline-none">
                      <option value={300} className="bg-[#0B1623]">×3</option>
                      <option value={500} className="bg-[#0B1623]">×2</option>
                      <option value={700} className="bg-[#0B1623]">×1</option>
                      <option value={1200} className="bg-[#0B1623]">×½</option>
                    </select>
                  </div>
                </div>

                {/* Slider */}
                <input type="range" min={0} max={buckets.length - 1}
                  value={sliderStep ?? buckets.length - 1}
                  onChange={(e) => { setSliderStep(parseInt(e.target.value)); setPlaying(false); }}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C8A557]" />

                {/* Labels */}
                <div className="flex justify-between text-[9px] text-white/40 mt-1 font-mono">
                  <span>{buckets[0]?.label}</span>
                  <span className={sliderStep !== null ? "text-[#C8A557] font-bold" : ""}>
                    {sliderStep !== null
                      ? `${buckets[sliderStep]?.label} (${sliderStep + 1}/${buckets.length})`
                      : tr('Toàn period', 'Full period')}
                  </span>
                  <span>{buckets[buckets.length - 1]?.label}</span>
                </div>
              </div>
            )}

            {/* 4 heatmap toggles */}
            <div className="px-2 py-2 space-y-1">
              {(Object.keys(LAYER_META) as LayerKey[]).map(k => {
                const meta = LAYER_META[k];
                const active = activeLayers.has(k);
                const loading = loadingLayers.has(k);
                const count = heatmapData[k]?.features?.length;
                return (
                  <button key={k} onClick={() => toggleLayer(k)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition ${
                      active ? "bg-white/10 border border-white/20" : "hover:bg-white/5 border border-transparent"
                    }`}>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: meta.baseColor, boxShadow: active ? `0 0 8px ${meta.baseColor}` : 'none' }} />
                    <span className="material-symbols-outlined text-[14px]" style={{ color: active ? meta.baseColor : 'rgba(255,255,255,0.4)' }}>{meta.icon}</span>
                    <span className={`text-[11px] font-bold flex-1 ${active ? 'text-white' : 'text-white/60'}`}>
                      {lang === 'en' ? meta.en : meta.label}
                    </span>
                    {loading && <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin shrink-0" />}
                    {!loading && count !== undefined && active && (
                      <span className="text-[9px] text-white/40 font-mono">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Marker toggle */}
            <div className="px-3 py-2 border-t border-white/10">
              <label className="flex items-center gap-2 cursor-pointer text-[10px] text-white/70 hover:text-white">
                <input type="checkbox" checked={showMarkers} onChange={() => setShowMarkers(s => !s)}
                  className="w-3 h-3 accent-[#C8A557]" />
                {tr("Hiện marker tỉnh/thành", "Show province markers")}
              </label>
            </div>
          </div>
        ) : (
          <button onClick={() => setPanelOpen(true)}
            className="bg-black/80 backdrop-blur-md rounded-xl border border-[#C8A557]/30 p-2 shadow-lg flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#C8A557] text-[16px]">layers</span>
            <span className="text-[10px] font-bold text-white">{activeLayers.size}</span>
          </button>
        )}
      </div>

      {/* Selected location popup */}
      {selectedLoc && (
        <div className="absolute bottom-12 left-3 right-3 sm:right-auto sm:max-w-sm z-10 bg-black/85 backdrop-blur-md border border-[#C8A557]/30 rounded-xl p-3 flex items-center gap-3 shadow-2xl">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
               style={{ background: selectedLoc.type === "hot" ? "rgba(239,68,68,0.2)" : selectedLoc.type === "warning" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)" }}>
            <span className="material-symbols-outlined text-white">location_on</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate">{selectedLoc.city}</p>
            <p className="text-xs text-slate-300">
              <strong className="text-[#C8A557]">{selectedLoc.count.toLocaleString()}</strong> {tr("lượt quét", "scans")}
              {selectedLoc.realCount !== undefined && (
                <span className="ml-2 text-slate-500">({selectedLoc.realCount} {tr("thực", "real")})</span>
              )}
            </p>
          </div>
          <button onClick={() => setSelectedLoc(null)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
