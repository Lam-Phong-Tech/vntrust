import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ─── VNeID OAuth2 start: redirect tới mock VNeID authorize endpoint ──────────
// Cookie `vneid_state` (httpOnly, 10 phút) sẽ được callback verify lại.
// State carry thêm role qua dấu chấm: "<random>.<role>" để callback biết redirect đâu.

const ALLOWED_ROLES = new Set(['admin', 'manufacturer', 'importer', 'consumer']);

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || 'https';
  const host = req.headers.get('host') || req.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const roleRaw = (req.nextUrl.searchParams.get('role') || 'consumer').toLowerCase();
  const role = ALLOWED_ROLES.has(roleRaw) ? roleRaw : 'consumer';
  const baseUrl = getBaseUrl(req);

  const state = crypto.randomBytes(16).toString('hex');
  const authorizeUrl = new URL('/_vneid/authorize', baseUrl);
  authorizeUrl.searchParams.set('client_id', 'vntrust');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', `${baseUrl}/api/auth/vneid/callback`);
  authorizeUrl.searchParams.set('state', `${state}.${role}`);
  authorizeUrl.searchParams.set('scope', 'openid profile');

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set('vneid_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 phút
    secure: baseUrl.startsWith('https'),
  });
  return res;
}
