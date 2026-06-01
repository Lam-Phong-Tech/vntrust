"use client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const GEO_URL = "/vn-provinces.topo.json";

// Static fallback marker data (replaced by live API data)
const MARKER_BASE = [
  { id: 0,  name: "Lai Châu",        country: "Việt Nam", lat: 22.39, lon: 103.15, scans: 0, fake: 0, type: "normal"  },
  { id: 1,  name: "Điện Biên",       country: "Việt Nam", lat: 21.38, lon: 103.02, scans: 0, fake: 0, type: "warning" },
  { id: 2,  name: "Lào Cai",         country: "Việt Nam", lat: 22.48, lon: 103.97, scans: 0, fake: 0, type: "normal"  },
  { id: 3,  name: "Tuyên Quang",     country: "Việt Nam", lat: 21.82, lon: 105.23, scans: 0, fake: 0, type: "normal"  },
  { id: 4,  name: "Cao Bằng",        country: "Việt Nam", lat: 22.66, lon: 106.26, scans: 0, fake: 0, type: "normal"  },
  { id: 5,  name: "Lạng Sơn",        country: "Việt Nam", lat: 21.85, lon: 106.75, scans: 0, fake: 0, type: "hot"     },
  { id: 6,  name: "Sơn La",          country: "Việt Nam", lat: 21.32, lon: 103.91, scans: 0, fake: 0, type: "normal"  },
  { id: 7,  name: "Phú Thọ",         country: "Việt Nam", lat: 21.34, lon: 105.22, scans: 0, fake: 0, type: "warning" },
  { id: 8,  name: "Thái Nguyên",     country: "Việt Nam", lat: 21.59, lon: 105.84, scans: 0, fake: 0, type: "normal"  },
  { id: 9,  name: "Bắc Ninh",        country: "Việt Nam", lat: 21.18, lon: 106.07, scans: 0, fake: 0, type: "hot"     },
  { id: 10, name: "Quảng Ninh",      country: "Việt Nam", lat: 21.04, lon: 107.19, scans: 0, fake: 0, type: "hot"     },
  { id: 11, name: "Hà Nội",          country: "Việt Nam", lat: 21.03, lon: 105.85, scans: 0, fake: 0, type: "hot"     },
  { id: 12, name: "Hải Phòng",       country: "Việt Nam", lat: 20.84, lon: 106.68, scans: 0, fake: 0, type: "warning" },
  { id: 13, name: "Hưng Yên",        country: "Việt Nam", lat: 20.65, lon: 106.05, scans: 0, fake: 0, type: "normal"  },
  { id: 14, name: "Ninh Bình",       country: "Việt Nam", lat: 20.25, lon: 105.97, scans: 0, fake: 0, type: "normal"  },
  { id: 15, name: "Thanh Hóa",       country: "Việt Nam", lat: 19.80, lon: 105.77, scans: 0, fake: 0, type: "normal"  },
  { id: 16, name: "Nghệ An",         country: "Việt Nam", lat: 19.06, lon: 104.97, scans: 0, fake: 0, type: "normal"  },
  { id: 17, name: "Hà Tĩnh",         country: "Việt Nam", lat: 18.34, lon: 105.90, scans: 0, fake: 0, type: "normal"  },
  { id: 18, name: "Quảng Trị",       country: "Việt Nam", lat: 16.74, lon: 107.19, scans: 0, fake: 0, type: "normal"  },
  { id: 19, name: "Thừa Thiên Huế",  country: "Việt Nam", lat: 16.46, lon: 107.59, scans: 0, fake: 0, type: "normal"  },
  { id: 20, name: "Đà Nẵng",         country: "Việt Nam", lat: 16.07, lon: 108.21, scans: 0, fake: 0, type: "warning" },
  { id: 21, name: "Quảng Ngãi",      country: "Việt Nam", lat: 15.11, lon: 108.80, scans: 0, fake: 0, type: "normal"  },
  { id: 22, name: "Gia Lai",         country: "Việt Nam", lat: 13.98, lon: 108.00, scans: 0, fake: 0, type: "warning" },
  { id: 23, name: "Đắk Lắk",        country: "Việt Nam", lat: 12.66, lon: 108.03, scans: 0, fake: 0, type: "warning" },
  { id: 24, name: "Khánh Hòa",       country: "Việt Nam", lat: 12.24, lon: 109.19, scans: 0, fake: 0, type: "normal"  },
  { id: 25, name: "Lâm Đồng",        country: "Việt Nam", lat: 11.54, lon: 108.08, scans: 0, fake: 0, type: "normal"  },
  { id: 26, name: "Đồng Nai",        country: "Việt Nam", lat: 10.95, lon: 106.82, scans: 0, fake: 0, type: "hot"     },
  { id: 27, name: "Tây Ninh",        country: "Việt Nam", lat: 11.30, lon: 106.10, scans: 0, fake: 0, type: "warning" },
  { id: 28, name: "Đồng Tháp",       country: "Việt Nam", lat: 10.45, lon: 105.63, scans: 0, fake: 0, type: "normal"  },
  { id: 29, name: "An Giang",        country: "Việt Nam", lat: 10.37, lon: 105.43, scans: 0, fake: 0, type: "warning" },
  { id: 30, name: "TP. Hồ Chí Minh", country: "Việt Nam", lat: 10.82, lon: 106.63, scans: 0, fake: 0, type: "hot"     },
  { id: 31, name: "Vĩnh Long",       country: "Việt Nam", lat: 10.25, lon: 105.96, scans: 0, fake: 0, type: "normal"  },
  { id: 32, name: "Cần Thơ",         country: "Việt Nam", lat: 10.04, lon: 105.74, scans: 0, fake: 0, type: "normal"  },
  { id: 33, name: "Cà Mau",          country: "Việt Nam", lat:  9.17, lon: 105.15, scans: 0, fake: 0, type: "normal"  },
  { id: 34, name: "Đảo Phú Quốc",   country: "Việt Nam", lat: 10.22, lon: 103.96, scans: 0, fake: 0, type: "warning" },
  { id: 35, name: "QĐ Hoàng Sa",    country: "Việt Nam", lat: 16.83, lon: 112.33, scans: 0, fake: 0, type: "normal"  },
  { id: 36, name: "QĐ Trường Sa",   country: "Việt Nam", lat:  8.64, lon: 111.91, scans: 0, fake: 0, type: "normal"  },
];

