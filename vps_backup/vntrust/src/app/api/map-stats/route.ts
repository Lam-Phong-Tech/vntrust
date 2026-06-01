import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Province → city name mapping từ Nominatim/DB
const PROVINCE_ALIASES: Record<string, string[]> = {
  'Hà Nội':             ['Hà Nội', 'Ha Noi', 'Hanoi'],
  'TP. Hồ Chí Minh':   ['Hồ Chí Minh', 'Ho Chi Minh', 'TP.HCM', 'TP. Hồ Chí Minh', 'HCM'],
  'Đà Nẵng':           ['Đà Nẵng', 'Da Nang'],
  'Hải Phòng':         ['Hải Phòng', 'Hai Phong'],
  'Cần Thơ':           ['Cần Thơ', 'Can Tho'],
  'Bắc Ninh':          ['Bắc Ninh', 'Bac Ninh'],
  'Đồng Nai':          ['Đồng Nai', 'Dong Nai'],
  'Quảng Ninh':        ['Quảng Ninh', 'Quang Ninh'],
  'Lạng Sơn':          ['Lạng Sơn', 'Lang Son'],
  'Tây Ninh':          ['Tây Ninh', 'Tay Ninh'],
  'An Giang':          ['An Giang'],
  'Đảo Phú Quốc':      ['Phú Quốc', 'Phu Quoc', 'Kiên Giang'],
};

// All markers with their base config (lat/lon/type)
const MARKER_BASE = [
  { id: 0,  name: 'Lai Châu',        lat: 22.39, lon: 103.15, type: 'normal' },
  { id: 1,  name: 'Điện Biên',       lat: 21.38, lon: 103.02, type: 'warning' },
  { id: 2,  name: 'Lào Cai',         lat: 22.48, lon: 103.97, type: 'normal' },
  { id: 3,  name: 'Tuyên Quang',     lat: 21.82, lon: 105.23, type: 'normal' },
  { id: 4,  name: 'Cao Bằng',        lat: 22.66, lon: 106.26, type: 'normal' },
  { id: 5,  name: 'Lạng Sơn',        lat: 21.85, lon: 106.75, type: 'hot'    },
  { id: 6,  name: 'Sơn La',          lat: 21.32, lon: 103.91, type: 'normal' },
  { id: 7,  name: 'Phú Thọ',         lat: 21.34, lon: 105.22, type: 'warning' },
  { id: 8,  name: 'Thái Nguyên',     lat: 21.59, lon: 105.84, type: 'normal' },
  { id: 9,  name: 'Bắc Ninh',        lat: 21.18, lon: 106.07, type: 'hot'    },
  { id: 10, name: 'Quảng Ninh',      lat: 21.04, lon: 107.19, type: 'hot'    },
  { id: 11, name: 'Hà Nội',          lat: 21.03, lon: 105.85, type: 'hot'    },
  { id: 12, name: 'Hải Phòng',       lat: 20.84, lon: 106.68, type: 'warning' },
  { id: 13, name: 'Hưng Yên',        lat: 20.65, lon: 106.05, type: 'normal' },
  { id: 14, name: 'Ninh Bình',       lat: 20.25, lon: 105.97, type: 'normal' },
  { id: 15, name: 'Thanh Hóa',       lat: 19.80, lon: 105.77, type: 'normal' },
  { id: 16, name: 'Nghệ An',         lat: 19.06, lon: 104.97, type: 'normal' },
  { id: 17, name: 'Hà Tĩnh',         lat: 18.34, lon: 105.90, type: 'normal' },
  { id: 18, name: 'Quảng Trị',       lat: 16.74, lon: 107.19, type: 'normal' },
  { id: 19, name: 'Thừa Thiên Huế',  lat: 16.46, lon: 107.59, type: 'normal' },
  { id: 20, name: 'Đà Nẵng',         lat: 16.07, lon: 108.21, type: 'warning' },
  { id: 21, name: 'Quảng Ngãi',      lat: 15.11, lon: 108.80, type: 'normal' },
  { id: 22, name: 'Gia Lai',         lat: 13.98, lon: 108.00, type: 'warning' },
  { id: 23, name: 'Đắk Lắk',        lat: 12.66, lon: 108.03, type: 'warning' },
  { id: 24, name: 'Khánh Hòa',       lat: 12.24, lon: 109.19, type: 'normal' },
  { id: 25, name: 'Lâm Đồng',        lat: 11.54, lon: 108.08, type: 'normal' },
  { id: 26, name: 'Đồng Nai',        lat: 10.95, lon: 106.82, type: 'hot'    },
  { id: 27, name: 'Tây Ninh',        lat: 11.30, lon: 106.10, type: 'warning' },
  { id: 28, name: 'Đồng Tháp',       lat: 10.45, lon: 105.63, type: 'normal' },
  { id: 29, name: 'An Giang',        lat: 10.37, lon: 105.43, type: 'warning' },
  { id: 30, name: 'TP. Hồ Chí Minh', lat: 10.82, lon: 106.63, type: 'hot'    },
  { id: 31, name: 'Vĩnh Long',       lat: 10.25, lon: 105.96, type: 'normal' },
  { id: 32, name: 'Cần Thơ',         lat: 10.04, lon: 105.74, type: 'normal' },
  { id: 33, name: 'Cà Mau',          lat:  9.17, lon: 105.15, type: 'normal' },
  { id: 34, name: 'Đảo Phú Quốc',   lat: 10.22, lon: 103.96, type: 'warning' },
  { id: 35, name: 'QĐ Hoàng Sa',    lat: 16.83, lon: 112.33, type: 'normal' },
  { id: 36, name: 'QĐ Trường Sa',   lat:  8.64, lon: 111.91, type: 'normal' },
];

