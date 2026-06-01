// Admin user management — GET list
// Admin-only endpoint: liệt kê toàn bộ NguoiDung kèm DN, filter theo role/status/search
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const roleFilter   = searchParams.get('role')   || ''; // admin|manufacturer|importer|consumer|staff
    const statusFilter = searchParams.get('status') || ''; // active|suspended|pending
    const search       = (searchParams.get('q') || '').trim();

    const where: any = {};
    if (roleFilter)   where.vaiTro    = roleFilter;
    if (statusFilter) where.trangThai = statusFilter;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { ten:   { contains: search } },
        { soDienThoai: { contains: search } },
      ];
    }

    const users = await prisma.nguoiDung.findMany({
      where,
      select: {
        id: true,
        ten: true,
        email: true,
        soDienThoai: true,
        vaiTro: true,
        trangThai: true,
        doanhNghiepId: true,
        doanhNghiep: {
          select: { id: true, ten: true, loai: true, maSoThue: true },
        },
      },
      orderBy: [{ trangThai: 'asc' }, { vaiTro: 'asc' }, { email: 'asc' }],
    });

    // Aggregate stats
    const [total, byRole, byStatus] = await Promise.all([
      prisma.nguoiDung.count(),
      prisma.nguoiDung.groupBy({ by: ['vaiTro'],    _count: { _all: true } }),
      prisma.nguoiDung.groupBy({ by: ['trangThai'], _count: { _all: true } }),
    ]);

    return NextResponse.json({
      users,
      total,
      stats: {
        byRole:   Object.fromEntries(byRole.map(r => [r.vaiTro,    r._count._all])),
        byStatus: Object.fromEntries(byStatus.map(r => [r.trangThai, r._count._all])),
      },
    });
  } catch (e: any) {
    console.error('[admin/users GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
