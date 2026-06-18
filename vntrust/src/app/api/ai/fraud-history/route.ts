// GET /api/ai/fraud-history & POST /api/ai/fraud-history
// Lịch sử gian lận đã xác nhận + ghi nhận training label

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    
    if (role !== 'admin' && role !== 'investigator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      prisma.fraudHistory.count(),
      prisma.fraudHistory.findMany({
        orderBy: { ngayXacNhan: 'desc' },
        skip,
        take: limit,
      })
    ]);

    const sanPhamIds = [...new Set(records.map(r => r.sanPhamId).filter(Boolean))] as string[];
    const sps = await prisma.sanPham.findMany({
      where: { id: { in: sanPhamIds } },
      select: { id: true, ten: true }
    });
    const spMap = Object.fromEntries(sps.map(s => [s.id, s.ten]));
    
    const mappedRecords = records.map(r => ({
      ...r,
      sanPham: r.sanPhamId ? { ten: spMap[r.sanPhamId] } : null
    }));

    return NextResponse.json({
      records: mappedRecords,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    const userName = cookieStore.get('userName')?.value;

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { uid, sanPhamId, loaiGianLan, diemRuiRo, ghiChu, trainingLabel } = body;

    if (!loaiGianLan) return NextResponse.json({ error: 'Thiếu loaiGianLan' }, { status: 400 });

    const record = await prisma.fraudHistory.create({
      data: {
        uid,
        sanPhamId,
        loaiGianLan,
        nguonPhatHien: 'nhan_cong',
        diemRuiRo: diemRuiRo || 0,
        xacNhanBoi: userName,
        ghiChu,
        trainingLabel
      }
    });

    return NextResponse.json({ success: true, record });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