// Default fallback colors
const TYPE_COLOR: Record<string, string> = {
  hot:     '#fbbf24',
  warning: '#f97316',
  normal:  '#4ade80',
};

export async function GET(_req: NextRequest) {
  try {
    // Đọc từ bảng luotQuet — nơi verify API thực sự ghi log quét
    // Định dạng diaChi_IP: "CityName - IPAddress"
    const luotQuets = await prisma.luotQuet.findMany({
      select: { diaChi_IP: true, ketQua: true },
      orderBy: { thoiGian: 'desc' },
      take: 50000,
    });

    // Đếm số lần quét và số cảnh báo hàng giả theo city
    const scanCounts: Record<string, number> = {};
    const fakeCounts: Record<string, number> = {};

    for (const s of luotQuets) {
      // diaChi_IP format: "CityName - 1.2.3.4"
      const raw = s.diaChi_IP || '';
      const dashIdx = raw.lastIndexOf(' - ');
      const city = dashIdx >= 0 ? raw.substring(0, dashIdx).trim() : raw.trim();
      if (!city || city === 'unknown') continue;

      scanCounts[city] = (scanCounts[city] || 0) + 1;
      if (s.ketQua === 'expired' || s.ketQua === 'suspect' || s.ketQua === 'fake') {
        fakeCounts[city] = (fakeCounts[city] || 0) + 1;
      }
    }

    // Cũng đếm từ bảng canhBao
    const alerts = await prisma.canhBao.findMany({
      select: { moTa: true },
    });
    for (const a of alerts) {
      const cityMatch = a.moTa?.match(/(?:tại|ở|city)[:\s]+([^|·\n,]+)/i);
      if (cityMatch) {
        const city = cityMatch[1].trim();
        fakeCounts[city] = (fakeCounts[city] || 0) + 1;
      }
    }

    // Map ngược từ alias → canonical name
    function findCanonical(rawCity: string): string | null {
      for (const [canonical, aliases] of Object.entries(PROVINCE_ALIASES)) {
        for (const alias of aliases) {
          if (rawCity.toLowerCase().includes(alias.toLowerCase())) return canonical;
        }
      }
      return null;
    }

    // Build markers với dữ liệu thực, fallback về default nếu không có
    const TOTAL_REAL_SCANS = luotQuets.length;
    const markers = MARKER_BASE.map(m => {
      // Tìm trong scan counts theo nhiều alias
      let realScans = 0;
      let realFake = 0;

      // Check canonical name và aliases
      const aliases = PROVINCE_ALIASES[m.name] || [m.name];
      for (const alias of aliases) {
        for (const [city, count] of Object.entries(scanCounts)) {
          if (city.toLowerCase().includes(alias.toLowerCase()) ||
              alias.toLowerCase().includes(city.toLowerCase())) {
            realScans += count;
          }
        }
        for (const [city, count] of Object.entries(fakeCounts)) {
          if (city.toLowerCase().includes(alias.toLowerCase()) ||
              alias.toLowerCase().includes(city.toLowerCase())) {
            realFake += count;
          }
        }
      }

      // Nếu không có dữ liệu thực → phân phối proportional từ tổng số scan
      // Dùng tỷ lệ dân số gần đúng nếu TOTAL_REAL_SCANS > 0
      const hasRealData = realScans > 0;

      return {
        id: m.id,
        name: m.name,
        country: 'Việt Nam',
        lat: m.lat,
        lon: m.lon,
        scans: hasRealData ? realScans : 0,
        fake: hasRealData ? realFake : 0,
        type: m.type,
        color: TYPE_COLOR[m.type] || '#4ade80',
        hasRealData,
        totalSystemScans: TOTAL_REAL_SCANS,
      };
    });

    return NextResponse.json({ markers, totalScans: TOTAL_REAL_SCANS });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
