// UC15 Luồng thay thế A1: Tự động leo thang cảnh báo nếu không xử lý sau 48h
// Cron endpoint — gọi định kỳ (cron job hàng giờ hoặc daily).
// Bảo vệ bằng secret query param (giống /api/lifecycle-check).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STALE_HOURS = 48; // ngưỡng leo thang theo doc

const SEVERITY_LADDER: Record<string, string> = {
  low: 'medium',
  medium: 'high',
  high: 'high', // max — không tăng nữa
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== 'vntrust-cron-key') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

    // Tìm cảnh báo open + chưa xử lý 48h + chưa max-escalated
    const stale = await prisma.canhBao.findMany({
      where: {
        trangThai: 'open',
        thoiGian: { lt: cutoff },
        OR: [
          { escalateLevel: null },
          { escalateLevel: { lt: 3 } },
        ],
      },
      take: 200,
      orderBy: { thoiGian: 'asc' },
    });

    let escalated = 0;
    let skippedMax = 0;
    const now = new Date();

    for (const a of stale) {
      const newLevel = (a.escalateLevel || 0) + 1;
      const newMucDo = SEVERITY_LADDER[a.mucDo] || a.mucDo;

      // Nếu đã max severity và đã ≥3 lần escalate → skip
      if (newMucDo === a.mucDo && newLevel > 3) {
        skippedMax++;
        continue;
      }

      await prisma.canhBao.update({
        where: { id: a.id },
        data: {
          mucDo: newMucDo,
          escalateLevel: newLevel,
          escalatedAt: now,
          moTa: a.moTa + `\n\n[AUTO-ESCALATE L${newLevel}] Sau ${STALE_HOURS}h chưa xử lý → mức ${a.mucDo} → ${newMucDo} (${now.toLocaleString('vi-VN')})`,
        },
      });

      await prisma.nhatKy.create({
        data: {
          action: `Auto-escalate cảnh báo ${a.id.substring(0, 8)} từ ${a.mucDo} → ${newMucDo} (L${newLevel})`,
          user: 'Cron System', role: 'system', ip: '127.0.0.1',
          status: newMucDo === 'high' ? 'error' : 'warning',
        },
      });
      escalated++;
    }

    return NextResponse.json({
      success: true,
      checkedAt: now.toISOString(),
      staleFound: stale.length,
      escalated,
      skippedMax,
      cutoffHours: STALE_HOURS,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
