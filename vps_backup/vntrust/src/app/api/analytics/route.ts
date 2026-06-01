import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// FR-BAT-06: Cảnh báo lô hàng sắp hết hạn (30 ngày)
// FR-RPT-06: Báo cáo phân tích tuần/tháng/quý
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;
    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'overview'; // overview | expiring | scan_stats | fake_trend
    const period = searchParams.get('period') || 'month'; // week | month | quarter

    const now = new Date();
    const periodStart = new Date();
    if (period === 'week') periodStart.setDate(now.getDate() - 7);
    else if (period === 'month') periodStart.setMonth(now.getMonth() - 1);
    else if (period === 'quarter') periodStart.setMonth(now.getMonth() - 3);

    const baseWhere = userRole === 'admin'
      ? {}
      : { sanPham: { doanhNghiepId: doanhNghiepId || 'none' } };

    const baseScanWhere = userRole === 'admin'
      ? {}
      : { maDinhDanh: { loHang: { sanPham: { doanhNghiepId: doanhNghiepId || 'none' } } } };

    const baseCodeWhere = userRole === 'admin'
      ? {}
      : { loHang: { sanPham: { doanhNghiepId: doanhNghiepId || 'none' } } };

    if (type === 'expiring') {
      // FR-BAT-06: Lô sắp hết hạn trong 30 ngày
      const thirtyDays = new Date();
      thirtyDays.setDate(now.getDate() + 30);

      const expiring = await prisma.loHang.findMany({
        where: {
          ...baseWhere,
          hanDung: { gte: now, lte: thirtyDays },
          trangThai: { not: 'suspended' },
        },
        include: {
          sanPham: { select: { ten: true, maSKU: true } },
          _count: { select: { uids: true } },
        },
        orderBy: { hanDung: 'asc' },
      });

      const expired = await prisma.loHang.findMany({
        where: {
          ...baseWhere,
          hanDung: { lt: now },
          trangThai: { not: 'suspended' },
        },
        include: {
          sanPham: { select: { ten: true, maSKU: true } },
          _count: { select: { uids: true } },
        },
        orderBy: { hanDung: 'desc' },
        take: 20,
      });

      return NextResponse.json({ expiring, expired });
    }

    if (type === 'scan_stats') {
      // FR-CNS-04: Thống kê lượt quét
      const totalScans = await prisma.luotQuet.count({
        where: { thoiGian: { gte: periodStart }, ...baseScanWhere },
      });
      const genuineScans = await prisma.luotQuet.count({
        where: { thoiGian: { gte: periodStart }, ketQua: 'genuine', ...baseScanWhere },
      });
      const suspectScans = await prisma.luotQuet.count({
        where: { thoiGian: { gte: periodStart }, ketQua: { in: ['suspect', 'fake'] }, ...baseScanWhere },
      });

      // Top scanned products
      const topProducts = await prisma.maDinhDanh.findMany({
        where: { soLanQuet: { gt: 0 }, ...baseCodeWhere },
        orderBy: { soLanQuet: 'desc' },
        take: 10,
        include: { loHang: { include: { sanPham: { select: { ten: true, maSKU: true } } } } },
      });

      // Daily scan trend (last 7 days)
      const scanTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dEnd = new Date(d);
        dEnd.setHours(23, 59, 59, 999);
        const count = await prisma.luotQuet.count({
          where: { thoiGian: { gte: d, lte: dEnd }, ...baseScanWhere },
        });
        scanTrend.push({ date: d.toLocaleDateString('vi-VN'), count });
      }

      return NextResponse.json({ totalScans, genuineScans, suspectScans, topProducts, scanTrend });
    }

    if (type === 'fake_trend') {
      // FR-RPT-05: Thống kê hàng giả / nghi ngờ theo khu vực
      const fakeScans = await prisma.luotQuet.findMany({
        where: {
          ketQua: { in: ['fake', 'suspect'] },
          thoiGian: { gte: periodStart },
          lat: { not: null },
          lng: { not: null },
          ...baseScanWhere
        },
        orderBy: { thoiGian: 'desc' },
        take: 500,
        select: { lat: true, lng: true, ketQua: true, thoiGian: true, diaChi_IP: true },
      });

      // CanhBao stats
      const alertStats = await prisma.canhBao.groupBy({
        by: ['mucDo'],
        _count: true,
        where: { thoiGian: { gte: periodStart } },
      });

      return NextResponse.json({ fakeScans, alertStats });
    }

    // Overview dashboard stats
    const totalProducts = await prisma.sanPham.count({ where: userRole === 'admin' ? {} : { doanhNghiepId: doanhNghiepId || 'none' } });
    const totalBatches = await prisma.loHang.count({ where: baseWhere });
    const totalQR = await prisma.maDinhDanh.count({ where: baseCodeWhere });
    const totalScans = await prisma.luotQuet.count({ where: { thoiGian: { gte: periodStart }, ...baseScanWhere } });
    const totalFake = await prisma.luotQuet.count({ where: { ketQua: { in: ['fake', 'suspect'] }, thoiGian: { gte: periodStart }, ...baseScanWhere } });
    const openAlerts = await prisma.canhBao.count({ where: { trangThai: 'open' } });

    // Expiring soon count (30 days)
    const thirtyDays = new Date();
    thirtyDays.setDate(now.getDate() + 30);
    const expiringSoon = await prisma.loHang.count({
      where: { ...baseWhere, hanDung: { gte: now, lte: thirtyDays } },
    });

    return NextResponse.json({
      period,
      totalProducts,
      totalBatches,
      totalQR,
      totalScans,
      totalFake,
      openAlerts,
      expiringSoon,
      fakeRate: totalScans > 0 ? ((totalFake / totalScans) * 100).toFixed(1) : '0.0',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
