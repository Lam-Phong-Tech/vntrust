// Phase 2 — /api/heatmap?type={scan|fake|alert|dn}&period={24h|7d|30d|all}
// Trả GeoJSON FeatureCollection cho MapLibre heatmap layer
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PERIOD_MS: Record<string, number | null> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  'all': null,
};

type Feature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { weight: number; city?: string; meta?: string };
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type   = (searchParams.get('type')   || 'scan')  as 'scan' | 'fake' | 'alert' | 'dn';
    const period = (searchParams.get('period') || '7d')    as keyof typeof PERIOD_MS;

    // Phase 4 — custom time window cho time slider (override period nếu có)
    const fromParam = searchParams.get('from');
    const toParam   = searchParams.get('to');
    let since: Date | null = null;
    let until: Date | null = null;
    if (fromParam || toParam) {
      try {
        if (fromParam) since = new Date(fromParam);
        if (toParam)   until = new Date(toParam);
      } catch {}
    } else {
      const ms = PERIOD_MS[period];
      since = ms ? new Date(Date.now() - ms) : null;
    }

    const features: Feature[] = [];

    // ─── Helpers ─────────────────────────────────────────────────
    const buildScanWhere = (extra: any = {}) => {
      const w: any = { lat: { not: null }, lng: { not: null }, ...extra };
      if (since || until) {
        w.thoiGian = {};
        if (since) w.thoiGian.gte = since;
        if (until) w.thoiGian.lt  = until;
      }
      return w;
    };

    if (type === 'scan') {
      // ─── Mật độ QUÉT ────────────────────────────────────────────
      const rows = await prisma.luotQuet.findMany({
        where: buildScanWhere(),
        select: { lat: true, lng: true, diaChi_IP: true, ketQua: true },
        take: 5000,
      });
      for (const r of rows) {
        if (r.lat == null || r.lng == null) continue;
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
          properties: { weight: 1, city: r.diaChi_IP || '' },
        });
      }

    } else if (type === 'fake') {
      // ─── Mật độ HÀNG GIẢ + nghi ngờ ─────────────────────────────
      const rows = await prisma.luotQuet.findMany({
        where: buildScanWhere({ ketQua: { in: ['fake', 'suspect'] } }),
        select: { lat: true, lng: true, ketQua: true, diaChi_IP: true },
        take: 5000,
      });
      for (const r of rows) {
        if (r.lat == null || r.lng == null) continue;
        // weight cao hơn cho 'fake' so với 'suspect'
        const weight = r.ketQua === 'fake' ? 3 : 1.5;
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
          properties: { weight, city: r.diaChi_IP || '', meta: r.ketQua },
        });
      }

    } else if (type === 'alert') {
      // ─── Mật độ CẢNH BÁO MỞ ─────────────────────────────────────
      // Join CanhBao.uid → LuotQuet → lat/lng (lấy lần quét gần nhất của UID đó)
      const alerts = await prisma.canhBao.findMany({
        where: {
          trangThai: 'open',
          uid: { not: null },
          ...((since || until) ? {
            thoiGian: {
              ...(since ? { gte: since } : {}),
              ...(until ? { lt: until } : {}),
            },
          } : {}),
        },
        select: { uid: true, mucDo: true },
        take: 2000,
      });
      const uids = Array.from(new Set(alerts.map(a => a.uid!).filter(Boolean)));
      if (uids.length > 0) {
        // SQLite limit ~999 params → chia chunks
        const chunks: string[][] = [];
        for (let i = 0; i < uids.length; i += 500) chunks.push(uids.slice(i, i + 500));
        for (const ch of chunks) {
          const scans = await prisma.luotQuet.findMany({
            where: { uid: { in: ch }, lat: { not: null }, lng: { not: null } },
            select: { uid: true, lat: true, lng: true },
            orderBy: { thoiGian: 'desc' },
          });
          // Lấy lần quét đầu tiên (mới nhất) cho mỗi UID
          const seen = new Set<string>();
          for (const s of scans) {
            if (seen.has(s.uid)) continue;
            seen.add(s.uid);
            if (s.lat == null || s.lng == null) continue;
            const a = alerts.find(x => x.uid === s.uid);
            const weight = a?.mucDo === 'critical' ? 4 : a?.mucDo === 'high' ? 3 : a?.mucDo === 'medium' ? 2 : 1;
            features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
              properties: { weight, meta: a?.mucDo },
            });
          }
        }
      }

    } else if (type === 'dn') {
      // ─── Mật độ DOANH NGHIỆP (Phase 3 — geocoded coords) ─────────
      // weight cao hơn cho DN verified (NSX/NNK đã được duyệt KYC)
      const dns = await prisma.doanhNghiep.findMany({
        where: { AND: [{ lat: { not: null } as any }, { lng: { not: null } as any }] } as any,
        select: { id: true, ten: true, loai: true, lat: true, lng: true, trangThai: true } as any,
        take: 2000,
      } as any);
      for (const d of dns) {
        const lat = (d as any).lat, lng = (d as any).lng;
        if (lat == null || lng == null) continue;
        // verified DN: weight 2, pending/suspended: weight 1
        const weight = (d as any).trangThai === 'verified' ? 2 : 1;
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { weight, city: (d as any).ten || '', meta: `${(d as any).loai || ''}|${(d as any).trangThai || ''}` },
        });
      }
    }

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
      meta: {
        layer: type,
        period,
        count: features.length,
        since: since ? since.toISOString() : null,
        until: until ? until.toISOString() : null,
      },
    });
  } catch (e: any) {
    console.error('[/api/heatmap]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
