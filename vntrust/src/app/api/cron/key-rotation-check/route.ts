// B2 Sprint 3 — Cron AES key rotation check
// Luật BVDLCN 2025 §III.4: "Key được xoay vòng mỗi 90 ngày"
// Endpoint: GET /api/cron/key-rotation-check?secret=vntrust-cron-key
// Crontab nên chạy 1 lần/tuần (vd: Mon 04:00)
//
// Logic: KHÔNG tự động rotate (vì cần re-encrypt toàn bộ data — operation nguy hiểm).
// Thay vào đó: tạo CanhBao mức HIGH yêu cầu admin thực hiện manual rotation procedure.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VAULT_KEY_VERSION, VAULT_KEY_CREATED_AT, VAULT_KEY_ROTATION_DAYS } from '@/lib/vaultCrypto';

const CRON_SECRET = process.env.CRON_SECRET || 'vntrust-cron-key';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const created = new Date(VAULT_KEY_CREATED_AT);
    const now = new Date();
    const ageDays = Math.floor((now.getTime() - created.getTime()) / (24 * 3600 * 1000));
    const overdueDays = ageDays - VAULT_KEY_ROTATION_DAYS;

    // Đã tới hạn xoay key
    const needsRotation = ageDays >= VAULT_KEY_ROTATION_DAYS;

    // Kiểm tra xem có alert pending chưa (tránh spam mỗi lần cron chạy)
    const existing = await prisma.canhBao.findFirst({
      where: {
        loai: 'KEY_ROTATION_DUE',
        trangThai: { in: ['open', 'reviewing'] },
      },
    });

    let alertCreated = false;
    if (needsRotation && !existing) {
      await prisma.canhBao.create({
        data: {
          loai: 'KEY_ROTATION_DUE',
          mucDo: overdueDays > 30 ? 'high' : 'medium',
          moTa: JSON.stringify({
            lyDo: `AES vault key (v${VAULT_KEY_VERSION}) đã quá hạn xoay vòng ${overdueDays} ngày. Theo Luật BVDLCN 2025 §III.4, cần thực hiện manual rotation procedure.`,
            keyVersion: VAULT_KEY_VERSION,
            keyCreatedAt: VAULT_KEY_CREATED_AT,
            ageDays,
            rotationDueDays: VAULT_KEY_ROTATION_DAYS,
            overdueDays,
            procedure: [
              '1. Generate new VAULT_AES_KEY (64 hex chars) qua openssl: openssl rand -hex 32',
              '2. Set env vars: VAULT_AES_KEY=<new>, VAULT_KEY_VERSION=<n+1>, VAULT_KEY_CREATED_AT=<now ISO>',
              '3. Run migration script re-encrypt toàn bộ Identity Vault + Report Vault với key mới',
              '4. Đóng cảnh báo này sau khi hoàn thành',
            ],
          }),
          trangThai: 'open',
        },
      });
      alertCreated = true;
    }

    await prisma.nhatKy.create({
      data: {
        action: `[CRON] key-rotation-check: keyV${VAULT_KEY_VERSION}, age=${ageDays}d, due=${needsRotation}, alertCreated=${alertCreated}`,
        user: 'System',
        role: 'system',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: needsRotation ? 'warning' : 'success',
      },
    });

    return NextResponse.json({
      ok: true,
      keyVersion: VAULT_KEY_VERSION,
      keyCreatedAt: VAULT_KEY_CREATED_AT,
      ageDays,
      rotationDueDays: VAULT_KEY_ROTATION_DAYS,
      needsRotation,
      overdueDays: Math.max(0, overdueDays),
      alertCreated,
      existingAlertId: existing?.id,
      ranAt: now.toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
