// POST /api/ai/behavioral-analytics
// Phân tích clickstream + hành vi thiết bị để phát hiện tài khoản spam
// Input: deviceId, sessionRef, clickstream JSON, ip
// Output: spamScore, flags, verdict

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip  = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json();
    const { deviceId, sessionRef, clickstream, uid } = body;

    const flags: string[] = [];
    let spamScore = 0;

    const now    = new Date();
    const hour1  = new Date(now.getTime() - 3_600_000);
    const hour24 = new Date(now.getTime() - 86_400_000);

    // ── 1. Flood detection: số lượt quét trong 1 giờ từ cùng IP ──────────
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    const recentScans = await prisma.luotQuet.count({
      where: { diaChi_IP: { contains: ip.split('.').slice(0,3).join('.') }, thoiGian: { gte: hour1 } },
    });
    if (recentScans > 20) { flags.push(`Flood: ${recentScans} lượt quét/giờ từ IP`); spamScore += 50; }
    else if (recentScans > 10) { flags.push(`Cao: ${recentScans} lượt quét/giờ`); spamScore += 25; }

    // ── 2. Device fingerprint: cùng deviceId gửi nhiều báo cáo ───────────
    if (deviceId) {
      const deviceReports = await prisma.luotQuet.count({
        where: { deviceId, thoiGian: { gte: hour24 } },
      });
      if (deviceReports > 50) { flags.push(`Device spam: ${deviceReports} quét/24h`); spamScore += 40; }
      else if (deviceReports > 20) { flags.push(`Device cao: ${deviceReports} quét/24h`); spamScore += 20; }
    }

    // ── 3. Clickstream analysis: thời gian điền form quá nhanh ───────────
    if (clickstream) {
      let cs: any[] = [];
      try { cs = typeof clickstream === 'string' ? JSON.parse(clickstream) : clickstream; } catch {}

      if (cs.length > 0) {
        const durations = cs.map((e: any) => e.duration || 0).filter((d: number) => d > 0);
        const avgDuration = durations.length ? durations.reduce((a: number, b: number) => a+b, 0) / durations.length : 0;

        // Bot thường điền form < 2 giây
        if (avgDuration > 0 && avgDuration < 2000) {
          flags.push(`Bot suspect: thời gian trung bình ${avgDuration.toFixed(0)}ms/bước (< 2s)`);
          spamScore += 35;
        }
        // Copy-paste: tất cả input giống nhau
        const inputs = cs.filter((e: any) => e.type === 'input').map((e: any) => e.value);
        const uniqueInputs = new Set(inputs).size;
        if (inputs.length > 3 && uniqueInputs === 1) {
          flags.push('Bot suspect: tất cả inputs giống nhau (copy-paste)');
          spamScore += 30;
        }
      }
    }

    // ── 4. Cùng UID bị báo cáo nhiều lần trong 1h ────────────────────────
    if (uid) {
      const uidReports = await prisma.canhBao.count({
        where: { uid, thoiGian: { gte: hour1 } },
      });
      if (uidReports > 5) { flags.push(`Coordinated: ${uidReports} báo cáo cùng UID/giờ`); spamScore += 30; }
    }

    // ── 5. Anonymous session mới tạo ngay lập tức báo cáo ────────────────
    if (sessionRef) {
      const session = await prisma.anonymousSession.findUnique({ where: { sessionToken: sessionRef } });
      if (session) {
        const sessionAgeMs = now.getTime() - session.ngayTao.getTime();
        if (sessionAgeMs < 30_000) { // Session < 30 giây
          flags.push('Session mới tạo < 30s — đáng ngờ');
          spamScore += 25;
        }
      }
    }

    spamScore = Math.min(spamScore, 100);
    const verdict = spamScore >= 70 ? 'SPAM' : spamScore >= 40 ? 'SUSPECT' : 'NORMAL';

    // Ghi log nếu phát hiện spam
    if (verdict !== 'NORMAL') {
      await prisma.nhatKy.create({
        data: {
          action: `Behavioral Analytics: ${verdict} | Score: ${spamScore} | ${flags.join(', ')}`,
          user: `IP[${ip.substring(0,8)}] Device[${(deviceId||'?').slice(0,8)}]`,
          role: 'consumer',
          ip,
          status: verdict === 'SPAM' ? 'error' : 'warning',
        }
      });
    }

    return NextResponse.json({ spamScore, verdict, flags, ipHash });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
