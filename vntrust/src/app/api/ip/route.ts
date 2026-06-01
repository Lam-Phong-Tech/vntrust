import { NextRequest, NextResponse } from "next/server";

// Mapping tỉnh/thành từ tiếng Anh sang tiếng Việt
const CITY_VI: Record<string, string> = {
  "Ho Chi Minh City": "TP. Hồ Chí Minh", "Hanoi": "Hà Nội", "Ha Noi": "Hà Nội",
  "Da Nang": "Đà Nẵng", "Hai Phong": "Hải Phòng", "Can Tho": "Cần Thơ",
  "Bien Hoa": "Biên Hòa", "Nha Trang": "Nha Trang", "Hue": "Huế",
  "Vung Tau": "Vũng Tàu", "Da Lat": "Đà Lạt", "Quy Nhon": "Quy Nhơn",
  "Buon Ma Thuot": "Buôn Ma Thuột", "Thai Nguyen": "Thái Nguyên",
  "Nam Dinh": "Nam Định", "Vinh": "Vinh", "My Tho": "Mỹ Tho",
  "Long Xuyen": "Long Xuyên", "Rach Gia": "Rạch Giá", "Pleiku": "Pleiku",
  "Phan Thiet": "Phan Thiết", "Lang Son": "Lạng Sơn", "Thai Binh": "Thái Bình",
  "Bac Ninh": "Bắc Ninh", "Hai Duong": "Hải Dương", "Bac Giang": "Bắc Giang",
  "Ninh Binh": "Ninh Bình", "Ha Tinh": "Hà Tĩnh", "Quang Ngai": "Quảng Ngãi",
  "Dong Hoi": "Đồng Hới", "Dong Nai": "Đồng Nai", "Tay Ninh": "Tây Ninh",
  "An Giang": "An Giang", "Soc Trang": "Sóc Trăng", "Ca Mau": "Cà Mau",
  "Bac Lieu": "Bạc Liêu", "Kien Giang": "Kiên Giang", "Phu Quoc": "Phú Quốc",
  "Thanh Hoa": "Thanh Hóa", "Nghe An": "Nghệ An", "Quang Ninh": "Quảng Ninh",
  "Ha Nam": "Hà Nam", "Hung Yen": "Hưng Yên", "Vinh Phuc": "Vĩnh Phúc",
  "Phu Tho": "Phú Thọ", "Son La": "Sơn La", "Dien Bien": "Điện Biên",
  "Lao Cai": "Lào Cai", "Yen Bai": "Yên Bái", "Ha Giang": "Hà Giang",
  "Cao Bang": "Cao Bằng", "Bac Kan": "Bắc Kạn", "Tuyen Quang": "Tuyên Quang",
  "Quang Binh": "Quảng Bình", "Quang Tri": "Quảng Trị", "Quang Nam": "Quảng Nam",
  "Binh Dinh": "Bình Định", "Phu Yen": "Phú Yên", "Khanh Hoa": "Khánh Hòa",
  "Ninh Thuan": "Ninh Thuận", "Binh Thuan": "Bình Thuận", "Kon Tum": "Kon Tum",
  "Gia Lai": "Gia Lai", "Dak Lak": "Đắk Lắk", "Dak Nong": "Đắk Nông",
  "Lam Dong": "Lâm Đồng", "Binh Phuoc": "Bình Phước", "Binh Duong": "Bình Dương",
  "Ba Ria": "Bà Rịa - Vũng Tàu", "Long An": "Long An", "Tien Giang": "Tiền Giang",
  "Ben Tre": "Bến Tre", "Tra Vinh": "Trà Vinh", "Vinh Long": "Vĩnh Long",
  "Dong Thap": "Đồng Tháp", "Hau Giang": "Hậu Giang",
};

function toVietnamese(city: string): string {
  return CITY_VI[city] || CITY_VI[city?.trim()] || city;
}

export async function GET(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp    = req.headers.get("x-real-ip");
  const cfIp      = req.headers.get("cf-connecting-ip");
  const ip = (forwarded?.split(",")[0].trim()) || cfIp || realIp || "1.1.1.1";

  const isPrivate = /^(127\.|10\.|192\.168\.|::1|localhost)/.test(ip);
  if (isPrivate) {
    return NextResponse.json({ ip, city: "Hà Nội", country: "VN", lat: 21.0278, lon: 105.8342 });
  }

  // ── Primary: ipinfo.io (chính xác hơn cho VN) ──
  try {
    const token = process.env.IPINFO_TOKEN || ""; // có token thì chính xác hơn
    const url = token
      ? `https://ipinfo.io/${ip}/json?token=${token}`
      : `https://ipinfo.io/${ip}/json`;
    const r = await fetch(url, { next: { revalidate: 600 } });
    const d = await r.json();
    if (d && d.city && !d.bogon) {
      const [lat, lon] = (d.loc || "").split(",").map(Number);
      const cityVi = toVietnamese(d.city);
      const regionVi = toVietnamese(d.region || "");
      return NextResponse.json({
        ip,
        city: cityVi,
        region: regionVi,
        country: d.country || "VN",
        lat: lat || null,
        lon: lon || null,
        org: d.org || "",
      });
    }
  } catch {}

  // ── Fallback: ip-api.com ──
  try {
    const r = await fetch(
      "http://ip-api.com/json/" + ip + "?fields=status,city,regionName,country,countryCode,lat,lon",
      { next: { revalidate: 600 } }
    );
    const geo = await r.json();
    if (geo.status === "success") {
      return NextResponse.json({
        ip,
        city: toVietnamese(geo.city || ""),
        region: toVietnamese(geo.regionName || ""),
        country: geo.countryCode || "VN",
        lat: geo.lat,
        lon: geo.lon,
      });
    }
  } catch {}

  return NextResponse.json({ ip, city: "Không xác định", country: "VN", lat: null, lon: null });
}
