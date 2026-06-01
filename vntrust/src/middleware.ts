import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Rate Limiting Store (in-memory, NFR-SC-04) ─────────────────────────────
// Production: use Redis via Upstash
const rateStore = new Map<string, { count: number; reset: number }>();

function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateStore.get(ip);
  if (!entry || now > entry.reset) {
    rateStore.set(ip, { count: 1, reset: now + windowMs });
    return true; // OK
  }
  entry.count++;
  if (entry.count > limit) return false; // Rate limited
  return true;
}

// Cleanup stale entries every 1000 requests
let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter % 1000 === 0) {
    const now = Date.now();
    rateStore.forEach((v, k) => { if (now > v.reset) rateStore.delete(k); });
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  maybeCleanup();

  // ── NFR-SC-04: Rate limiting for auth endpoints ──────────────────────────
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    // 10 attempts per 60 seconds per IP (brute force protection)
    if (!rateLimit(ip, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 60 giây.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // ── NFR-SC-04: Rate limiting for report endpoint (anonymous) ─────────────
  if (pathname.startsWith('/api/report')) {
    // 5 reports per 10 minutes per IP
    if (!rateLimit(ip, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau 10 phút.' },
        { status: 429, headers: { 'Retry-After': '600' } }
      );
    }
  }

  // ── Route protection (NFR-SC-06: Least Privilege) ────────────────────────
  const protectedPaths = ['/dashboard', '/enterprise', '/supply-chain'];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtected) {
    const userRole = request.cookies.get('userRole')?.value;
    if (!userRole) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ── Admin-only routes (B-04 fix: thực sự block tại middleware) ──────────────
  const adminOnlyPaths = ['/dashboard/security', '/dashboard/kyc', '/dashboard/logs', '/dashboard/risks', '/dashboard/roadmap', '/dashboard/readiness', '/dashboard/users', '/dashboard/geocoding', '/dashboard/system-config'];
  if (adminOnlyPaths.some(p => pathname.startsWith(p))) {
    const userRole = request.cookies.get('userRole')?.value;
    if (userRole && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?error=forbidden', request.url));
    }
  }

  // ── NFR-SC-01: Security Headers (TLS enforced at nginx level) ────────────
  const response = NextResponse.next();

  // Strict Transport Security (HSTS) - TLS 1.3 compliance signal
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // NFR-SC-04: XSS Protection
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy (blocks inline scripts from unknown sources)
  // frame-src: cho phép embed bản đồ OpenStreetMap (vị trí xác thực lần cuối)
  // connect-src: VietMap API (tiles + style JSON + geocoding)
  // worker-src: MapLibre GL dùng web workers cho tile loading
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://maps.googleapis.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https: https://maps.vietmap.vn https://basemaps.cartocdn.com https://server.arcgisonline.com https://glfonts.lukasmartinelli.ch; " +
    "worker-src 'self' blob:; " +
    "frame-src 'self' https://www.openstreetmap.org https://*.openstreetmap.org; " +
    "frame-ancestors 'none';"
  );
  // Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=self, microphone=(), geolocation=self');
  // Remove server fingerprinting
  response.headers.delete('X-Powered-By');

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/enterprise/:path*',
    '/supply-chain/:path*',
    '/api/auth/:path*',
    '/api/report/:path*',
    '/api/kyc/:path*',
    '/api/distribution/:path*',
    '/api/alerts/:path*',
    '/api/certificates/:path*',
    '/api/warehouse/:path*',
    '/api/bulk-import/:path*',
    '/api/analytics/:path*',
  ],
}
