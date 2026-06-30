"use client";
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface GeoLocation {
  lat: number | null;
  lng: number | null;
  city: string;
  country: string;
  loading: boolean;
  granted: boolean | null;
}

function getPreferredLanguageHeader() {
  if (typeof navigator === "undefined") return "vi";
  return navigator.languages?.[0] || navigator.language || "vi";
}

export function useGeolocation() {
  const [geo, setGeo] = useState<GeoLocation>({
    lat: null,
    lng: null,
    city: "",
    country: "",
    loading: false,
    granted: null,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo((g) => ({ ...g, granted: false }));
      return;
    }

    setGeo((g) => ({ ...g, loading: true }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let city = "Không xác định";
        let country = "VN";

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": getPreferredLanguageHeader() } }
          );
          const data = await res.json();
          city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Không xác định";
          country = data.address?.country_code?.toUpperCase() || "VN";
        } catch {
          // Giữ fallback local khi reverse geocoding lỗi.
        }

        setGeo({ lat: latitude, lng: longitude, city, country, loading: false, granted: true });
      },
      () => {
        setGeo((g) => ({ ...g, loading: false, granted: false }));
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { geo, requestLocation };
}

export function GeolocationPrompt({ onResult }: { onResult?: (granted: boolean) => void }) {
  const [show, setShow] = useState(false);
  const { requestLocation } = useGeolocation();
  const { t } = useLanguage();

  useEffect(() => {
    const checkPermission = async () => {
      if (!navigator.permissions) {
        const asked = localStorage.getItem("geo_asked");
        if (!asked) setShow(true);
        return;
      }

      try {
        const status = await navigator.permissions.query({ name: "geolocation" });

        if (status.state === "granted") {
          localStorage.setItem("geo_asked", "1");
          requestLocation();
          onResult?.(true);
          return;
        }

        if (status.state === "denied") {
          localStorage.setItem("geo_asked", "0");
          onResult?.(false);
          return;
        }

        const asked = localStorage.getItem("geo_asked");
        if (!asked) setShow(true);

        status.onchange = () => {
          if (status.state === "granted") {
            setShow(false);
            localStorage.setItem("geo_asked", "1");
            requestLocation();
            onResult?.(true);
          } else if (status.state === "denied") {
            setShow(false);
            localStorage.setItem("geo_asked", "0");
            onResult?.(false);
          }
        };
      } catch {
        const asked = localStorage.getItem("geo_asked");
        if (!asked) setShow(true);
      }
    };

    checkPermission();
  }, [onResult, requestLocation]);

  const handleAllow = () => {
    localStorage.setItem("geo_asked", "1");
    setShow(false);
    requestLocation();
    onResult?.(true);
  };

  const handleDeny = () => {
    localStorage.setItem("geo_asked", "0");
    setShow(false);
    onResult?.(false);
  };

  if (!show) return null;

  return (
    <div className="geo-permission-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4">
      <div className="geo-permission-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border">
        <div className="flex items-center gap-3 mb-4">
          <div className="geo-permission-icon w-12 h-12 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              location_on
            </span>
          </div>
          <div>
            <h3 className="geo-permission-title font-bold text-base">{t("geo_prompt_title")}</h3>
            <p className="geo-permission-subtitle text-xs">{t("geo_prompt_subtitle")}</p>
          </div>
        </div>

        <p className="geo-permission-body text-sm mb-5 leading-relaxed">{t("geo_prompt_body")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={handleDeny} className="geo-permission-deny py-3 rounded-2xl text-sm font-bold transition">
            {t("geo_prompt_deny")}
          </button>
          <button onClick={handleAllow} className="geo-permission-allow py-3 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">my_location</span>
            {t("geo_prompt_allow")}
          </button>
        </div>

        <p className="geo-permission-note text-[10px] text-center mt-3">{t("geo_prompt_note")}</p>
      </div>
    </div>
  );
}
