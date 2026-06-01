// B1 Sprint 3 — Cron auto-purge Anonymous Session Store
// Tuân thủ Luật BVDLCN 2025 §III.3: "Anonymous Session Store: tự động xóa sau 30 ngày"
// Endpoint: GET /api/cron/purge-sessions?secret=vntrust-cron-key
// Crontab nên chạy mỗi ngày 1 lần (vd: 03:00 sáng)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CRON_SECRET = process.env.CRON_SECRET || 'vntrust-cron-key';
const RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    // 1. Xoá OTP_STORE entries cũ (>30d) — Anonymous session
    const deletedOtp = await prisma.nhatKy.deleteMany({
      where: {
        action: 'OTP_STORE',
        time: { lt: cutoff },
      },
    });

    // 2. Xoá NhatKy generic audit log của hệ thống (giữ user actions > 30d làm pháp lý)
    //    Chỉ xoá log từ 'System' (heartbeat, health check) để tránh phình DB
    const deletedSystem = await prisma.nhatKy.deleteMany({
      where: {
        user: { in: ['System', 'System Bot', 'background-worker'] },
        time: { lt: cutoff },
      },
    });

    // 3. Đếm số CanhBao closed > 90 ngày để admin review (không xoá tự động)
    const oldClosedAlerts = await prisma.canhBao.count({
      where: {
        trangThai: 'closed',
        thoiGian: { lt: new Date(Date.now() - 90 * 24 * 3600_000) },
      },
    });

    // Audit log
    await prisma.nhatKy.create({
      data: {
        action: `[CRON] purge-sessions: deleted ${deletedOtp.count} OTP + ${deletedSystem.count} system logs (>${RETENTION_DAYS}d)`,
        user: 'System',
        role: 'system',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: 'success',
      },
    });

    return NextResponse.json({
      ok: true,
      deletedOtp: deletedOtp.count,
      deletedSystemLogs: deletedSystem.count,
      oldClosedAlerts,
      cutoffDate: cutoff.toISOString(),
      retentionDays: RETENTION_DAYS,
      ranAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
