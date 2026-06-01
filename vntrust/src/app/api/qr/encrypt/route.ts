// POST /api/qr/encrypt — Generate AES-256 encrypted token cho 1 UID (admin/manufacturer)
// GET /api/qr/decrypt?token=... — Reverse (admin only, audit)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { encryptUidForQR, decryptQRToken } from '@/lib/aesQR';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    if (role !== 'admin' && role !== 'manufacturer' && role !== 'importer') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const { uids } = body; // array of UIDs
    if (!Array.isArray(uids) || uids.length === 0) {
      return NextResponse.json({ error: 'missing uids array' }, { status: 400 });
    }

    const results: Array<{ uid: string; token: string }> = [];
    for (const uid of uids) {
      if (typeof uid !== 'string') continue;
      // Generate token + persist nếu UID hợp lệ trong DB
      const token = encryptUidForQR(uid);
      const existing = await prisma.maDinhDanh.findUnique({ where: { uid } });
      if (existing) {
        // Idempotent: chỉ update nếu chưa có
        if (!existing.encryptedToken) {
          await prisma.maDinhDanh.update({ where: { uid }, data: { encryptedToken: token } });
        }
        results.push({ uid, token: existing.encryptedToken || token });
      } else {
        results.push({ uid, token });
      }
    }
    return NextResponse.json({ results, count: results.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