type MarkerData = typeof MARKER_BASE[0];

const ISLANDS = [
  {
    name: "QĐ. Hoàng Sa (Đà Nẵng)",
    center: [112.33, 16.85] as [number, number],
    dots: [[-6,-5],[0,-8],[6,-4],[9,0],[7,5],[2,8],[-4,6],[-8,2],[-3,0],[3,-2],[0,3]],
  },
  {
    name: "QĐ. Trường Sa (Khánh Hòa)",
    center: [113.85, 9.0] as [number, number],
    dots: [[-8,-10],[0,-12],[8,-8],[12,-2],[10,5],[6,10],[0,12],[-6,8],[-10,2],[-5,-3],[3,3],[8,-5],[-2,6],[5,-8],[0,0],[-7,5],[4,8],[-3,-7],[9,3],[-5,9]],
  },
];

const ALL_PROVINCES = [
  {name:'An Giang',lat:10.3711,lon:105.4329},
  {name:'Bà Rịa-VT',lat:10.4973,lon:107.1683},
  {name:'Bạc Liêu',lat:9.2941,lon:105.7278},
  {name:'Bắc Giang',lat:21.2731,lon:106.1946},
  {name:'Bắc Kạn',lat:22.147,lon:105.8348},
  {name:'Bắc Ninh',lat:21.1861,lon:106.0763},
  {name:'Bến Tre',lat:10.2443,lon:106.3756},
  {name:'Bình Dương',lat:11.2268,lon:106.666},
  {name:'Bình Định',lat:13.7829,lon:109.2197},
  {name:'Bình Phước',lat:11.7516,lon:106.9189},
  {name:'Bình Thuận',lat:11.085,lon:108.0827},
  {name:'Cà Mau',lat:8.5991,lon:105.0847},
  {name:'Cao Bằng',lat:22.6582,lon:106.257},
  {name:'Cần Thơ',lat:10.0452,lon:105.7469},
  {name:'Đà Nẵng',lat:16.0544,lon:108.2022},
  {name:'Đắk Lắk',lat:12.6667,lon:108.0382},
  {name:'Đắk Nông',lat:11.9961,lon:107.935},
  {name:'Điện Biên',lat:21.3853,lon:103.0189},
  {name:'Đồng Nai',lat:10.9388,lon:106.8153},
  {name:'Đồng Tháp',lat:10.2882,lon:105.7601},
  {name:'Gia Lai',lat:13.9785,lon:108.0536},
  {name:'Hà Giang',lat:22.8233,lon:104.9839},
  {name:'Hà Nam',lat:20.5453,lon:105.9122},
  {name:'Hà Nội',lat:21.0285,lon:105.8542},
  {name:'Hà Tĩnh',lat:18.3428,lon:105.9042},
  {name:'Hải Dương',lat:20.9372,lon:106.3146},
  {name:'Hải Phòng',lat:20.8449,lon:106.6881},
  {name:'Hậu Giang',lat:9.7828,lon:105.4746},
  {name:'Hòa Bình',lat:20.8242,lon:105.3384},
  {name:'Hưng Yên',lat:20.6464,lon:106.0511},
  {name:'Khánh Hòa',lat:12.2388,lon:109.1967},
  {name:'Kiên Giang',lat:10.0125,lon:105.0809},
  {name:'Kon Tum',lat:14.3496,lon:108.0003},
  {name:'Lai Châu',lat:22.3965,lon:103.4682},
  {name:'Lạng Sơn',lat:21.8475,lon:106.7571},
  {name:'Lào Cai',lat:22.4836,lon:104.0233},
  {name:'Lâm Đồng',lat:11.5546,lon:108.1407},
  {name:'Long An',lat:10.5367,lon:106.4067},
  {name:'Nam Định',lat:20.4308,lon:106.1759},
  {name:'Nghệ An',lat:18.6667,lon:105.6667},
  {name:'Ninh Bình',lat:20.2539,lon:105.9748},
  {name:'Ninh Thuận',lat:11.5647,lon:108.9886},
  {name:'Phú Thọ',lat:21.3168,lon:105.2173},
  {name:'Phú Yên',lat:13.0886,lon:109.3005},
  {name:'Quảng Bình',lat:17.5147,lon:106.2573},
  {name:'Quảng Nam',lat:15.5682,lon:108.0195},
  {name:'Quảng Ngãi',lat:15.1205,lon:108.7923},
  {name:'Quảng Ninh',lat:21.0069,lon:107.2925},
  {name:'Quảng Trị',lat:16.7456,lon:107.1881},
  {name:'Sóc Trăng',lat:9.6033,lon:105.9806},
  {name:'Sơn La',lat:21.3283,lon:103.9142},
  {name:'Tây Ninh',lat:11.3134,lon:106.0958},
  {name:'Thái Bình',lat:20.4463,lon:106.3366},
  {name:'Thái Nguyên',lat:21.5928,lon:105.8442},
  {name:'Thanh Hóa',lat:19.8055,lon:105.7725},
  {name:'Huế',lat:16.4637,lon:107.5905},
  {name:'Tiền Giang',lat:10.3541,lon:106.3601},
  {name:'TP.HCM',lat:10.8231,lon:106.6297},
  {name:'Trà Vinh',lat:9.9405,lon:106.3403},
  {name:'Tuyên Quang',lat:21.8214,lon:105.2166},
  {name:'Vĩnh Long',lat:10.0531,lon:105.9482},
  {name:'Vĩnh Phúc',lat:21.3093,lon:105.6046},
  {name:'Yên Bái',lat:21.7229,lon:104.9113},
];

