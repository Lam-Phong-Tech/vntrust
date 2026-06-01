// Admin user management — single user actions
// PATCH: thay đổi trangThai (suspend/reactivate) hoặc vaiTro
// DELETE: xóa NguoiDung (chỉ cho phép xóa nếu KHÔNG còn DN gắn role chính)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const ALLOWED_STATUS = ['active', 'suspended', 'pending'] as const;
const ALLOWED_ROLES  = ['admin', 'manufacturer', 'importer', 'consumer', 'staff', 'consultant', 'authority'] as const;

async function requireAdmin() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value;
  const userId   = cookieStore.get('userId')?.value || '';
  const userName = cookieStore.get('userName')?.value || userRole || 'admin';
  if (!userRole) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (userRole !== 'admin') return { error: NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 }) };
  return { userRole, userId, userName };
}

async function logAction(action: string, byUserName: string, ip: string, status: 'success' | 'error') {
  try {
    await prisma.nhatKy.create({
      data: { action, user: byUserName, role: 'admin', ip, status },
    });
  } catch { /* nhật ký lỗi không chặn flow chính */ }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await req.json();
    const { trangThai, vaiTro } = body || {};

    const data: any = {};
    if (typeof trangThai === 'string') {
      if (!ALLOWED_STATUS.includes(trangThai as any)) {
        return NextResponse.json({ error: `trangThai phải là 1 trong: ${ALLOWED_STATUS.join(', ')}` }, { status: 400 });
      }
      data.trangThai = trangThai;
    }
    if (typeof vaiTro === 'string') {
      if (!ALLOWED_ROLES.includes(vaiTro as any)) {
        return NextResponse.json({ error: `vaiTro phải là 1 trong: ${ALLOWED_ROLES.join(', ')}` }, { status: 400 });
      }
      data.vaiTro = vaiTro;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Phải có ít nhất 1 field: trangThai hoặc vaiTro' }, { status: 400 });
    }

    // Không cho phép admin tự suspend chính mình
    if (auth.userId && id === auth.userId && data.trangThai === 'suspended') {
      return NextResponse.json({ error: 'Không thể tự khóa tài khoản của chính bạn' }, { status: 400 });
    }

    const existing = await prisma.nguoiDung.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });

    const updated = await prisma.nguoiDung.update({
      where: { id },
      select: { id: true, email: true, ten: true, vaiTro: true, trangThai: true },
      data,
    });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const changes = [
      data.trangThai && `trangThai: ${existing.trangThai} → ${data.trangThai}`,
      data.vaiTro    && `vaiTro: ${existing.vaiTro} → ${data.vaiTro}`,
    ].filter(Boolean).join(', ');
    await logAction(`[ADMIN USER PATCH] ${updated.email} — ${changes}`, auth.userName, ip, 'success');

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    console.error('[admin/users PATCH]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (auth.userId && id === auth.userId) {
      return NextResponse.json({ error: 'Không thể tự xóa tài khoản của chính bạn' }, { status: 400 });
    }

    const existing = await prisma.nguoiDung.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });

    // Chặn xóa admin cuối cùng
    if (existing.vaiTro === 'admin') {
      const adminCount = await prisma.nguoiDung.count({ where: { vaiTro: 'admin' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Không thể xóa admin cuối cùng của hệ thống' }, { status: 400 });
      }
    }

    await prisma.nguoiDung.delete({ where: { id } });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    await logAction(`[ADMIN USER DELETE] ${existing.email} (role=${existing.vaiTro})`, auth.userName, ip, 'success');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[admin/users DELETE]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
