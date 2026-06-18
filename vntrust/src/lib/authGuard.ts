/**
 * authGuard.ts — Server-side API guard for suspended/revoked accounts
 *
 * Usage:
 *   const guard = await requireActiveSession(req);
 *   if (guard.error) return guard.error;
 *   const { userRole, doanhNghiepId } = guard;
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const BLOCKED = ['suspended', 'revoked'];

// Demo account names that are not in DB — always pass guard
const DEMO_MARKERS = ['(Demo)', 'Admin'];

export type GuardSuccess = {
  error: null;
  userRole: string;
  doanhNghiepId: string | null;
  userName: string | null;
  isDemo: boolean;
};

export type GuardFailure = {
  error: NextResponse;
  userRole?: never;
  doanhNghiepId?: never;
  userName?: never;
  isDemo?: never;
};

export type GuardResult = GuardSuccess | GuardFailure;

/**
 * requireActiveSession
 * - Checks auth cookie exists
 * - For real (non-demo) business accounts: queries DB to verify
 *   both NguoiDung.trangThai and DoanhNghiep.trangThai are NOT suspended/revoked
 * - Admin accounts bypass company check
 */
export async function requireActiveSession(): Promise<GuardResult> {
  const cookieStore = await cookies();
  const userRole      = cookieStore.get('userRole')?.value;
  const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value || null;
  const userName      = cookieStore.get('userName')?.value || null;

  // ── 1. Must be logged in ────────────────────────────────────────────────────
  if (!userRole) {
    return { error: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }) };
  }

  // ── 2. Admin bypass (admin cookie-only, no company check needed) ───────────
  if (userRole === 'admin') {
    return { error: null, userRole, doanhNghiepId, userName, isDemo: false };
  }

  // ── 3. Demo accounts bypass (identified by userName marker) ───────────────
  const isDemo = DEMO_MARKERS.some(m => userName?.includes(m));
  if (isDemo || !doanhNghiepId) {
    return { error: null, userRole, doanhNghiepId, userName, isDemo: true };
  }

  // ── 4. Real business account: validate status in DB ───────────────────────
  try {
    const user = await prisma.nguoiDung.findFirst({
      where: { doanhNghiepId, vaiTro: userRole },
      include: { doanhNghiep: true },
    });

    if (!user) {
      return { error: NextResponse.json({ error: 'Tài khoản không tồn tại' }, { status: 401 }) };
    }

    // Block suspended/revoked user account
    if (BLOCKED.includes(user.trangThai)) {
      return {
        error: NextResponse.json(
          { error: 'Tài khoản đã bị khóa', reason: 'suspended' },
          { status: 403 }
        ),
      };
    }

    // Block suspended/revoked company
    if (user.doanhNghiep && BLOCKED.includes(user.doanhNghiep.trangThai)) {
      return {
        error: NextResponse.json(
          { error: 'Doanh nghiệp đã bị thu hồi hoặc từ chối. Vui lòng liên hệ hỗ trợ.', reason: 'suspended' },
          { status: 403 }
        ),
      };
    }

    return { error: null, userRole, doanhNghiepId, userName, isDemo: false };
  } catch (err) {
    console.error('[authGuard] DB error:', err);
    // Fail open — don't block on DB errors to avoid outage
    return { error: null, userRole, doanhNghiepId, userName, isDemo: false };
  }
}
