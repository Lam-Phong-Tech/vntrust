// GET /api/analytics-multi — phân tích đa chiều theo doc §II.PH3.3.2
// Query params:
//   groupBy:   hour | day | week | month | quarter | season
//   metric:    scans | reports | violations | alerts
//   from:      ISO date
//   to:        ISO date
//   tinh:      tên tỉnh/thành (lọc theo địa chỉ scan)
//   nganh:     nhóm sản phẩm (thuc_pham | duoc_pham | my_pham...)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type GroupBy = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'season';

function bucketKey(date: Date, groupBy: GroupBy): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  switch (groupBy) {
    case 'hour':    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:00`;
    case 'day':     return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    case 'week':    {
      const onejan = new Date(y, 0, 1);
      const week = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
      return `${y}-W${String(week).padStart(2,'0')}`;
    }
    case 'month':   return `${y}-${String(m).padStart(2,'0')}`;
    case 'quarter': return `${y}-Q${Math.ceil(m / 3)}`;
    case 'season':  {
      // VN: Xuân(3-5) Hạ(6-8) Thu(9-11) Đông(12-2)
      const season = m >= 3 && m <= 5 ? 'Xuân' : m >= 6 && m <= 8 ? 'Hạ' : m >= 9 && m <= 11 ? 'Thu' : 'Đông';
      const yearForWinter = m === 12 ? y : (m <= 2 ? y - 1 : y);
      return season === 'Đông' ? `${yearForWinter}-Đông` : `${y}-${season}`;
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupBy = (searchParams.get('groupBy') || 'day') as GroupBy;
    const metric = searchParams.get('metric') || 'scans';
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const tinh = searchParams.get('tinh');
    const nganh = searchParams.get('nganh');

    if (!['hour', 'day', 'week', 'month', 'quarter', 'season'].includes(groupBy)) {
      return NextResponse.json({ error: 'invalid_groupBy' }, { status: 400 });
    }

    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);

    let rows: Array<{ thoiGian: Date; extra?: any }> = [];

    if (metric === 'scans') {
      const where: any = { thoiGian: { gte: from, lte: to } };
      if (tinh) where.diaChi_IP = { contains: tinh };
      const scans = await prisma.luotQuet.findMany({
        where,
        select: { thoiGian: true, ketQua: true, diaChi_IP: true,
                  maDinhDanh: { select: { loHang: { select: { sanPham: { select: { nhomSanPham: true } } } } } } },
        take: 10000,
      });
      rows = scans
        .filter(s => !nganh || s.maDinhDanh?.loHang?.sanPham?.nhomSanPham === nganh)
        .map(s => ({ thoiGian: s.thoiGian, extra: { ketQua: s.ketQua } }));
    } else if (metric === 'reports') {
      const reports = await prisma.canhBao.findMany({
        where: { loai: { startsWith: 'NGUOI_DUNG_BAO_CAO' }, thoiGian: { gte: from, lte: to } },
        select: { thoiGian: true, mucDo: true, loaiPhanAnh: true, noiMua: true },
        take: 10000,
      });
      rows = reports.map(r => ({ thoiGian: r.thoiGian, extra: { mucDo: r.mucDo, loaiPhanAnh: r.loaiPhanAnh, noiMua: r.noiMua } }));
    } else if (metric === 'violations') {
      const v = await prisma.ketQuaHauKiem.findMany({
        where: { ketQua: 'khongdambao', ngayTao: { gte: from, lte: to } },
        select: { ngayTao: true, doiTuongLayMau: true,
                  sanPham: { select: { nhomSanPham: true } } },
        take: 10000,
      });
      rows = v.filter(x => !nganh || x.sanPham?.nhomSanPham === nganh)
              .map(x => ({ thoiGian: x.ngayTao, extra: { doiTuongLayMau: x.doiTuongLayMau } }));
    } else if (metric === 'alerts') {
      const a = await prisma.canhBao.findMany({
        where: { thoiGian: { gte: from, lte: to } },
        select: { thoiGian: true, loai: true, mucDo: true, trangThai: true },
        take: 10000,
      });
      rows = a.map(x => ({ thoiGian: x.thoiGian, extra: { loai: x.loai, mucDo: x.mucDo } }));
    } else {
      return NextResponse.json({ error: 'invalid_metric', allowed: ['scans', 'reports', 'violations', 'alerts'] }, { status: 400 });
    }

    // Group by bucket
    const buckets: Record<string, any> = {};
    for (const r of rows) {
      const key = bucketKey(new Date(r.thoiGian), groupBy);
      if (!buckets[key]) buckets[key] = { count: 0, breakdown: {} };
      buckets[key].count++;
      // Breakdown theo extra
      if (r.extra) {
        for (const [k, v] of Object.entries(r.extra)) {
          if (!v) continue;
          const bk = `${k}:${v}`;
          buckets[key].breakdown[bk] = (buckets[key].breakdown[bk] || 0) + 1;
        }
      }
    }

    const series = Object.keys(buckets).sort().map(key => ({ key, ...buckets[key] }));

    return NextResponse.json({
      groupBy, metric, from, to, tinh, nganh,
      totalCount: rows.length,
      series,
    });
  } catch (e: any) {
    console.error('GET /api/analytics-multi:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
