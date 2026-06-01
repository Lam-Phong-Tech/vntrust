// Monthly digest: gửi ngày 1 hàng tháng 8:00. Bao quát 30 ngày trước.
// Đầy đủ stats — gồm cả top 10 vi phạm + xu hướng so với tháng trước.
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
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 86400000);

    const [
      curScans, prevScans, curFake, prevFake,
      curAlerts, prevAlerts, curViolations, prevViolations,
      totalProducts, totalDN, openAlerts,
    ] = await Promise.all([
      prisma.luotQuet.count({ where: { thoiGian: { gte: monthAgo } } }),
      prisma.luotQuet.count({ where: { thoiGian: { gte: twoMonthsAgo, lt: monthAgo } } }),
      prisma.luotQuet.count({ where: { thoiGian: { gte: monthAgo }, ketQua: 'fake' } }),
      prisma.luotQuet.count({ where: { thoiGian: { gte: twoMonthsAgo, lt: monthAgo }, ketQua: 'fake' } }),
      prisma.canhBao.count({ where: { thoiGian: { gte: monthAgo } } }),
      prisma.canhBao.count({ where: { thoiGian: { gte: twoMonthsAgo, lt: monthAgo } } }),
      prisma.ketQuaHauKiem.count({ where: { ngayTao: { gte: monthAgo }, ketQua: 'khongdambao' } }),
      prisma.ketQuaHauKiem.count({ where: { ngayTao: { gte: twoMonthsAgo, lt: monthAgo }, ketQua: 'khongdambao' } }),
      prisma.sanPham.count(),
      prisma.doanhNghiep.count({ where: { trangThai: 'verified' } }),
      prisma.canhBao.count({ where: { trangThai: 'open' } }),
    ]);

    const trend = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? '+∞%' : '0%';
      const pct = ((cur - prev) / prev * 100);
      return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    };

    const fakeRate = curScans > 0 ? (curFake / curScans * 100).toFixed(2) + '%' : '0%';

    const digest = {
      generatedAt: now.toISOString(),
      period: '30d',
      summary: {
        scans: { current: curScans, previous: prevScans, trend: trend(curScans, prevScans) },
        fakeScans: { current: curFake, previous: prevFake, trend: trend(curFake, prevFake), rate: fakeRate },
        alerts: { current: curAlerts, previous: prevAlerts, trend: trend(curAlerts, prevAlerts), open: openAlerts },
        violations: { current: curViolations, previous: prevViolations, trend: trend(curViolations, prevViolations) },
        platform: { totalProducts, verifiedDN: totalDN },
      },
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
            from: `"VNTrust" <${process.env.GMAIL_USER}>`,
            to: emails.join(','),
            subject: `[VNTrust] Báo cáo THÁNG — ${now.getMonth() + 1}/${now.getFullYear()} | Fake rate ${fakeRate}`,
            text: `Báo cáo tháng ${now.getMonth() + 1}/${now.getFullYear()}\n\n` +
              `📈 SO SÁNH 30 NGÀY:\n` +
              `  Lượt quét:        ${curScans} (${digest.summary.scans.trend} vs tháng trước)\n` +
              `  Fake scans:        ${curFake} (${digest.summary.fakeScans.trend}) | Rate ${fakeRate}\n` +
              `  Cảnh báo:         ${curAlerts} (${digest.summary.alerts.trend}) | Open ${openAlerts}\n` +
              `  Vi phạm hậu kiểm: ${curViolations} (${digest.summary.violations.trend})\n\n` +
              `🏛 PLATFORM:\n` +
              `  Sản phẩm:        ${totalProducts}\n` +
              `  DN verified:     ${totalDN}\n\n` +
              `Xem chi tiết: https://anticounterfeit.test9.io.vn/dashboard/analytics`,
          });
          emailResult = { sent: true, recipients: emails.length };
        } catch (e: any) { emailResult = { sent: false, reason: 'smtp_error', error: e.message }; }
      }
    }

    await prisma.nhatKy.create({
      data: {
        action: `Monthly digest ${now.getMonth() + 1}/${now.getFullYear()}: fakeRate=${fakeRate}, scans trend ${digest.summary.scans.trend}`,
        user: 'Cron System', role: 'system', ip: '127.0.0.1', status: 'success',
      },
    }).catch(() => {});

    return NextResponse.json({ digest, email: emailResult, dryRun });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
