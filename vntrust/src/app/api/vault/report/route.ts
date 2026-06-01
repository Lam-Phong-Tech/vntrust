// Phase 10: Report Vault — lưu nội dung báo cáo + ảnh đã mã hóa (tầng app)
// Liên kết với CanhBao qua reportRef token (mơ hồ — không direct FK)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { vaultEncrypt, vaultDecrypt } from '@/lib/vaultCrypto';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value || 'system';
  if (!role) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const body = await req.json();
  const { noiDung, hinhAnhUrls, identityRef } = body;
  if (!noiDung) return NextResponse.json({ error: 'missing_noiDung' }, { status: 400 });

  const reportRef = crypto.randomBytes(16).toString('hex');
  const created = await prisma.reportVault.create({
    data: {
      reportRef,
      noiDung:     vaultEncrypt(JSON.stringify(noiDung)) || '',
      hinhAnhUrls: vaultEncrypt(JSON.stringify(hinhAnhUrls || [])),
      identityRef: identityRef || null,
    },
  });

  await prisma.nhatKy.create({
    data: {
      action: `[REPORT_VAULT] Created reportRef=${reportRef.substring(0,12)}`,
      user: userName, role, ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      status: 'success',
    },
  }).catch(() => {});

  return NextResponse.json({ success: true, reportRef });
}

// GET /api/vault/report?reportRef=... (admin only + purpose)
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value || 'unknown';
  const purpose = req.headers.get('x-vault-purpose') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  if (role !== 'admin') return NextResponse.json({ error: 'admin_only' }, { status: 403 });
  if (!purpose || purpose.length < 10) {
    return NextResponse.json({ error: 'missing_purpose', message: 'Header x-vault-purpose ≥10 ký tự' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const reportRef = searchParams.get('reportRef');
  if (!reportRef) return NextResponse.json({ error: 'missing_reportRef' }, { status: 400 });

  const record = await prisma.reportVault.findUnique({ where: { reportRef } });
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.nhatKy.create({
    data: {
      action: `[REPORT_VAULT] GET reportRef=${reportRef.substring(0,12)} | purpose="${purpose.substring(0,80)}"`,
      user: userName, role: 'admin', ip,
      status: 'success',
    },
  }).catch(() => {});

  return NextResponse.json({
    reportRef,
    noiDung: JSON.parse(vaultDecrypt(record.noiDung) || '{}'),
    hinhAnhUrls: JSON.parse(vaultDecrypt(record.hinhAnhUrls) || '[]'),
    identityRef: record.identityRef,
    ngayTao: record.ngayTao,
  });
}
