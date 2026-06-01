// FR-INTEG-GOV: API "đầu chờ" cho cơ quan chức năng (Quản lý thị trường, Công an, Bộ Công Thương)
// Đáp ứng yêu cầu tài liệu nghiệp vụ §VII (Quản lý hậu kiểm) + §II.5 (TrustCheck API):
//   "hệ thống hoạt động độc lập, khách quan, nhưng có sẵn endpoint để cơ quan kết nối
//    khi có thỏa thuận chính thức"
//
// Auth: API key qua header `x-gov-api-key` (key cấp riêng cho từng cơ quan).
// Format key trong env `GOV_API_KEYS`: "key1:tenCoQuan1,key2:tenCoQuan2"
// Dev fallback: key "demo-qltt-2026" → cơ quan "demo"

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ALLOWED_KEYS = (process.env.GOV_API_KEYS || '').split(',').filter(Boolean);
const DEFAULT_DEMO_KEY = 'demo-qltt-2026';

function verifyApiKey(req: NextRequest): { ok: boolean; agency?: string } {
  const key = req.headers.get('x-gov-api-key') || '';
  if (!key) return { ok: false };
  if (ALLOWED_KEYS.length > 0) {
    const match = ALLOWED_KEYS.find(k => k === key || k.startsWith(key + ':'));
    if (!match) return { ok: false };
    return { ok: true, agency: match.includes(':') ? match.split(':')[1] : 'unknown' };
  }
  if (key === DEFAULT_DEMO_KEY) return { ok: true, agency: 'demo' };
  return { ok: false };
}

export async function GET(req: NextRequest) {
  const auth = verifyApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({
      error: 'unauthorized',
      message: 'Thiếu hoặc sai header x-gov-api-key. Liên hệ admin@vntrust.vn để cấp khóa cho cơ quan.',
      hint: 'Dev/test: x-gov-api-key: demo-qltt-2026',
    }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource') || 'info';

  try {
    await prisma.nhatKy.create({
      data: {
        action: `[AGENCY-API] ${auth.agency} truy cập resource=${resource}`,
        user: `agency:${auth.agency}`,
        role: 'agency',
        ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        status: 'success',
      },
    });
  } catch {}

  switch (resource) {
    case 'info':
      return NextResponse.json({
        service: 'VNTrust Agency Integration API',
        version: '1.0.0',
        agency: auth.agency,
        endpoints: {
          'GET ?resource=info':       'Service metadata',
          'GET ?resource=alerts':     'Cảnh báo đang mở (read-only)',
          'GET ?resource=violations': 'Hậu kiểm vượt ngưỡng (đã verified)',
          'GET ?resource=stats':      'Thống kê tổng quan',
          'POST (body)':              'Upload kết quả phân tích hậu kiểm (đối tượng thứ 3)',
        },
        note: 'Hệ thống hoạt động độc lập theo Nghị định 37/2026 — dữ liệu cung cấp cho mục đích tham khảo/thanh tra chính thức.',
      });

    case 'alerts': {
      const alerts = await prisma.canhBao.findMany({
        where: { trangThai: 'open', mucDo: { in: ['medium', 'high'] } },
        orderBy: { thoiGian: 'desc' },
        take: 100,
      });
      return NextResponse.json({ count: alerts.length, alerts });
    }

    case 'violations': {
      const violations = await prisma.ketQuaHauKiem.findMany({
        where: { ketQua: 'khongdambao', trangThaiXacMinh: 'verified' },
        include: {
          sanPham: { include: { doanhNghiep: { select: { ten: true, maSoThue: true, diaChi: true } } } },
          loHang: true,
        },
        orderBy: { ngayPhanTich: 'desc' },
        take: 200,
      });
      return NextResponse.json({ count: violations.length, violations });
    }

    case 'stats': {
      const [totalScans, fakeScans, openAlerts, violationsTotal, totalProducts, totalDN] = await Promise.all([
        prisma.luotQuet.count(),
        prisma.luotQuet.count({ where: { ketQua: 'fake' } }),
        prisma.canhBao.count({ where: { trangThai: 'open' } }),
        prisma.ketQuaHauKiem.count({ where: { ketQua: 'khongdambao', trangThaiXacMinh: 'verified' } }),
        prisma.sanPham.count(),
        prisma.doanhNghiep.count({ where: { trangThai: 'verified' } }),
      ]);
      return NextResponse.json({
        totalScans, fakeScans, openAlerts,
        verifiedViolations: violationsTotal,
        totalProducts, verifiedManufacturers: totalDN,
        fakeRate: totalScans > 0 ? (fakeScans / totalScans * 100).toFixed(2) + '%' : '0%',
      });
    }

    default:
      return NextResponse.json({ error: 'unknown_resource', allowed: ['info', 'alerts', 'violations', 'stats'] }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const auth = verifyApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 403 });

  try {
    const body = await req.json();
    const { coSoPhanTich, ngayLayMau, ngayPhanTich, ketQua, chiTieuVuotNguong, fileDinhKem, ghiChu, sanPhamId, loHangId } = body;

    if (!coSoPhanTich || !ngayLayMau || !ngayPhanTich || !ketQua) {
      return NextResponse.json({ error: 'missing_required_fields', required: ['coSoPhanTich', 'ngayLayMau', 'ngayPhanTich', 'ketQua'] }, { status: 400 });
    }

    const created = await prisma.ketQuaHauKiem.create({
      data: {
        doiTuongLayMau: 'doituongthu3',
        coSoPhanTich: `${coSoPhanTich} [via Agency: ${auth.agency}]`,
        ngayLayMau: new Date(ngayLayMau),
        ngayPhanTich: new Date(ngayPhanTich),
        ketQua,
        chiTieuVuotNguong,
        fileDinhKem,
        ghiChu: ghiChu || `Cơ quan ${auth.agency} tự động ghi nhận`,
        sanPhamId: sanPhamId || null,
        loHangId: loHangId || null,
        trangThaiXacMinh: 'pending',
      },
    });

    if (ketQua === 'khongdambao') {
      await prisma.canhBao.create({
        data: {
          loai: 'AGENCY_REPORT',
          mucDo: 'high',
          moTa: `[CƠ QUAN ${(auth.agency || 'unknown').toUpperCase()}] Kết quả hậu kiểm VƯỢT NGƯỠNG từ ${coSoPhanTich}. Chỉ tiêu: ${chiTieuVuotNguong || '(xem file)'}`,
          uid: sanPhamId || loHangId || null,
        },
      });
    }

    return NextResponse.json({ success: true, id: created.id, status: 'pending_admin_verification' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
