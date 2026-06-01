// UC03 — Helpers cho phân quyền nội bộ DN
// Sử dụng trong /api/team/* và các API cần check sub-role
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface CompanyContext {
  userId: string;
  userRole: string;          // platform role: manufacturer | importer
  userName: string;
  doanhNghiepId: string;
  vaiTroCty: string;         // company_admin | staff_input | warehouse | viewer
  quyenMoiNV: boolean;
}

/**
 * Yêu cầu user là NSX/NNK đã login + thuộc 1 DN.
 * Trả về { ctx } hoặc { error: NextResponse } để API trả thẳng.
 */
export async function requireCompanyUser(): Promise<
  { ctx: CompanyContext; error?: undefined } | { error: NextResponse; ctx?: undefined }
> {
  const c = await cookies();
  const userRole = c.get('userRole')?.value;
  const dnId     = c.get('doanhNghiepId')?.value;
  const userId   = c.get('userId')?.value;
  const userName = c.get('userName')?.value || userRole || '';
  const vaiTroCty  = c.get('vaiTroCty')?.value || 'viewer';
  const quyenMoiNV = c.get('quyenMoiNV')?.value === '1';

  if (!userRole) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!['manufacturer', 'importer'].includes(userRole)) {
    return { error: NextResponse.json({ error: 'Forbidden — chỉ dành cho NSX/NNK' }, { status: 403 }) };
  }
  if (!dnId) {
    return { error: NextResponse.json({ error: 'Chưa gắn doanh nghiệp' }, { status: 403 }) };
  }
  if (!userId) {
    return { error: NextResponse.json({ error: 'Phiên đăng nhập thiếu userId — vui lòng đăng nhập lại' }, { status: 401 }) };
  }
  return { ctx: { userId, userRole, userName, doanhNghiepId: dnId, vaiTroCty, quyenMoiNV } };
}

/** Yêu cầu user phải có quyền mời nhân viên (= company_admin với quyenMoiNV=true) */
export async function requireCompanyAdmin(): Promise<
  { ctx: CompanyContext; error?: undefined } | { error: NextResponse; ctx?: undefined }
> {
  const r = await requireCompanyUser();
  if (r.error) return r;
  if (!r.ctx.quyenMoiNV || r.ctx.vaiTroCty !== 'company_admin') {
    return { error: NextResponse.json({ error: 'Forbidden — chỉ Quản trị DN mới có quyền' }, { status: 403 }) };
  }
  return r;
}

/** Yêu cầu user có sub-role thuộc whitelist (vd: ['company_admin','staff_input']) */
export async function requireSubRole(allowed: string[]): Promise<
  { ctx: CompanyContext; error?: undefined } | { error: NextResponse; ctx?: undefined }
> {
  const r = await requireCompanyUser();
  if (r.error) return r;
  if (!allowed.includes(r.ctx.vaiTroCty)) {
    return { error: NextResponse.json({ error: `Forbidden — yêu cầu vai trò: ${allowed.join(' | ')}` }, { status: 403 }) };
  }
  return r;
}

/** Generate invite URL từ token (host-aware) */
export function buildInviteUrl(token: string, host: string): string {
  return `${host.replace(/\/+$/, '')}/team/accept-invite?token=${encodeURIComponent(token)}`;
}

export const ALLOWED_SUB_ROLES = ['company_admin', 'staff_input', 'warehouse', 'viewer'] as const;
export type SubRole = typeof ALLOWED_SUB_ROLES[number];
