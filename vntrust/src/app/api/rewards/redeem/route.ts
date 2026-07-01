import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const DAILY_REDEEM_LIMIT = 3;
const VOUCHERS: Record<number, { title: string; cost: number }> = {
  1: { title: 'Voucher Highlands 30K', cost: 100 },
  2: { title: 'GrabCar Giảm 50%', cost: 200 },
  3: { title: 'Thẻ cào Viettel 50K', cost: 300 },
};

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const nguoiDungId = cookieStore.get('userId')?.value;

    if (!nguoiDungId) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để đổi quà' }, { status: 401 });
    }

    const { voucherId } = await req.json();
    const voucher = VOUCHERS[Number(voucherId)];

    if (!voucher) {
      return NextResponse.json({ error: 'Thiếu thông tin quà tặng' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [redeemTodayCount, sameVoucherToday] = await Promise.all([
      prisma.rewardHistory.count({
        where: {
          nguoiDungId,
          loai: 'doi_qua',
          thoiGian: { gte: today },
        },
      }),
      prisma.rewardHistory.findFirst({
        where: {
          nguoiDungId,
          loai: 'doi_qua',
          moTa: `Đổi voucher: ${voucher.title}`,
          thoiGian: { gte: today },
        },
      }),
    ]);

    if (redeemTodayCount >= DAILY_REDEEM_LIMIT) {
      return NextResponse.json({ error: `Bạn chỉ được đổi tối đa ${DAILY_REDEEM_LIMIT} quà mỗi ngày` }, { status: 429 });
    }

    if (sameVoucherToday) {
      return NextResponse.json({ error: 'Bạn đã đổi voucher này hôm nay. Vui lòng quay lại ngày mai.' }, { status: 429 });
    }

    // Lấy tổng điểm hiện tại của user để kiểm tra
    const currentPoints = await prisma.rewardHistory.aggregate({
      where: { nguoiDungId },
      _sum: { diemThuong: true },
    });

    const tongDiem = currentPoints._sum.diemThuong || 0;

    if (tongDiem < voucher.cost) {
      return NextResponse.json({ error: 'Số dư điểm không đủ' }, { status: 400 });
    }

    // Trừ điểm
    const reward = await prisma.rewardHistory.create({
      data: {
        nguoiDungId,
        loai: 'doi_qua',
        diemThuong: -voucher.cost,
        moTa: `Đổi voucher: ${voucher.title}`,
      },
    });

    return NextResponse.json({ success: true, reward, remainingPoints: tongDiem - voucher.cost });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
