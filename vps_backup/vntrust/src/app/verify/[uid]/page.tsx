"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerificationResult() {
  const { uid } = useParams();
  const { t } = useLanguage();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number; city: string; source: "gps" | "ip" } | null>(null);
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch verify result
    fetch(`/api/verify/${uid}`)
      .then(res => res.json())
      .then(data => { setResult(data); setLoading(false); })
      .catch(() => setLoading(false));

    // 2. Ưu tiên GPS browser (chính xác nhất), fallback về IP geo
    const tryIpGeo = async () => {
      try {
        const res = await fetch('/api/ip');
        const data = await res.json();
        if (data.lat && data.lon) {
          setLocation({ lat: data.lat, lon: data.lon, city: data.city || 'Không xác định', source: 'ip' });
        }
      } catch {}
      setLocLoading(false);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          // Reverse geocode với Nominatim để lấy tên địa điểm thực
          let city = t("vuid_gps_label");
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
              { headers: { 'Accept-Language': 'vi' } }
            );
            const geo = await r.json();
            const addr = geo.address || {};
            city = addr.city || addr.town || addr.village || addr.county ||
                   addr.state || geo.display_name?.split(',')[0] || 'GPS';
          } catch {}
          setLocation({ lat, lon, city, source: 'gps' });
          setLocLoading(false);
        },
        // Nếu user từ chối GPS → fallback IP
        () => tryIpGeo(),
        { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
      );
    } else {
      // Trình duyệt không hỗ trợ GPS
      tryIpGeo();
    }
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isFake = result?.status === "fake";
  const isSuspect = result?.status === "suspect";
  const isExpired = result?.status === "expired";
  const isGenuine = result?.status === "genuine";

  const pData = result?.data || {};
  const loHang = pData.loHang || {};
  const sanPham = loHang.sanPham || {};

  return (
    <div className="px-4 sm:px-6 md:px-12 max-w-7xl mx-auto pb-12">
      {/* Hero: Verification Status */}
      <section className="relative mb-8 sm:mb-12">
        <div className={`flex flex-col md:flex-row items-center gap-5 sm:gap-8 p-5 sm:p-8 rounded-xl ghost-border overflow-hidden ${
          isGenuine ? "bg-emerald-500/10 border-emerald-500/30" :
          isSuspect ? "bg-yellow-500/10 border-yellow-500/30" :
          isExpired ? "bg-slate-500/10 border-slate-500/30" :
          "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="absolute top-0 right-0 opacity-5 pointer-events-none translate-x-1/4 -translate-y-1/4">
            <span className="material-symbols-outlined text-[300px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isFake ? "cancel" : isExpired ? "timer_off" : isSuspect ? "warning" : "verified"}
            </span>
          </div>
          <div className={`relative w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 flex items-center justify-center rounded-full ${
            isGenuine ? "bg-emerald-500/20" :
            isSuspect ? "bg-yellow-500/20" :
            isExpired ? "bg-slate-500/20" :
            "bg-red-500/20"
          }`}>
            <span className={`material-symbols-outlined text-5xl sm:text-7xl md:text-9xl ${
              isGenuine ? "text-emerald-500" :
              isSuspect ? "text-yellow-500" :
              isExpired ? "text-slate-400" :
              "text-red-500"
            }`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {isFake ? "cancel" : isExpired ? "timer_off" : isSuspect ? "warning" : "verified"}
            </span>
            <div className={`absolute inset-0 rounded-full border-4 animate-pulse opacity-20 ${
              isGenuine ? "border-emerald-500" :
              isSuspect ? "border-yellow-500" :
              isExpired ? "border-slate-500" :
              "border-red-500"
            }`}></div>
          </div>
          <div className="flex-1 text-center md:text-left z-10">
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest font-label ${
                isGenuine ? "bg-emerald-500 text-white" :
                isSuspect ? "bg-yellow-500 text-white" :
                isExpired ? "bg-slate-600 text-white" :
                "bg-red-600 text-white"
              }`}>
                {isFake ? t("vuid_2") : isExpired ? t("vuid_3") : isSuspect ? t("vuid_4") : t("vuid_5")}
              </span>
              <span
                className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full text-xs font-bold font-label tracking-widest uppercase max-w-[200px] truncate block overflow-hidden text-ellipsis whitespace-nowrap"
                title={String(uid)}
              >
                {t('vuid_6')} {(() => {
                  const s = String(uid);
                  if (s.length <= 16) return s;
                  return s.substring(0, 8) + '...' + s.slice(-6);
                })()}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-headline font-extrabold tracking-tighter text-on-surface mb-2">
              {isFake ? t("vuid_7") : isSuspect ? t("vuid_8") : isExpired ? t("vuid_9") : t("vuid_5")}
            </h1>
            <p className="text-on-surface-variant max-w-xl text-base sm:text-lg">
              {isFake ? t("vuid_10") :
               isSuspect ? `${t('vuid_11')} ${result?.scanCount} ${t('vuid_12')}` :
               isExpired ? t("vuid_13") : t("vuid_14")}
            </p>
          </div>
        </div>
      </section>

      {!isFake && (
        <>
          {/* Product Data Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 mb-8 sm:mb-12">
            
            {/* Product Specs & 3D Image */}
            <div className="md:col-span-4 flex flex-col gap-4 sm:gap-6">
              {sanPham.hinhAnhUrl && (
                <div className="bg-surface-container-low rounded-xl overflow-hidden relative group aspect-square flex items-center justify-center perspective-[1000px]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-tertiary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="relative w-[80%] h-[80%] transition-transform duration-500 ease-out transform-gpu group-hover:scale-105 group-hover:rotate-x-12 group-hover:rotate-y-[-12deg] shadow-2xl rounded-2xl overflow-hidden">
                    <img src={sanPham.hinhAnhUrl} alt={sanPham.ten} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out"></div>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">3d_rotation</span> 3D View
                  </div>
                </div>
              )}
              <div className="bg-surface-container-low p-5 sm:p-6 rounded-xl flex flex-col justify-between min-h-[160px] sm:min-h-[200px]">
                <span className="text-xs font-label text-outline uppercase tracking-widest mb-4">{t("vuid_15")}</span>
                <div>
                  <h2 className="text-2xl font-headline font-bold mb-1">{sanPham.ten || t("vuid_0")}</h2>
                  <p className="text-on-surface-variant font-body">{sanPham.moTa || t("vuid_1")}</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest ghost-border p-6 rounded-xl">
                <span className="text-xs font-label text-outline uppercase tracking-widest mb-4 block">{t("vuid_16")}</span>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase text-outline mb-1">{t("vuid_17")}</p>
                    <p className="font-bold text-on-surface font-headline">{loHang.maLo || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-outline mb-1">{t("vuid_18")}</p>
                    <p className="font-bold text-on-surface font-headline">
                      {loHang.ngaySanXuat ? new Date(loHang.ngaySanXuat).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-outline-variant/20">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <span className="material-symbols-outlined text-sm">link</span>
                      <span>{t("vuid_19")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Digital Twin Timeline */}
            <div className="md:col-span-5 bg-surface-container-low rounded-xl p-8">
              <div className="flex justify-between items-start mb-8">
                <h3 className="font-headline font-bold text-xl">{t("vuid_20")}</h3>
                <span className="material-symbols-outlined text-primary-fixed-dim">hub</span>
              </div>
              <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/30">
                <div className="relative flex gap-6 items-start">
                  <div className="z-10 w-6 h-6 bg-tertiary-container rounded-full flex items-center justify-center ring-4 ring-surface-container-low">
                    <span className="material-symbols-outlined text-xs text-white" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase">{t("vuid_21")}</p>
                    <p className="font-bold text-on-surface">{t("vuid_22")}</p>
                    <p className="text-xs text-on-surface-variant">{t("vuid_23")}{result?.scanCount}</p>
                  </div>
                </div>
                <div className="relative flex gap-6 items-start">
                  <div className="z-10 w-6 h-6 bg-outline-variant rounded-full flex items-center justify-center ring-4 ring-surface-container-low"></div>
                  <div>
                    <p className="font-bold text-on-surface">{t("vuid_24")}</p>
                    <p className="text-xs text-on-surface-variant">{t("vuid_25")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map View & Location */}
            <div className="md:col-span-3 flex flex-col gap-6">
              <div className="bg-surface-container-low rounded-xl overflow-hidden h-full flex flex-col">
                <div className="p-4 bg-surface-container-high flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{t("vuid_26")}</span>
                  <div className="flex items-center gap-1.5">
                    {location?.source === 'gps' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">GPS</span>
                    )}
                    {location?.source === 'ip' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">IP</span>
                    )}
                    <span className="material-symbols-outlined text-sm">location_on</span>
                  </div>
                </div>
                <div className="flex-1 min-h-[200px] relative">
                  {locLoading ? (
                    /* Đang lấy vị trí */
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container gap-3">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-on-surface-variant">{t("vuid_fetching")}</p>
                    </div>
                  ) : location ? (
                    <iframe
                      className="w-full h-full grayscale opacity-80 border-0 pointer-events-none"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lon - 0.03},${location.lat - 0.03},${location.lon + 0.03},${location.lat + 0.03}&layer=mapnik&marker=${location.lat},${location.lon}`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container gap-2">
                      <span className="material-symbols-outlined text-3xl text-outline">location_off</span>
                      <p className="text-xs text-on-surface-variant">{t("vuid_location_fail")}</p>
                    </div>
                  )}
                  {location && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 bg-primary rounded-full pulse-glow flex items-center justify-center shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-surface-container-lowest">
                  <p className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    {location?.source === 'gps' && <span className="material-symbols-outlined text-emerald-400 text-[14px]">gps_fixed</span>}
                    {location?.source === 'ip'  && <span className="material-symbols-outlined text-blue-400 text-[14px]">wifi</span>}
                    {location ? location.city : t("vuid_27")}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {location
                      ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`
                      : t("vuid_28")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Digital Certificates Section */}
          <div className="bg-surface-container-low rounded-xl p-8 mb-12">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-emerald-500 text-3xl">workspace_premium</span>
              <div>
                <h3 className="font-headline font-black text-2xl text-on-surface">{t("vuid_29")}</h3>
                <p className="text-sm text-on-surface-variant">{t("vuid_30")}</p>
              </div>
            </div>
            
            {sanPham.chungNhans && sanPham.chungNhans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sanPham.chungNhans.map((cn: any, idx: number) => (
                  <div key={idx} className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="material-symbols-outlined text-5xl text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                    </div>
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-600 font-black text-[10px] tracking-widest uppercase rounded-full border border-emerald-500/20">{cn.loai}</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-on-surface mb-1">{cn.soChungNhan}</h4>
                    <p className="text-xs text-on-surface-variant mb-4 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">account_balance</span>
                      {cn.toChucCap || t("vuid_31")}
                    </p>
                    <div className="flex justify-between items-center text-[11px] border-t border-outline-variant/20 pt-4 mt-2">
                      <div>
                        <span className="block text-outline uppercase">{t("vuid_32")}</span>
                        <span className="font-bold text-on-surface">{new Date(cn.ngayCap).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-outline uppercase">{t("vuid_33")}</span>
                        <span className="font-bold text-on-surface">{new Date(cn.ngayHetHan).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-surface-container rounded-2xl border border-dashed border-outline-variant/30">
                <span className="material-symbols-outlined text-outline mb-2 text-4xl">inventory_2</span>
                <p className="text-outline font-medium">{t("vuid_34")}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
