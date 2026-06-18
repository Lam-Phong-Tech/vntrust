"use client";
import { useState, useEffect } from "react";

interface GeoLocation {
  lat: number | null;
  lng: number | null;
  city: string;
  country: string;
  loading: boolean;
  granted: boolean | null; // null = not asked yet
}

export function useGeolocation() {
  const [geo, setGeo] = useState<GeoLocation>({
    lat: null, lng: null, city: "", country: "", loading: false, granted: null,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeo(g => ({ ...g, granted: false }));
      return;
    }
    setGeo(g => ({ ...g, loading: true }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let city = "Không xác định", country = "VN";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "vi" } }
          );
          const data = await res.json();
          city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Không xác định";
          country = data.address?.country_code?.toUpperCase() || "VN";
        } catch {}
        setGeo({ lat: latitude, lng: longitude, city, country, loading: false, granted: true });
      },
      () => {
        setGeo(g => ({ ...g, loading: false, granted: false }));
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  return { geo, requestLocation };
}

// Component: Popup xin quyền vị trí — chỉ hiện khi browser chưa quyết định
export function GeolocationPrompt({ onResult }: { onResult?: (granted: boolean) => void }) {
  const [show, setShow] = useState(false);
  const { requestLocation } = useGeolocation();

  useEffect(() => {
    // Dùng Permissions API để kiểm tra trạng thái thực của browser
    const checkPermission = async () => {
      // Nếu browser không hỗ trợ Permissions API → fallback localStorage
      if (!navigator.permissions) {
        const asked = localStorage.getItem("geo_asked");
        if (!asked) setShow(true);
        return;
      }

      try {
        const status = await navigator.permissions.query({ name: "geolocation" });

        if (status.state === "granted") {
          // Browser đã cấp quyền từ trước → tự động lấy vị trí, không hỏi
          localStorage.setItem("geo_asked", "1");
          requestLocation();
          onResult?.(true);
          return;
        }

        if (status.state === "denied") {
          // Browser đã từ chối từ trước → không hỏi nữa
          localStorage.setItem("geo_asked", "0");
          onResult?.(false);
          return;
        }

        // state === "prompt" → chưa quyết định → hiện popup của chúng ta
        const asked = localStorage.getItem("geo_asked");
        if (!asked) setShow(true);

        // Lắng nghe thay đổi trạng thái (người dùng đổi trong browser settings)
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
        // Fallback nếu query thất bại
        const asked = localStorage.getItem("geo_asked");
        if (!asked) setShow(true);
      }
    };

    checkPermission();
  }, []);

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
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/10"
        style={{ background: "rgba(11,19,32,0.98)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#C8A557] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              location_on
            </span>
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Cho phép truy cập vị trí?</h3>
            <p className="text-xs text-slate-400">AI VeriGoods muốn biết vị trí của bạn</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 mb-5 leading-relaxed">
          AI VeriGoods dùng vị trí GPS thực để cung cấp dữ liệu xác thực hàng hóa chính xác theo khu vực địa lý của bạn, thay vì ước tính từ địa chỉ IP.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            className="flex-1 py-3 border border-white/20 rounded-2xl text-sm font-bold text-slate-300 hover:bg-white/5 transition"
          >
            Không cho phép
          </button>
          <button
            onClick={handleAllow}
            className="flex-1 py-3 bg-[#C8A557] hover:bg-[#C8A557] rounded-2xl text-sm font-bold text-white transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">my_location</span>
            Cho phép
          </button>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-3">
          Dữ liệu vị trí chỉ được dùng cho mục đích xác thực. Không chia sẻ với bên thứ ba.
        </p>
      </div>
    </div>
  );
}
