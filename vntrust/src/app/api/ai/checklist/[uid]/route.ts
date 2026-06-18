// GET /api/ai/checklist/[uid]
// Lấy kết quả checklist đã lưu của một UID, nhóm theo tầng kiểm tra

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    if (!uid) return NextResponse.json({ error: 'Thiếu uid' }, { status: 400 });

    const items = await prisma.verificationChecklist.findMany({
      where: { uid },
      orderBy: [{ tangKiemTra: 'asc' }, { thoiGian: 'desc' }],
    });

    if (!items.length) {
      return NextResponse.json({
        uid, found: false,
        message: 'Chưa có checklist — gọi POST /api/ai/checklist/run để tạo mới',
      });
    }

    // Nhóm theo tầng
    const grouped: Record<string, typeof items> = {
      tang1_data:      items.filter(i => i.tangKiemTra === 'tang1_data'),
      tang2_logic:     items.filter(i => i.tangKiemTra === 'tang2_logic'),
      tang3_ai_vision: items.filter(i => i.tangKiemTra === 'tang3_ai_vision'),
    };

    const tongDiem = Math.min(items.reduce((s, i) => s + i.diemRuiRo, 0), 100);
    const mucDo = tongDiem >= 81 ? 'confirmed_fake' : tongDiem >= 61 ? 'high' : tongDiem >= 41 ? 'medium' : tongDiem >= 21 ? 'monitor' : 'low';
    const lastRun  = items[0]?.thoiGian;

    // Tóm tắt màu sắc
    const summary = {
      green:  items.filter(i => i.mauHienThi === 'green').length,
      yellow: items.filter(i => i.mauHienThi === 'yellow').length,
      orange: items.filter(i => i.mauHienThi === 'orange').length,
      red:    items.filter(i => i.mauHienThi === 'red').length,
      black:  items.filter(i => i.mauHienThi === 'black').length,
      blue:   items.filter(i => i.mauHienThi === 'blue').length,
    };

    return NextResponse.json({ uid, tongDiem, mucDo, lastRun, summary, grouped, totalItems: items.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
