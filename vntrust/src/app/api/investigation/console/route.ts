// GET /api/investigation/console
// Investigation Console — danh sách hồ sơ cần điều tra cho cán bộ

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    
    // Chỉ admin hoặc cán bộ điều tra mới được xem
    if (role !== 'admin' && role !== 'investigator' && role !== 'manufacturer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'cho_phan_tich'; // cho_phan_tich, dang_dieu_tra, da_xu_ly
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where = { trangThaiDieuTra: status };

    const [total, cases] = await Promise.all([
      prisma.canhBao.count({ where }),
      prisma.canhBao.findMany({
        where,
        orderBy: { riskScore: 'desc' }, // Ưu tiên điểm rủi ro cao nhất
        skip,
        take: limit,
        select: {
          id: true,
          maCaseHoSo: true,
          loai: true,
          mucDo: true,
          trangThaiDieuTra: true,
          riskScore: true,
          thoiGian: true,
          uid: true,
          tinhTrangSP: true,
          loaiPhanAnh: true,
        }
      })
    ]);

    // Tổng hợp số liệu dashboard
    const stats = await prisma.canhBao.groupBy({
      by: ['trangThaiDieuTra'],
      _count: { id: true }
    });

    return NextResponse.json({
      cases,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats.reduce((acc, curr) => ({ ...acc, [curr.trangThaiDieuTra || 'unknown']: curr._count.id }), {})
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
