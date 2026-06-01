import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

// Fake "CanhBao" table entries for distribution — we'll use NhatKy as placeholder
// and a simple JSON-based approach for demo

// GET: List distribution records for a company
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();

    // Support both cookie auth and query-param auth (localStorage-based clients)
    const userRole = cookieStore.get('userRole')?.value || searchParams.get('role') || '';
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value || searchParams.get('doanhNghiepId') || '';

    if (!userRole) return NextResponse.json({ batches: [] });

    let finalDnId = doanhNghiepId;
    if (!finalDnId && userRole !== 'admin') {
      const userName = cookieStore.get('userName')?.value;
      if (userName) {
        const user = await prisma.nguoiDung.findFirst({ where: { ten: userName } });
        if (user && user.doanhNghiepId) finalDnId = user.doanhNghiepId;
      }
    }

    const whereClause = userRole === 'admin'
      ? {}
      : { sanPham: { doanhNghiepId: finalDnId || undefined } };

    const batches = await prisma.loHang.findMany({
      where: finalDnId || userRole === 'admin' ? whereClause : { id: 'no-match' },
      include: {
        sanPham: { include: { doanhNghiep: { select: { ten: true } } } },
        _count: { select: { uids: true } },
      },
      orderBy: { ngaySanXuat: 'desc' },
      take: 100,
    });

    return NextResponse.json({ batches });
  } catch (e: any) {
    return NextResponse.json({ batches: [], error: e.message }, { status: 500 });
  }
}

// PATCH: Activate/deactivate batch (kích hoạt xuất kho)
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || (userRole !== 'admin' && userRole !== 'manufacturer' && userRole !== 'importer')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // P1a — Sub-role: company_admin + warehouse được cập nhật trạng thái phân phối
    const vaiTroCty = cookieStore.get('vaiTroCty')?.value;
    if (userRole !== 'admin' && vaiTroCty && !['company_admin', 'warehouse', 'staff_input'].includes(vaiTroCty)) {
      return NextResponse.json({ error: `Forbidden — vai trò nội bộ "${vaiTroCty}" không có quyền cập nhật phân phối` }, { status: 403 });
    }

    const { loHangId, trangThai, khuVucPhanPhoi } = await req.json();
    if (!loHangId || !trangThai) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

    // Verify ownership
    const lo = await prisma.loHang.findUnique({
      where: { id: loHangId },
      include: { sanPham: true },
    });
    if (!lo) return NextResponse.json({ error: 'Không tìm thấy lô hàng' }, { status: 404 });
    if (userRole !== 'admin' && lo.sanPham.doanhNghiepId !== doanhNghiepId) {
      return NextResponse.json({ error: 'Forbidden: Không có quyền với lô này' }, { status: 403 });
    }

    await prisma.loHang.update({
      where: { id: loHangId },
      data: { trangThai },
    });

    const actionLabel = trangThai === 'active' ? 'Kích hoạt' : trangThai === 'distributed' ? 'Xuất kho' : 'Khóa';
    await prisma.nhatKy.create({
      data: {
        action: `${actionLabel} lô hàng ${lo.maLo}${khuVucPhanPhoi ? ' → ' + khuVucPhanPhoi : ''}`,
        user: userRole === 'admin' ? 'Admin' : lo.sanPham.doanhNghiepId,
        role: userRole,
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: 'success',
      }
    });

    return NextResponse.json({ success: true, loHang: { id: loHangId, trangThai } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
