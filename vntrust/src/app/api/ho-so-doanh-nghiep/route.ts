// Hồ sơ doanh nghiệp — tổng hợp thông tin DN + thống kê + chứng nhận + giấy phép
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const c = await cookies();
    const role = c.get('userRole')?.value;
    const dnId = c.get('doanhNghiepId')?.value;
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin có thể xem hồ sơ DN bất kỳ qua ?id=
    const qId = new URL(req.url).searchParams.get('id');
    const targetId = role === 'admin' && qId ? qId : dnId;
    if (!targetId) return NextResponse.json({ error: 'Tài khoản chưa gắn doanh nghiệp' }, { status: 403 });

    const company = await prisma.doanhNghiep.findUnique({ where: { id: targetId } });
    if (!company) return NextResponse.json({ error: 'Không tìm thấy doanh nghiệp' }, { status: 404 });

    const [products, batches, certs, licenses] = await Promise.all([
      prisma.sanPham.count({ where: { doanhNghiepId: targetId } }),
      prisma.loHang.count({ where: { sanPham: { doanhNghiepId: targetId } } }),
      prisma.chungNhan.findMany({
        where: { OR: [{ doanhNghiepId: targetId }, { sanPham: { doanhNghiepId: targetId } }] },
        select: { id: true, loai: true, soChungNhan: true, ngayCap: true, ngayHetHan: true, toChucCap: true, trangThaiDuyet: true, hinhAnhUrl: true },
        orderBy: { ngayCap: 'desc' },
        take: 50,
      }),
      prisma.giayPhepLuuHanh.findMany({ where: { doanhNghiepId: targetId }, orderBy: { ngayTao: 'desc' } }),
    ]);

    return NextResponse.json({
      company,
      stats: { products, batches, certs: certs.length, licenses: licenses.length },
      certs,
      licenses,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
