import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/report/history
// Trả về lịch sử kiểm tra của người dùng đang đăng nhập hoặc session ẩn danh hiện tại
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const nguoiDungId   = cookieStore.get('userId')?.value    || null;
    const sessionRef    = cookieStore.get('sessionToken')?.value || null;

    if (!nguoiDungId && !sessionRef) {
      return NextResponse.json({ history: [] });
    }

    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip  = (page - 1) * limit;

    // Điều kiện lọc: theo userId nếu đã đăng nhập, hoặc theo sessionRef cho guest
    const where: any = nguoiDungId
      ? { nguoiDungId }
      : { sessionRef };

    const [total, history] = await Promise.all([
      prisma.lichSuKiemTra.count({ where }),
      prisma.lichSuKiemTra.findMany({
        where,
        orderBy: { thoiGian: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Với mỗi bản ghi có canhBaoId, lấy thêm mã hồ sơ CASE
    const enriched = await Promise.all(
      history.map(async (h) => {
        let maCaseHoSo = null;
        let trangThaiDieuTra = null;
        if (h.canhBaoId) {
          const cb = await prisma.canhBao.findUnique({
            where: { id: h.canhBaoId },
            select: { maCaseHoSo: true, trangThaiDieuTra: true, mucDo: true },
          });
          maCaseHoSo       = cb?.maCaseHoSo       ?? null;
          trangThaiDieuTra = cb?.trangThaiDieuTra ?? null;
        }
        return { ...h, maCaseHoSo, trangThaiDieuTra };
      })
    );

    return NextResponse.json({
      history: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
