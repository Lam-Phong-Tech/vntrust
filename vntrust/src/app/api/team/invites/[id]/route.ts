// UC03 — Revoke invite pending
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCompanyAdmin } from '@/lib/teamAuth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCompanyAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const inv = await prisma.loiMoiNhanVien.findUnique({ where: { id } });
  if (!inv || inv.doanhNghiepId !== auth.ctx.doanhNghiepId) {
    return NextResponse.json({ error: 'Không tìm thấy lời mời' }, { status: 404 });
  }
  if (inv.trangThai !== 'pending') {
    return NextResponse.json({ error: 'Lời mời không còn pending' }, { status: 400 });
  }
  await prisma.loiMoiNhanVien.update({ where: { id }, data: { trangThai: 'revoked' } });
  return NextResponse.json({ ok: true });
}
