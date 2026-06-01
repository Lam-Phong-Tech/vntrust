// D3 Sprint 6 — Tokenization Vault cho Address
// Tài liệu nghiệp vụ §III.4 row "Địa chỉ": "AES-256 hoặc Tokenization — Tokenization vault riêng"
//
// Cơ chế:
//   1. POST /api/vault/tokenization  { plaintext: "Số 10 Lý Thái Tổ..." }
//      → trả token TKN-xxxx, lưu plaintext encrypted trong NhatKy với action='TOKENIZATION_VAULT'
//   2. GET  /api/vault/tokenization?token=TKN-xxxx  (admin + court order)
//      → giải mã plaintext
//
// Khác với Identity Vault:
//   - Identity Vault: lưu PII của USER (email, phone, CCCD) → encrypted with AES
//   - Tokenization Vault: lưu THÔNG TIN ĐỊA CHỈ → thay bằng token, không cần decrypt thường xuyên
//   - Token KHÔNG có thông tin (chỉ là random), KHÔNG decrypt được nếu mất key
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { vaultEncrypt, vaultDecrypt } from '@/lib/vaultCrypto';
import crypto from 'crypto';

async function audit(action: string, userName: string, ip: string, ok = true) {
  await prisma.nhatKy.create({
    data: { action: `[TOKENIZATION_VAULT] ${action}`, user: userName, role: 'admin', ip, status: ok ? 'success' : 'error' }
  }).catch(() => {});
}

// POST: Tokenize plaintext → token
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value || 'system';
  if (!role) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const body = await req.json();
  const { plaintext, kind = 'address' } = body;
  if (!plaintext || typeof plaintext !== 'string') {
    return NextResponse.json({ error: 'missing_plaintext' }, { status: 400 });
  }
  if (plaintext.length > 500) {
    return NextResponse.json({ error: 'too_long (max 500 chars)' }, { status: 400 });
  }

  // Tạo random token
  const token = 'TKN-' + crypto.randomBytes(10).toString('hex').toUpperCase();
  const encrypted = vaultEncrypt(plaintext);
  if (!encrypted) {
    return NextResponse.json({ error: 'encryption_failed' }, { status: 500 });
  }

  // Lưu vào NhatKy (reuse generic store):
  //   action  = 'TOKENIZATION_VAULT_STORE'
  //   user    = token
  //   role    = kind (address/...)
  //   ip      = encrypted blob
  //   status  = 'active'
  await prisma.nhatKy.create({
    data: {
      action: 'TOKENIZATION_VAULT_STORE',
      user: token,
      role: kind,
      ip: encrypted,
      status: 'active',
    },
  });

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  await audit(`tokenize ${kind} → ${token}`, userName, ip);

  return NextResponse.json({
    ok: true,
    token,
    kind,
    note: 'plaintext encrypted in vault; only admin + court order can detokenize',
  });
}

// GET: Detokenize (admin only — simulate court order requirement)
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value || 'system';
  if (role !== 'admin') {
    return NextResponse.json({ error: 'admin_only_with_court_order' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  // Simulated "court order" header — production phải verify chữ ký số của cơ quan
  const courtOrderRef = searchParams.get('court_order') || req.headers.get('x-court-order-ref');
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  if (!courtOrderRef) {
    return NextResponse.json({
      error: 'court_order_required',
      hint: 'Provide ?court_order=<ref> or X-Court-Order-Ref header per §III.9',
    }, { status: 403 });
  }

  const record = await prisma.nhatKy.findFirst({
    where: { action: 'TOKENIZATION_VAULT_STORE', user: token, status: 'active' },
  });
  if (!record) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await audit(`DETOKENIZE_MISS ${token} (court_order=${courtOrderRef})`, userName, ip, false);
    return NextResponse.json({ error: 'token_not_found' }, { status: 404 });
  }

  const plaintext = vaultDecrypt(record.ip);
  if (!plaintext) {
    return NextResponse.json({ error: 'decryption_failed' }, { status: 500 });
  }

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  await audit(`DETOKENIZE ${token} kind=${record.role} (court_order=${courtOrderRef})`, userName, ip);

  return NextResponse.json({
    ok: true,
    token,
    kind: record.role,
    plaintext,
    courtOrderRef,
    storedAt: record.time,
  });
}

// DELETE: Revoke token (admin only)
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value || 'system';
  if (role !== 'admin') return NextResponse.json({ error: 'admin_only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });

  const deleted = await prisma.nhatKy.updateMany({
    where: { action: 'TOKENIZATION_VAULT_STORE', user: token, status: 'active' },
    data: { status: 'revoked' },
  });

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  await audit(`REVOKE ${token} (${deleted.count} records)`, userName, ip);

  return NextResponse.json({ ok: true, revoked: deleted.count });
}
