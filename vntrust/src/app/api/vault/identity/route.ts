// Phase 10: Identity Vault API gateway
// Admin-only. Mọi truy cập đều ghi NhatKy audit.
// Theo doc §III.3-4: dữ liệu định danh tách biệt khỏi report; cần "lệnh đặc biệt" để giải mã.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { vaultEncrypt, vaultDecrypt, vaultHash, userIdentityHash } from '@/lib/vaultCrypto';

async function audit(action: string, userName: string, ip: string, ok = true) {
  await prisma.nhatKy.create({
    data: { action: `[IDENTITY_VAULT] ${action}`, user: userName, role: 'admin', ip, status: ok ? 'success' : 'error' }
  }).catch(() => {});
}

// POST /api/vault/identity — Insert identity (encrypted)
// Body: { userId, email?, phone?, cccd? }
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value || 'unknown';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  if (role !== 'admin') {
    await audit('POST denied — not admin', userName, ip, false);
    return NextResponse.json({ error: 'admin_only' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, email, phone, cccd } = body;
  if (!userId) return NextResponse.json({ error: 'missing_userId' }, { status: 400 });

  const userHash = userIdentityHash(userId);
  const existing = await prisma.identityVault.findUnique({ where: { userHash } });
  if (existing) {
    await audit(`POST userId=${userId.substring(0,8)} (already_exists)`, userName, ip);
    return NextResponse.json({ error: 'already_exists', userHash }, { status: 409 });
  }

  const record = await prisma.identityVault.create({
    data: {
      userHash,
      emailEncrypted: vaultEncrypt(email),
      phoneEncrypted: vaultEncrypt(phone),
      cccdEncrypted:  vaultEncrypt(cccd),
      cccdHash:       vaultHash(cccd),
      nguoiDungId:    userId,
    },
  });
  await audit(`POST userId=${userId.substring(0,8)} created`, userName, ip);
  return NextResponse.json({ success: true, id: record.id, userHash });
}

// GET /api/vault/identity?userHash=... — Read decrypted (REQUIRES special audit context)
// Body header: x-vault-purpose: <Lý do truy cập>
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value || 'unknown';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const purpose = req.headers.get('x-vault-purpose') || '';

  if (role !== 'admin') {
    await audit('GET denied — not admin', userName, ip, false);
    return NextResponse.json({ error: 'admin_only' }, { status: 403 });
  }
  if (!purpose || purpose.length < 10) {
    await audit('GET denied — missing purpose', userName, ip, false);
    return NextResponse.json({
      error: 'missing_purpose',
      message: 'Header x-vault-purpose bắt buộc — mô tả lý do truy cập tối thiểu 10 ký tự (audit).',
    }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const userHash = searchParams.get('userHash');
  const cccdHash = searchParams.get('cccdHash');
  if (!userHash && !cccdHash) return NextResponse.json({ error: 'missing_userHash_or_cccdHash' }, { status: 400 });

  const record = userHash
    ? await prisma.identityVault.findUnique({ where: { userHash } })
    : await prisma.identityVault.findFirst({ where: { cccdHash: cccdHash! } });
  if (!record) {
    await audit(`GET userHash=${userHash?.substring(0,12)} not_found`, userName, ip);
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await audit(`GET userHash=${record.userHash.substring(0,12)} | purpose="${purpose.substring(0,80)}"`, userName, ip);

  return NextResponse.json({
    userHash: record.userHash,
    email: vaultDecrypt(record.emailEncrypted),
    phone: vaultDecrypt(record.phoneEncrypted),
    cccd:  vaultDecrypt(record.cccdEncrypted),
    cccdHash: record.cccdHash,
    ngayTao: record.ngayTao,
    ngayCapNhat: record.ngayCapNhat,
    purposeLog: purpose,
  });
}