const typeStyle = {
  hot:     { fill: "#f59e0b", stroke: "#fde68a", r: 4 },
  warning: { fill: "#ea580c", stroke: "#fdba74", r: 3 },
  normal:  { fill: "#0891b2", stroke: "#67e8f9", r: 2.5 },
};

// Tier classification — anti-overlap khi labels grow theo zoom
// Tier 1: 5 thành phố trực thuộc TW — luôn hiện
const TIER_1_NAMES = new Set<string>([
  'TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
]);
// Tier 2: trung tâm vùng — hiện khi zoom ≥ 1.4
const TIER_2_NAMES = new Set<string>([
  'Huế', 'Khánh Hòa', 'Quảng Ninh', 'Bình Dương', 'Đồng Nai',
  'Nghệ An', 'Thanh Hóa', 'Lâm Đồng', 'Bình Định', 'Bắc Ninh',
  'Quảng Nam', 'Thái Nguyên', 'Vũng Tàu', 'Bà Rịa-VT',
]);
// Tier 3: tất cả tỉnh còn lại — hiện khi zoom ≥ 2.2

export default function VietnamMap({
  onMarkerClick,
}: {
  onMarkerClick: (m: MarkerData) => void;
}) {
  const { t } = useLanguage();
  const [markers, setMarkers] = useState<MarkerData[]>(MARKER_BASE);
  const [hovered, setHovered] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ coordinates: [106.0, 16.0] as [number, number], zoom: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const MARKER_NAMES = new Set(markers.map(m => m.name));

  // Fetch live data
  useEffect(() => {
    fetch("/api/map-stats")
      .then(r => r.json())
      .then(data => {
        if (data.markers && Array.isArray(data.markers)) {
          // Merge live scans/fake into base, keep lat/lon/type from base
          setMarkers(prev => prev.map(base => {
            const live = data.markers.find((lm: any) => lm.id === base.id);
            return live ? { ...base, scans: live.scans ?? 0, fake: live.fake ?? 0, type: live.type ?? base.type } : base;
          }));
        }
      })
      .catch(() => {/* use fallback */});
  }, []);

  // Track mouse position relative to container for HTML tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  function handleMoveEnd(pos: { coordinates: [number, number]; zoom: number }) {
    setPosition(pos);
  }

  // Font-size labels — GROW theo zoom với sqrt damping + tier filtering anti-overlap
  // Triết lý:
  //   - Zoom càng cao → labels càng to (theo trực giác user)
  //   - Anti-overlap bằng cách CHỈ HIỆN labels phù hợp với zoom level (tier filter)
  //     · Tier 1 (5 thành phố lớn nhất): luôn hiện
  //     · Tier 2 (10 hub vùng): hiện khi zoom ≥ 1.4
  //     · Tier 3 (tỉnh còn lại): hiện khi zoom ≥ 2.2
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  // Base lớn hơn để dễ đọc trên mobile
  const baseLabelSize  = isMobile ? 10 : 6;
  const baseMarkerSize = isMobile ? 8 : 5;

  const z = position.zoom;
  // sqrt damping: zoom in → labels grow, nhưng chỉ ~√zoom (chậm hơn linear)
  const labelFontSize  = baseLabelSize  / Math.sqrt(Math.max(z, 0.5));
  const markerFontSize = baseMarkerSize / Math.sqrt(Math.max(z, 0.5));

  // Tier để filter labels — anti-overlap
  function provinceTier(name: string): 1 | 2 | 3 {
    if (TIER_1_NAMES.has(name)) return 1;
    if (TIER_2_NAMES.has(name)) return 2;
    return 3;
  }
  const maxTierVisible: number = z < 1.4 ? 1 : (z < 2.2 ? 2 : 3);

  const hoveredMarker = hovered !== null ? markers.find(m => m.id === hovered) : null;

  // Tooltip position: clamp to stay in container
  const TW = 200;
  const TH = 110;
  const OFFSET = 14;
  const containerW = containerRef.current?.clientWidth ?? 520;
  const containerH = containerRef.current?.clientHeight ?? 700;
  let tipX = mousePos.x + OFFSET;
  let tipY = mousePos.y - TH / 2;
  if (tipX + TW > containerW - 8) tipX = mousePos.x - TW - OFFSET;
  if (tipY < 8) tipY = 8;
  if (tipY + TH > containerH - 8) tipY = containerH - TH - 8;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 select-none overflow-hidden bg-transparent"
      style={{ touchAction: "pan-y" }}
      onMouseMove={handleMouseMove}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [107.0, 16.0], scale: 1650 }}
        width={520}
        height={700}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          maxZoom={10}
        >
          {/* ── Provinces ── */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#155080"
                  stroke="#5bc8f0"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none", fill: "#155080", transition: "all 0.2s" },
                    hover:   { outline: "none", fill: "#1d6aaa", transition: "all 0.2s" },
                    pressed: { outline: "none", fill: "#1d6aaa" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* ── Island groups ── */}
          {ISLANDS.map((island) => (
            <g key={island.name}>
              <Marker coordinates={island.center}>
                {island.dots.map(([dx, dy], i) => (
                  <ellipse key={i} cx={dx * 0.9} cy={dy * 0.9} rx={2} ry={1.2}
                    fill="#1e293b" stroke="#5bc8f0" strokeWidth={0.5} />
                ))}
                <text textAnchor="middle" y={-20} fontSize={isMobile ? 6 : 3.5} fontWeight="bold"
                  fill="#7dd4fc" style={{ pointerEvents: "none" }}>
                  {island.name}
                </text>
              </Marker>
            </g>
          ))}

          {/* ── Province name labels (skip marker cities) + Tier filter anti-overlap ── */}
          {ALL_PROVINCES
            .filter(p => !MARKER_NAMES.has(p.name))
            .filter(p => provinceTier(p.name) <= maxTierVisible)
            .map((prov, i) => (
              <Marker key={"prov-" + i} coordinates={[prov.lon, prov.lat]}>
                <text
                  textAnchor="middle"
                  dy={1.2}
                  fontSize={labelFontSize}
                  fontWeight="600"
                  fill="rgba(255,255,255,0.55)"
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                    filter: "drop-shadow(0px 0px 2px rgba(0,0,0,1))",
                  }}
                >
                  {prov.name}
                </text>
              </Marker>
            ))}

          {/* ── Active Scanning Markers (no SVG tooltip — use HTML overlay) ── */}
          {markers.filter(m => m.id !== 35 && m.id !== 36).map((m) => {
            const s = typeStyle[m.type as keyof typeof typeStyle] || typeStyle.normal;
            const isHov = hovered === m.id;
            const isHot = m.type === "hot";
            const r = (isHov ? s.r * 1.4 : s.r) / Math.sqrt(position.zoom);

            return (
              <Marker key={m.id} coordinates={[m.lon, m.lat]}>
                {isHot && (
                  <circle r={r * 2.8} fill="none" stroke={s.fill}
                    strokeWidth={0.3 / position.zoom} opacity={0.25}
                    style={{ pointerEvents: "none" }} />
                )}

                <circle
                  r={r}
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={0.6 / position.zoom}
                  onClick={() => onMarkerClick(m)}
                  onMouseEnter={() => setHovered(m.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    cursor: "pointer",
                    filter: "drop-shadow(0 0 " + (isHot ? 4 : 2) + "px " + s.fill + ")",
                    transition: "r 0.12s",
                  }}
                />

                <text
                  textAnchor="start"
                  x={r + 2 / position.zoom}
                  y={r * 0.35}
                  fontSize={markerFontSize}
                  fontWeight="700"
                  fill="white"
                  stroke="rgba(0,0,0,0.85)"
                  strokeWidth={markerFontSize * 0.55}
                  paintOrder="stroke"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {m.name}
                </text>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* ── HTML Tooltip Overlay — z-index 50 đảm bảo luôn nổi lên trên SVG ── */}
      {hoveredMarker && (
        <div
          className="pointer-events-none absolute z-50"
          style={{ left: tipX, top: tipY, width: TW }}
        >
          <div
            className="rounded-2xl border border-[#C8A557]/40 shadow-2xl backdrop-blur-md p-3 text-sm"
            style={{ background: "rgba(2,12,28,0.95)" }}
          >
            <p className="font-black text-white text-base leading-tight">{hoveredMarker.name}</p>
            <p className="text-[10px] text-slate-400 mb-2">Tỉnh / Thành phố</p>
            <p className="text-cyan-300 font-bold text-sm">
              {hoveredMarker.scans > 0
                ? hoveredMarker.scans.toLocaleString("vi-VN") + " lượt quét"
                : "Chưa có dữ liệu"}
            </p>
            {hoveredMarker.fake > 0 ? (
              <p className="text-amber-400 font-bold text-xs mt-0.5">
                ⚠ {hoveredMarker.fake} cảnh báo hàng giả
              </p>
            ) : (
              <p className="text-[#6FB585] text-xs mt-0.5">✓ An toàn</p>
            )}
            {hoveredMarker.scans > 0 && (
              <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C8A557] to-cyan-300"
                  style={{ width: Math.max(4, Math.min(100, 100 - (hoveredMarker.fake / Math.max(1, hoveredMarker.scans)) * 100)) + "%" }}
                />
              </div>
            )}
          </div>
          {/* Arrow */}
          <div
            className="absolute w-2 h-2 bg-[rgba(2,12,28,0.95)] border-r border-b border-[#C8A557]/40 rotate-45"
            style={{ left: tipX > mousePos.x ? -5 : TW - 3, top: TH / 2 - 4 }}
          />
        </div>
      )}
    </div>
  );
}
