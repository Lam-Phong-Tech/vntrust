// §V.5 Sprint 9 — Báo cáo & Phân tích Vòng đời (4 reports)
// 1. cert-expiring     — CN sắp hết hạn trong 3 tháng tới
// 2. batch-near-date   — Lô hàng cận date, đề xuất xả hàng
// 3. standards-compliance — Tỷ lệ CN còn hiệu lực vs hết hạn
// 4. alert-response    — Thống kê thời gian phản hồi xử lý cảnh báo

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getLifecycleConfig } from '@/lib/lifecycleConfig';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value;
  const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

  if (!userRole || !['admin', 'manufacturer', 'importer'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'cert-expiring';

  // Filter scope: admin = all, NSX/NNK = own
  const dnScope = userRole === 'admin' ? null : doanhNghiepId;
  const config = await getLifecycleConfig(dnScope);

  const now = new Date();
  const in3Months = new Date(now.getTime() + 90 * 24 * 3600 * 1000);

  // ── Báo cáo 1: Chứng nhận sắp hết hạn trong 3 tháng ──────────
  if (type === 'cert-expiring') {
    const where: any = {
      ngayHetHan: { gte: now, lte: in3Months },
    };
    if (dnScope) where.sanPham = { doanhNghiepId: dnScope };

    const certs = await prisma.chungNhan.findMany({
      where,
      include: {
        sanPham: {
          select: {
            ten: true, maSKU: true,
            doanhNghiep: { select: { ten: true } },
          },
        },
      },
      orderBy: { ngayHetHan: 'asc' },
      take: 100,
    });

    // Group theo loại chứng nhận
    const byLoai = certs.reduce((acc: Record<string, number>, c) => {
      acc[c.loai] = (acc[c.loai] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      report: 'cert-expiring',
      title: 'Chứng nhận sắp hết hạn (3 tháng tới)',
      total: certs.length,
      byLoai,
      items: certs.map(c => ({
        id: c.id,
        loai: c.loai,
        soChungNhan: c.soChungNhan,
        ngayHetHan: c.ngayHetHan,
        daysLeft: Math.ceil((c.ngayHetHan.getTime() - now.getTime()) / (24 * 3600 * 1000)),
        sanPham: c.sanPham?.ten,
        sku: c.sanPham?.maSKU,
        doanhNghiep: c.sanPham?.doanhNghiep?.ten,
      })),
    });
  }

  // ── Báo cáo 2: Lô hàng cận date ─────────────────────────────
  if (type === 'batch-near-date') {
    const cutoff = new Date(now.getTime() + config.expWarnDays * 24 * 3600 * 1000);
    const where: any = {
      hanDung: { gte: now, lte: cutoff },
      trangThai: { notIn: ['recalled', 'suspended'] },
    };
    if (dnScope) where.sanPham = { doanhNghiepId: dnScope };

    const loHangs = await prisma.loHang.findMany({
      where,
      include: {
        sanPham: {
          select: {
            ten: true, nhomSanPham: true,
            doanhNghiep: { select: { ten: true } },
          },
        },
      },
      orderBy: { hanDung: 'asc' },
      take: 100,
    });

    // Group theo nhóm SP
    const byNhomSP = loHangs.reduce((acc: Record<string, number>, lo) => {
      const nhom = lo.sanPham?.nhomSanPham || 'Khác';
      acc[nhom] = (acc[nhom] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      report: 'batch-near-date',
      title: `Lô hàng cận date (còn ≤ ${config.expWarnDays} ngày)`,
      total: loHangs.length,
      threshold: config.expWarnDays,
      byNhomSP,
      items: loHangs.map(lo => ({
        id: lo.id,
        maLo: lo.maLo,
        soLuong: lo.soLuong,
        ngaySanXuat: lo.ngaySanXuat,
        hanDung: lo.hanDung,
        daysLeft: Math.ceil((lo.hanDung.getTime() - now.getTime()) / (24 * 3600 * 1000)),
        sanPham: lo.sanPham?.ten,
        nhomSanPham: lo.sanPham?.nhomSanPham,
        doanhNghiep: lo.sanPham?.doanhNghiep?.ten,
        deXuat: lo.soLuong > 100 ? 'Đẩy mạnh xả hàng / chương trình ưu đãi' : 'Theo dõi tiếp',
      })),
    });
  }

  // ── Báo cáo 3: Tuân thủ tiêu chuẩn ──────────────────────────
  if (type === 'standards-compliance') {
    const where: any = {};
    if (dnScope) where.sanPham = { doanhNghiepId: dnScope };

    const certs = await prisma.chungNhan.findMany({
      where,
      include: { sanPham: { select: { doanhNghiep: { select: { ten: true } } } } },
    });

    // Group by loại + count valid vs expired
    const byLoai: Record<string, { total: number; valid: number; expired: number }> = {};
    for (const c of certs) {
      const loai = c.loai.toUpperCase().split(/[^A-Z0-9]/)[0] || c.loai;
      if (!byLoai[loai]) byLoai[loai] = { total: 0, valid: 0, expired: 0 };
      byLoai[loai].total++;
      if (c.ngayHetHan.getTime() < now.getTime()) byLoai[loai].expired++;
      else byLoai[loai].valid++;
    }
    const summary = Object.entries(byLoai).map(([loai, v]) => ({
      loai,
      total: v.total,
      valid: v.valid,
      expired: v.expired,
      validRate: v.total > 0 ? Math.round((v.valid / v.total) * 100) : 0,
    })).sort((a, b) => a.validRate - b.validRate);

    // Tổng
    const totalCerts = certs.length;
    const totalValid = certs.filter(c => c.ngayHetHan.getTime() >= now.getTime()).length;
    const overallValidRate = totalCerts > 0 ? Math.round((totalValid / totalCerts) * 100) : 0;

    return NextResponse.json({
      report: 'standards-compliance',
      title: 'Tỷ lệ tuân thủ tiêu chuẩn',
      total: totalCerts,
      totalValid,
      totalExpired: totalCerts - totalValid,
      overallValidRate,
      byLoai: summary,
    });
  }

  // ── Báo cáo 4: Thời gian xử lý cảnh báo ──────────────────────
  if (type === 'alert-response') {
    // Lifecycle alerts only
    const alerts = await prisma.canhBao.findMany({
      where: {
        loai: { in: ['HET_HAN_CHUNG_NHAN', 'HET_HAN_LO_HANG', 'CHUNG_NHAN_LOI_THOI'] },
      },
      take: 500,
      orderBy: { thoiGian: 'desc' },
    });

    const open = alerts.filter(a => a.trangThai === 'open');
    const reviewing = alerts.filter(a => a.trangThai === 'reviewing');
    const closed = alerts.filter(a => a.trangThai === 'closed');

    // Approximate response time: từ thoiGian (created) → time đóng/review
    // Vì không có updatedAt, dùng escalatedAt làm proxy nếu có
    const respTimesH: number[] = [];
    for (const a of closed) {
      // Use escalatedAt as proxy for handled time
      if (a.escalatedAt) {
        const h = (a.escalatedAt.getTime() - a.thoiGian.getTime()) / (3600 * 1000);
        if (h >= 0) respTimesH.push(h);
      }
    }
    const avgResp = respTimesH.length > 0 ? respTimesH.reduce((a, b) => a + b, 0) / respTimesH.length : null;

    // Tỷ lệ cảnh báo bị escalate (chưa xử lý > 48h)
    const escalated = alerts.filter(a => a.escalatedAt).length;

    return NextResponse.json({
      report: 'alert-response',
      title: 'Hiệu quả xử lý cảnh báo vòng đời',
      totalAlerts: alerts.length,
      open: open.length,
      reviewing: reviewing.length,
      closed: closed.length,
      closeRate: alerts.length > 0 ? Math.round((closed.length / alerts.length) * 100) : 0,
      escalated,
      escalateRate: alerts.length > 0 ? Math.round((escalated / alerts.length) * 100) : 0,
      avgResponseTimeHours: avgResp ? Math.round(avgResp * 10) / 10 : null,
      // Breakdown by severity
      byMucDo: {
        high:   alerts.filter(a => a.mucDo === 'high').length,
        medium: alerts.filter(a => a.mucDo === 'medium').length,
        low:    alerts.filter(a => a.mucDo === 'low').length,
      },
    });
  }

  return NextResponse.json({
    error: 'Unknown report type',
    available: ['cert-expiring', 'batch-near-date', 'standards-compliance', 'alert-response'],
  }, { status: 400 });
}
