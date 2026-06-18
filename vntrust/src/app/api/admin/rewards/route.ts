import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/admin/rewards
// Returns all users and their total reward points
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users
    const users = await prisma.nguoiDung.findMany({
      select: {
        id: true,
        ten: true,
        email: true,
        vaiTro: true,
      },
    });

    // Get total points per user
    const points = await prisma.rewardHistory.groupBy({
      by: ['nguoiDungId'],
      _sum: { diemThuong: true },
    });

    const pointsMap = new Map(points.map((p) => [p.nguoiDungId, p._sum.diemThuong || 0]));

    const usersWithPoints = users.map(u => ({
      ...u,
      tongDiem: pointsMap.get(u.id) || 0,
    }));

    return NextResponse.json(usersWithPoints);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
