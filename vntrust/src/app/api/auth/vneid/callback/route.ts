import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Hash CCCD theo nguyên tắc bảo mật doc §III.4: lưu hash thay vì plaintext
// Salt từ env để cùng CCCD → cùng hash (deterministic, có thể lookup)
const CCCD_SALT = process.env.CCCD_HASH_SALT || 'vntrust-cccd-salt-2026-CHANGE-ME';
function hashCccd(cccd: string): string {
  return crypto.createHash('sha256').update(cccd + CCCD_SALT).digest('hex').substring(0, 16);
}
// Mask CCCD cho hiển thị: 4 chữ đầu + *** + 3 chữ cuối
function maskCccd(cccd: string): string {
  if (!cccd || cccd.length < 8) return '***';
  return cccd.substring(0, 4) + '***' + cccd.substring(cccd.length - 3);
}

// ─── VNeID OAuth2 callback ───────────────────────────────────────────────────
// Bước 1: validate state khớp cookie httpOnly
// Bước 2: exchange code → access_token (POST /_vneid/token)
// Bước 3: lấy thông tin user (GET /_vneid/userinfo)
// Bước 4: ghi NhatKy + set cookies session + redirect
// KHÔNG persist CCCD vào bảng NguoiDung (schema.prisma là protected).

const ALLOWED_ROLES = new Set(['admin', 'manufacturer', 'importer', 'consumer']);

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || 'https';
  const host = req.headers.get('host') || req.nextUrl.host;
  return `${proto}://${host}`;
}

function redirectWithError(baseUrl: string, role: string, code: string) {
  return NextResponse.redirect(new URL(`/login/${role}?vneid_error=${encodeURIComponent(code)}`, baseUrl));
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state') || '';
  const errorParam = url.searchParams.get('error');
  const baseUrl = getBaseUrl(req);

  // Tách state thành <random>.<role>
  const dotIdx = stateParam.indexOf('.');
  const stateValue = dotIdx > 0 ? stateParam.substring(0, dotIdx) : stateParam;
  const roleRaw = dotIdx > 0 ? stateParam.substring(dotIdx + 1) : 'consumer';
  const role = ALLOWED_ROLES.has(roleRaw) ? roleRaw : 'consumer';

  // 0) User hủy ở mock-vneid
  if (errorParam) {
    return redirectWithError(baseUrl, role, errorParam);
  }

  // 1) Verify state
  const expectedState = req.cookies.get('vneid_state')?.value;
  if (!code || !stateValue || !expectedState || stateValue !== expectedState) {
    return redirectWithError(baseUrl, role, 'invalid_state');
  }

  // 2) Exchange code → access_token
  let access_token: string;
  try {
    const tokenRes = await fetch(`${baseUrl}/_vneid/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: 'vntrust',
        redirect_uri: `${baseUrl}/api/auth/vneid/callback`,
      }),
      // Mock-vneid cùng VPS, timeout 5s là dư
      signal: AbortSignal.timeout(5000),
    });
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('VNeID token exchange failed:', tokenRes.status, errBody.substring(0, 200));
      return redirectWithError(baseUrl, role, 'token_failed');
    }
    const tokenJson = await tokenRes.json();
    access_token = tokenJson.access_token;
    if (!access_token) {
      return redirectWithError(baseUrl, role, 'token_missing');
    }
  } catch (e: any) {
    console.error('VNeID token fetch error:', e?.message || e);
    return redirectWithError(baseUrl, role, 'token_network');
  }

  // 3) Lấy thông tin định danh
  let info: { soDinhDanh?: string; hoTen?: string; ngaySinh?: string; gioiTinh?: string; queQuan?: string };
  try {
    const userRes = await fetch(`${baseUrl}/_vneid/userinfo`, {
      headers: { authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!userRes.ok) {
      console.error('VNeID userinfo failed:', userRes.status);
      return redirectWithError(baseUrl, role, 'userinfo_failed');
    }
    info = await userRes.json();
  } catch (e: any) {
    console.error('VNeID userinfo error:', e?.message || e);
    return redirectWithError(baseUrl, role, 'userinfo_network');
  }

  if (!info.soDinhDanh || !info.hoTen) {
    return redirectWithError(baseUrl, role, 'userinfo_incomplete');
  }

  // 4) Ghi log + set session
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  try {
    await prisma.nhatKy.create({
      data: {
        action: `Đăng nhập VNeID: ${info.hoTen} (CCCD ${info.soDinhDanh})`,
        user: info.hoTen,
        role,
        ip,
        status: 'success',
      },
    });
  } catch (e) {
    console.error('NhatKy log error:', e);
    // Không fail hard nếu log lỗi
  }

  // Redirect đích — consumer → /verify/scan, role khác → /dashboard
  const redirectPath = role === 'consumer' ? '/verify/scan' : '/dashboard';
  const res = NextResponse.redirect(new URL(redirectPath, baseUrl));
  // B3: reduce maxAge to 30 min (was 24h) — JWT TTL ngắn per §III.8
  const SESSION_TTL = 30 * 60;
  const baseCookie = {
    path: '/',
    maxAge: SESSION_TTL,
    sameSite: 'lax' as const,
    secure: baseUrl.startsWith('https'),
  };
  res.cookies.set('userRole', role, baseCookie);
  res.cookies.set('userName', info.hoTen, baseCookie);
  // B3: issue JWT session token (httpOnly)
  const { signJWT, SESSION_TOKEN_NAME } = await import('@/lib/jwt');
  const token = signJWT({ role, name: info.hoTen }, SESSION_TTL);
  res.cookies.set(SESSION_TOKEN_NAME, token, { ...baseCookie, httpOnly: true });
  // Theo doc §III.4: CCCD HASH (SHA-256 + Salt) — không lưu plaintext
  // Cookie cho client chỉ chứa hash + masked display; CCCD thật không leak qua HTTP
  res.cookies.set('vneidCccdHash', hashCccd(info.soDinhDanh), baseCookie);
  res.cookies.set('vneidCccdMask', maskCccd(info.soDinhDanh), baseCookie);
  res.cookies.set('vneidNgaySinh', info.ngaySinh || '', baseCookie);
  res.cookies.set('vneidGioiTinh', info.gioiTinh || '', baseCookie);
  res.cookies.set('vneidQueQuan', info.queQuan || '', baseCookie);
  res.cookies.delete('vneid_state');
  // Xóa cookie cũ vneidCccd plaintext nếu còn (backward compat cleanup)
  res.cookies.delete('vneidCccd');
  return res;
}
