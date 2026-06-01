// UC03 — /api/team/[id]
// PATCH  : Đổi vaiTroCty / quyenMoiNV / trangThai của thành viên DN
// DELETE : Vô hiệu hóa (trangThai='suspended') — không xóa hẳn để giữ audit log
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCompanyAdmin, ALLOWED_SUB_ROLES } from '@/lib/teamAuth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCompanyAdmin();
  if (auth.error) return auth.error;
  const { userId: meId, userName, doanhNghiepId } = auth.ctx;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: any = {};

  if (typeof body.vaiTroCty === 'string') {
    if (!ALLOWED_SUB_ROLES.includes(body.vaiTroCty)) {
      return NextResponse.json({ error: `vaiTroCty không hợp lệ` }, { status: 400 });
    }
    data.vaiTroCty = body.vaiTroCty;
  }
  if (typeof body.quyenMoiNV === 'boolean') {
    data.quyenMoiNV = body.quyenMoiNV;
  }
  if (typeof body.trangThai === 'string') {
    if (!['active', 'suspended'].includes(body.trangThai)) {
      return NextResponse.json({ error: 'trangThai phải là active hoặc suspended' }, { status: 400 });
    }
    data.trangThai = body.trangThai;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Không có thay đổi' }, { status: 400 });
  }

  // Verify target thuộc DN của requester
  const target = await prisma.nguoiDung.findUnique({ where: { id } });
  if (!target || target.doanhNghiepId !== doanhNghiepId) {
    return NextResponse.json({ error: 'Không tìm thấy thành viên' }, { status: 404 });
  }

  // Không cho phép tự suspend / hạ quyền chính mình
  if (id === meId) {
    if (data.trangThai === 'suspended') {
      return NextResponse.json({ error: 'Không thể tự khóa chính mình' }, { status: 400 });
    }
    if (data.vaiTroCty && data.vaiTroCty !== 'company_admin') {
      return NextResponse.json({ error: 'Không thể tự hạ quyền company_admin' }, { status: 400 });
    }
    if (data.quyenMoiNV === false) {
      return NextResponse.json({ error: 'Không thể tự bỏ quyền mời nhân viên' }, { status: 400 });
    }
  }

  // Chặn xóa company_admin cuối cùng có quyenMoiNV
  if (data.trangThai === 'suspended' || (data.vaiTroCty && data.vaiTroCty !== 'company_admin')) {
    const countAdmin = await prisma.nguoiDung.count({
      where: { doanhNghiepId, vaiTroCty: 'company_admin', quyenMoiNV: true, trangThai: 'active', NOT: { id } } as any,
    });
    if (countAdmin === 0) {
      return NextResponse.json({ error: 'Phải có ít nhất 1 company_admin có quyền mời NV' }, { status: 400 });
    }
  }

  const updated = await prisma.nguoiDung.update({
    where: { id }, data,
    select: { id: true, email: true, ten: true, vaiTroCty: true, quyenMoiNV: true, trangThai: true } as any,
  });

  await prisma.nhatKy.create({
    data: {
      action: `[TEAM PATCH] ${userName} → ${target.email}: ${JSON.stringify(data)}`,
      user: userName,
      role: 'manufacturer',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'success',
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Soft delete = suspend
  const auth = await requireCompanyAdmin();
  if (auth.error) return auth.error;
  const { userId: meId, userName, doanhNghiepId } = auth.ctx;
  const { id } = await params;

  if (id === meId) {
    return NextResponse.json({ error: 'Không thể tự xóa chính mình' }, { status: 400 });
  }

  const target = await prisma.nguoiDung.findUnique({ where: { id } });
  if (!target || target.doanhNghiepId !== doanhNghiepId) {
    return NextResponse.json({ error: 'Không tìm thấy thành viên' }, { status: 404 });
  }

  // Chặn xóa company_admin cuối
  if (((target as any).vaiTroCty === 'company_admin') && (target as any).quyenMoiNV) {
    const countAdmin = await prisma.nguoiDung.count({
      where: { doanhNghiepId, vaiTroCty: 'company_admin', quyenMoiNV: true, trangThai: 'active', NOT: { id } } as any,
    });
    if (countAdmin === 0) {
      return NextResponse.json({ error: 'Phải giữ lại ít nhất 1 company_admin có quyền mời NV' }, { status: 400 });
    }
  }

  await prisma.nguoiDung.update({
    where: { id }, data: { trangThai: 'suspended' },
  });

  await prisma.nhatKy.create({
    data: {
      action: `[TEAM SUSPEND] ${userName} khóa ${target.email}`,
      user: userName, role: 'manufacturer',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'success',
    },
  });

  return NextResponse.json({ ok: true });
}
