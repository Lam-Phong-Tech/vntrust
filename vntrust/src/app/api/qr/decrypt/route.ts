import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptQRToken, looksLikeEncryptedToken } from '@/lib/aesQR';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  if (role !== 'admin') return NextResponse.json({ error: 'admin_only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });

  const uid = decryptQRToken(token);
  if (!uid) return NextResponse.json({ error: 'invalid_or_corrupted_token', isEncryptedFormat: looksLikeEncryptedToken(token) }, { status: 400 });

  return NextResponse.json({ token, uid });
}
