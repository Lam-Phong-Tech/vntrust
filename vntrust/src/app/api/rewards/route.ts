import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/rewards
// Trả về điểm thưởng tích lũy và lịch sử của người dùng đang đăng nhập
export async function GET(req: NextRequest) {
  try {
    const cookieStore  = await cookies();
    const nguoiDungId  = cookieStore.get('userId')?.value;

    if (!nguoiDungId) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để xem điểm thưởng' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get('page')  || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip  = (page - 1) * limit;

    const [total, history, tongDiem] = await Promise.all([
      prisma.rewardHistory.count({ where: { nguoiDungId } }),
      prisma.rewardHistory.findMany({
        where: { nguoiDungId },
        orderBy: { thoiGian: 'desc' },
        skip,
        take: limit,
      }),
      // Tổng điểm tích lũy
      prisma.rewardHistory.aggregate({
        where: { nguoiDungId },
        _sum: { diemThuong: true },
      }),
    ]);

    // Top 10 leaderboard — tổng điểm
    const leaderboard = await prisma.rewardHistory.groupBy({
      by: ['nguoiDungId'],
      _sum: { diemThuong: true },
      orderBy: { _sum: { diemThuong: 'desc' } },
      take: 10,
    });

    // Xếp hạng cá nhân
    const myRank = leaderboard.findIndex((l) => l.nguoiDungId === nguoiDungId) + 1;

    return NextResponse.json({
      tongDiem:   tongDiem._sum.diemThuong ?? 0,
      xepHang:    myRank > 0 ? myRank : null,
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      leaderboard: leaderboard.map((l, i) => ({
        rank:       i + 1,
        nguoiDungId: l.nguoiDungId,
        tongDiem:   l._sum.diemThuong ?? 0,
        isMe:       l.nguoiDungId === nguoiDungId,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/rewards
// Admin cấp điểm thưởng cho người dùng (sau khi xác minh báo cáo chính xác)
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole    = cookieStore.get('userRole')?.value;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { nguoiDungId, loai, diemThuong, moTa } = await req.json();

    const ALLOWED_LOAI = ['bao_cao_chinh_xac', 'phat_hien_gia', 'dang_ky_san_pham'];
    if (!nguoiDungId || !diemThuong) {
      return NextResponse.json({ error: 'Thiếu nguoiDungId hoặc diemThuong' }, { status: 400 });
    }

    const reward = await prisma.rewardHistory.create({
      data: {
        nguoiDungId,
        loai:       ALLOWED_LOAI.includes(loai) ? loai : 'bao_cao_chinh_xac',
        diemThuong: parseInt(diemThuong),
        moTa:       moTa || null,
      },
    });

    return NextResponse.json({ success: true, reward });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
