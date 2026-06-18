import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const nguoiDungId = cookieStore.get('userId')?.value;

    if (!nguoiDungId) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để đổi quà' }, { status: 401 });
    }

    const { voucherId, title, cost } = await req.json();

    if (!voucherId || !title || !cost) {
      return NextResponse.json({ error: 'Thiếu thông tin quà tặng' }, { status: 400 });
    }

    // Lấy tổng điểm hiện tại của user để kiểm tra
    const currentPoints = await prisma.rewardHistory.aggregate({
      where: { nguoiDungId },
      _sum: { diemThuong: true },
    });

    const tongDiem = currentPoints._sum.diemThuong || 0;

    if (tongDiem < cost) {
      return NextResponse.json({ error: 'Số dư điểm không đủ' }, { status: 400 });
    }

    // Trừ điểm
    const reward = await prisma.rewardHistory.create({
      data: {
        nguoiDungId,
        loai: 'doi_qua',
        diemThuong: -Math.abs(parseInt(cost)),
        moTa: `Đổi voucher: ${title}`,
      },
    });

    return NextResponse.json({ success: true, reward, remainingPoints: tongDiem - cost });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
