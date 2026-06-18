// Weekly digest: gửi Thứ Hai 8:00. Bao quát 7 ngày trước.
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
    if (searchParams.get('secret') !== 'vntrust-cron-key') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const dryRun = searchParams.get('dryRun') === '1';

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      newAlerts, resolved, escalated, fakeScans, suspectScans, violations, reports,
      topProducts
    ] = await Promise.all([
      prisma.canhBao.count({ where: { thoiGian: { gte: weekAgo } } }),
      prisma.canhBao.count({ where: { trangThai: 'closed', thoiGian: { gte: weekAgo } } }),
      prisma.canhBao.count({ where: { escalatedAt: { gte: weekAgo } } }),
      prisma.luotQuet.count({ where: { thoiGian: { gte: weekAgo }, ketQua: 'fake' } }),
      prisma.luotQuet.count({ where: { thoiGian: { gte: weekAgo }, ketQua: 'suspect' } }),
      prisma.ketQuaHauKiem.count({ where: { ngayTao: { gte: weekAgo }, ketQua: 'khongdambao' } }),
      prisma.canhBao.count({ where: { thoiGian: { gte: weekAgo }, loai: { startsWith: 'NGUOI_DUNG_BAO_CAO' } } }),
      prisma.canhBao.groupBy({
        by: ['uid'],
        where: { thoiGian: { gte: weekAgo }, uid: { not: null } },
        _count: { uid: true },
        orderBy: { _count: { uid: 'desc' } },
        take: 5,
      }),
    ]);

    const digest = {
      generatedAt: now.toISOString(),
      period: '7d',
      summary: {
        newAlerts, resolvedAlerts: resolved, escalatedAlerts: escalated,
        fakeScans, suspectScans, violations, consumerReports: reports,
      },
      topReportedUIDs: topProducts.map(p => ({ uid: p.uid, count: p._count.uid })),
    };

    const emailEnabled = await getConfig('email_enabled', 'false');
    let emailResult: any = { sent: false, reason: 'email_disabled' };

    if (emailEnabled === 'true' && !dryRun && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const admins = await prisma.nguoiDung.findMany({ where: { vaiTro: 'admin' }, select: { email: true } });
      const emails = admins.map(a => a.email).filter(Boolean);
      if (emails.length > 0) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
          });
          await transporter.sendMail({
            from: `"AI VeriGoods" <${process.env.GMAIL_USER}>`,
            to: emails.join(','),
            subject: `[AI VeriGoods] Báo cáo TUẦN — ${newAlerts} cảnh báo mới, ${resolved} đã xử lý`,
            text: `Báo cáo tuần — ${now.toLocaleDateString('vi-VN')}\n\n` +
              `Cảnh báo mới: ${newAlerts}\n` +
              `Đã xử lý: ${resolved}\n` +
              `Auto-escalate: ${escalated}\n` +
              `Fake scans: ${fakeScans}\n` +
              `Suspect scans: ${suspectScans}\n` +
              `Vi phạm hậu kiểm: ${violations}\n` +
              `Báo cáo NTD: ${reports}\n\n` +
              `Top UIDs bị báo cáo:\n` + digest.topReportedUIDs.map(p => `  ${p.uid?.substring(0, 12)}: ${p.count} lần`).join('\n'),
          });
          emailResult = { sent: true, recipients: emails.length };
        } catch (e: any) { emailResult = { sent: false, reason: 'smtp_error', error: e.message }; }
      }
    }

    await prisma.nhatKy.create({
      data: {
        action: `Weekly digest: ${newAlerts} mới / ${resolved} xử lý / ${escalated} escalate. Email: ${emailResult.sent ? 'sent' : emailResult.reason}`,
        user: 'Cron System', role: 'system', ip: '127.0.0.1', status: 'success',
      },
    }).catch(() => {});

    return NextResponse.json({ digest, email: emailResult, dryRun });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
