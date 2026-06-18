// POST /api/ai/geo-validate
// Cross-check GPS người dùng với vùng phân phối cho phép của lô hàng (khuVucPhanPhoi)
// Trả về: inZone (bool), distanceKm, riskScore, warning

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Haversine formula — khoảng cách km giữa 2 tọa độ
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R   = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a   = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Map tên tỉnh/thành → tọa độ trung tâm (để so sánh khi khuVucPhanPhoi là text)
const TINH_COORDS: Record<string, [number, number]> = {
  'hà nội': [21.0285, 105.8542], 'hcm': [10.7769, 106.7009], 'hồ chí minh': [10.7769, 106.7009],
  'đà nẵng': [16.0544, 108.2022], 'hải phòng': [20.8449, 106.6881], 'cần thơ': [10.0452, 105.7469],
  'bình dương': [11.3254, 106.4770], 'đồng nai': [10.9455, 107.0840], 'long an': [10.5436, 106.4107],
  'bà rịa': [10.5417, 107.2429], 'khánh hòa': [12.2388, 109.1967], 'lâm đồng': [11.9465, 108.4419],
};

export async function POST(req: NextRequest) {
  try {
    const { uid, lat, lng } = await req.json();

    if (!uid) return NextResponse.json({ error: 'Thiếu uid' }, { status: 400 });
    if (lat == null || lng == null) {
      return NextResponse.json({
        inZone: null, riskScore: 30,
        warning: 'Không có GPS — không thể xác thực vùng phân phối',
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    // Lấy khuVucPhanPhoi từ lô hàng
    const ma = await prisma.maDinhDanh.findFirst({
      where: { OR: [{ uid }, { serialNumber: uid }] },
      include: { loHang: { select: { khuVucPhanPhoi: true, maLo: true } } },
    });

    if (!ma) return NextResponse.json({ error: 'UID không tồn tại' }, { status: 404 });

    const khuVuc = ma.loHang?.khuVucPhanPhoi?.toLowerCase() || '';

    // Nếu không có vùng phân phối → pass
    if (!khuVuc) {
      return NextResponse.json({
        inZone: true, riskScore: 0,
        message: 'Lô hàng không giới hạn vùng phân phối — hợp lệ toàn quốc',
      });
    }

    // So sánh tên tỉnh trong khuVuc vs GPS người dùng
    let minDist = Infinity;
    let matchedTinh = '';

    for (const [tinh, [tLat, tLng]] of Object.entries(TINH_COORDS)) {
      if (khuVuc.includes(tinh)) {
        const dist = haversineKm(userLat, userLng, tLat, tLng);
        if (dist < minDist) { minDist = dist; matchedTinh = tinh; }
      }
    }

    // Ngưỡng: cách trung tâm tỉnh ≤ 80km → trong vùng
    const THRESHOLD_KM = 80;
    const inZone = minDist <= THRESHOLD_KM;
    const riskScore = inZone ? 0 : minDist < 200 ? 20 : 50;

    const result: any = {
      inZone,
      riskScore,
      distanceKm: minDist < Infinity ? Math.round(minDist) : null,
      khuVucPhanPhoi: ma.loHang?.khuVucPhanPhoi,
      userCoords: { lat: userLat, lng: userLng },
    };

    if (!inZone && minDist < Infinity) {
      result.warning = `GPS của bạn cách vùng phân phối "${matchedTinh}" khoảng ${Math.round(minDist)}km — ngoài vùng cho phép`;
    } else if (inZone) {
      result.message = `Vị trí hợp lệ trong vùng "${matchedTinh}" (cách ${Math.round(minDist)}km)`;
    } else {
      result.warning = 'Không khớp tỉnh/thành nào trong vùng phân phối của lô hàng này';
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
