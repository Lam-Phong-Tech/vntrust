import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch notifications for a user/enterprise
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nguoiDungId = searchParams.get('nguoiDungId') || '';
    const doanhNghiepId = searchParams.get('doanhNghiepId') || '';
    const role = searchParams.get('role') || '';

    if (!nguoiDungId && !doanhNghiepId && !role) {
      return NextResponse.json({ notifications: [], unread: 0 });
    }

    // Build where clause based on recipient
    const where: any = {
      OR: [] as any[],
    };

    if (nguoiDungId) where.OR.push({ nguoiNhanId: nguoiDungId });
    if (doanhNghiepId) where.OR.push({ doanhNghiepId });
    if (role) where.OR.push({ roleTarget: role });
    // Always include broadcast notifications
    where.OR.push({ roleTarget: 'all' });

    const notifications = await prisma.thongBao.findMany({
      where,
      orderBy: { thoiGian: 'desc' },
      take: 50,
    });

    const unread = notifications.filter((n: any) => !n.daDoc).length;

    return NextResponse.json({ notifications, unread });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Create a notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tieuDe, noiDung, loai, nguoiNhanId, doanhNghiepId, roleTarget } = body;

    if (!tieuDe || !noiDung) {
      return NextResponse.json({ error: 'Thiếu tiêu đề hoặc nội dung' }, { status: 400 });
    }

    const notification = await prisma.thongBao.create({
      data: {
        tieuDe,
        noiDung,
        loai: loai || 'system',
        nguoiNhanId: nguoiNhanId || null,
        doanhNghiepId: doanhNghiepId || null,
        roleTarget: roleTarget || null,
        daDoc: false,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: Mark notification(s) as read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, markAllRead, nguoiDungId, doanhNghiepId, role } = body;

    if (id) {
      await prisma.thongBao.update({ where: { id }, data: { daDoc: true } });
    } else if (markAllRead) {
      const where: any = { OR: [] as any[], daDoc: false };
      if (nguoiDungId) where.OR.push({ nguoiNhanId: nguoiDungId });
      if (doanhNghiepId) where.OR.push({ doanhNghiepId });
      if (role) where.OR.push({ roleTarget: role });
      where.OR.push({ roleTarget: 'all' });
      await prisma.thongBao.updateMany({ where, data: { daDoc: true } });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
