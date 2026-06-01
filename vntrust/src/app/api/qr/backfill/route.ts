// POST /api/qr/backfill — Backfill encryptedToken cho MaDinhDanh records cũ
// One-time admin operation. Idempotent — chỉ update record nào encryptedToken IS NULL.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { encryptUidForQR } from '@/lib/aesQR';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  if (role !== 'admin') return NextResponse.json({ error: 'admin_only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '500', 10);
  const dryRun = searchParams.get('dryRun') === '1';

  // Tìm records chưa có encryptedToken
  const records = await prisma.maDinhDanh.findMany({
    where: { encryptedToken: null },
    select: { uid: true },
    take: Math.min(limit, 2000),
  });

  const total = await prisma.maDinhDanh.count({ where: { encryptedToken: null } });

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      totalMissing: total,
      willProcessThisCall: records.length,
      sampleFirst3: records.slice(0, 3).map(r => ({ uid: r.uid, token: encryptUidForQR(r.uid) })),
    });
  }

  let updated = 0;
  let errors = 0;
  for (const rec of records) {
    try {
      const token = encryptUidForQR(rec.uid);
      await prisma.maDinhDanh.update({
        where: { uid: rec.uid },
        data: { encryptedToken: token },
      });
      updated++;
    } catch (e) {
      errors++;
    }
  }

  const remaining = await prisma.maDinhDanh.count({ where: { encryptedToken: null } });

  // Audit
  await prisma.nhatKy.create({
    data: {
      action: `[QR_BACKFILL] Updated ${updated}/${records.length} (errors=${errors}). Remaining: ${remaining}`,
      user: cookieStore.get('userName')?.value || 'admin', role: 'admin',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      status: errors > 0 ? 'warning' : 'success',
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    processed: records.length,
    updated,
    errors,
    totalRemaining: remaining,
    message: remaining === 0
      ? '🎉 Toàn bộ UID đã có encryptedToken.'
      : `Còn ${remaining} UID chưa backfill. Gọi lại endpoint này để tiếp tục.`,
  });
}

export async function GET(req: NextRequest) {
  // Just status
  const total = await prisma.maDinhDanh.count();
  const withToken = await prisma.maDinhDanh.count({ where: { encryptedToken: { not: null } } });
  const withoutToken = total - withToken;
  return NextResponse.json({
    totalUID: total,
    withEncryptedToken: withToken,
    withoutEncryptedToken: withoutToken,
    progress: total > 0 ? `${((withToken / total) * 100).toFixed(1)}%` : 'N/A',
  });
}
