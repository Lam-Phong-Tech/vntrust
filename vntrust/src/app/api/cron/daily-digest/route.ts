// Cron endpoint: tổng hợp digest hàng ngày cho admin
// Theo doc §V — gửi báo cáo cảnh báo hàng ngày 08:00.
// Trả JSON summary luôn; nếu config notification.email_enabled=true → gửi email.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

async function getConfig(key: string, defaultValue: string): Promise<string> {
  const c = await prisma.cauHinhHeThong.findUnique({ where: { key } });
  return c?.value || defaultValue;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== 'vntrust-cron-key') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const dryRun = searchParams.get('dryRun') === '1';

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Aggregate counts
    const [
      openAlertsHigh,
      openAlertsMedium,
      openAlertsLow,
      escalatedToday,
      fakeScans24h,
      suspectScans24h,
      newViolations24h,
      newReports24h,
      escalated7d,
    ] = await Promise.all([
      prisma.canhBao.count({ where: { trangThai: 'open', mucDo: 'high' } }),
      prisma.canhBao.count({ where: { trangThai: 'open', mucDo: 'medium' } }),
      prisma.canhBao.count({ where: { trangThai: 'open', mucDo: 'low' } }),
      prisma.canhBao.count({ where: { escalatedAt: { gte: dayAgo } } }),
      prisma.luotQuet.count({ where: { thoiGian: { gte: dayAgo }, ketQua: 'fake' } }),
      prisma.luotQuet.count({ where: { thoiGian: { gte: dayAgo }, ketQua: 'suspect' } }),
      prisma.ketQuaHauKiem.count({ where: { ngayTao: { gte: dayAgo }, ketQua: 'khongdambao' } }),
      prisma.canhBao.count({ where: { thoiGian: { gte: dayAgo }, loai: { startsWith: 'NGUOI_DUNG_BAO_CAO' } } }),
      prisma.canhBao.count({ where: { escalatedAt: { gte: weekAgo } } }),
    ]);

    const topAlerts = await prisma.canhBao.findMany({
      where: { trangThai: 'open', mucDo: 'high' },
      orderBy: [{ escalatedAt: 'desc' }, { thoiGian: 'desc' }],
      take: 5,
    });

    const digest = {
      generatedAt: now.toISOString(),
      period: '24h',
      summary: {
        openAlerts:        { high: openAlertsHigh, medium: openAlertsMedium, low: openAlertsLow, total: openAlertsHigh + openAlertsMedium + openAlertsLow },
        escalated24h:      escalatedToday,
        escalated7d,
        fakeScans24h,
        suspectScans24h,
        newViolations24h,
        newConsumerReports24h: newReports24h,
      },
      topHighAlerts: topAlerts.map(a => ({
        id: a.id.substring(0, 8),
        loai: a.loai,
        moTa: a.moTa.substring(0, 200),
        thoiGian: a.thoiGian,
        escalateLevel: a.escalateLevel,
      })),
    };

    // Gửi email nếu enabled
    const emailEnabled = await getConfig('email_enabled', 'false');
    let emailResult: any = { sent: false, reason: 'email_disabled_in_config' };

    if (emailEnabled === 'true' && !dryRun) {
      const adminUsers = await prisma.nguoiDung.findMany({
        where: { vaiTro: 'admin' },
        select: { email: true, ten: true },
      });
      const adminEmails = adminUsers.filter(u => u.email).map(u => u.email);

      if (adminEmails.length === 0) {
        emailResult = { sent: false, reason: 'no_admin_emails' };
      } else if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        emailResult = { sent: false, reason: 'gmail_env_missing' };
      } else {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
          });
          const subject = `[VNTrust] Digest 24h — ${digest.summary.openAlerts.high} cảnh báo Cao, ${digest.summary.escalated24h} escalate`;
          const text = `Báo cáo VNTrust hàng ngày — ${now.toLocaleString('vi-VN')}\n\n` +
            `🔴 Cảnh báo CAO: ${digest.summary.openAlerts.high}\n` +
            `🟠 Cảnh báo Trung: ${digest.summary.openAlerts.medium}\n` +
            `🟡 Cảnh báo Thấp: ${digest.summary.openAlerts.low}\n` +
            `↑ Auto-escalate 24h: ${digest.summary.escalated24h}\n\n` +
            `Quét 24h: ${digest.summary.fakeScans24h} FAKE, ${digest.summary.suspectScans24h} SUSPECT\n` +
            `Hậu kiểm 24h: ${digest.summary.newViolations24h} vi phạm mới\n` +
            `Báo cáo NTD 24h: ${digest.summary.newConsumerReports24h}\n\n` +
            `Top 5 cảnh báo Cao:\n` + topAlerts.map(a => `  • [${a.id.substring(0, 8)}] ${a.moTa.substring(0, 120)}`).join('\n') +
            `\n\nDashboard: https://anticounterfeit.test9.io.vn/dashboard/alerts\n`;

          await transporter.sendMail({
            from: `"VNTrust System" <${process.env.GMAIL_USER}>`,
            to: adminEmails.join(','),
            subject, text,
          });
          emailResult = { sent: true, recipients: adminEmails.length };
        } catch (e: any) {
          emailResult = { sent: false, reason: 'smtp_error', error: e.message };
        }
      }
    }

    // Log to NhatKy
    await prisma.nhatKy.create({
      data: {
        action: `Daily digest: ${digest.summary.openAlerts.high} high alerts, ${digest.summary.escalated24h} escalated. Email: ${emailResult.sent ? 'sent' : emailResult.reason}`,
        user: 'Cron System', role: 'system', ip: '127.0.0.1',
        status: digest.summary.openAlerts.high > 5 ? 'error' : 'success',
      },
    });

    return NextResponse.json({ digest, email: emailResult, dryRun });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
