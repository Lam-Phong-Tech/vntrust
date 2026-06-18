// B3 Sprint 4 — HMAC-SHA256 JWT (no extra dependency)
// Implements signed session tokens per Tài liệu nghiệp vụ §III.8 "JWT TTL ngắn 15-30 phút"
// Format: header.payload.signature (HS256, base64url)
//
// Usage:
//   const token = signJWT({ role, name, doanhNghiepId }, 1800);  // 30 min
//   const payload = verifyJWT(token);  // null if invalid/expired
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET
  || process.env.VAULT_AES_KEY  // fallback to vault key (already required)
  || 'vntrust-jwt-default-secret-change-in-prod';

const HEADER = { alg: 'HS256', typ: 'JWT' };

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return b.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Buffer {
  // pad
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

export interface SessionPayload {
  role: string;
  name?: string;
  email?: string;         // dùng cho reset-password token (role='pwd-reset')
  doanhNghiepId?: string;
  userId?: string;        // UC03 — NguoiDung.id (cho audit + invite tracking)
  vaiTroCty?: string;     // UC03 — sub-role nội bộ DN
  quyenMoiNV?: boolean;   // UC03 — quyền mời NV
  iat?: number;
  exp?: number;
}

// Sign a JWT — default TTL = 30 minutes (Sprint 3/B3 spec)
export function signJWT(payload: SessionPayload, ttlSec: number = 1800): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSec,
  };
  const h = b64urlEncode(JSON.stringify(HEADER));
  const p = b64urlEncode(JSON.stringify(fullPayload));
  const data = `${h}.${p}`;
  const sig = b64urlEncode(crypto.createHmac('sha256', SECRET).update(data).digest());
  return `${data}.${sig}`;
}

// Verify + decode; returns null if signature invalid OR expired
export function verifyJWT(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  // 1. Verify signature
  const expectedSig = b64urlEncode(crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest());
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expectedSig))) {
    return null;
  }
  // 2. Decode payload
  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(p).toString('utf8'));
  } catch {
    return null;
  }
  // 3. Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) {
    return null;
  }
  return payload;
}

// Decode without verifying signature (for debugging/inspection)
export function decodeJWT(token: string): SessionPayload | null {
  try {
    return JSON.parse(b64urlDecode(token.split('.')[1]).toString('utf8'));
  } catch {
    return null;
  }
}

// Constants for cookie management
export const SESSION_TOKEN_NAME = 'sessionToken';
export const SESSION_TTL_SEC = 30 * 60;  // 30 min access token
export const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days refresh
