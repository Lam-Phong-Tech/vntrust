// Giấy phép lưu hành — gắn vào hồ sơ doanh nghiệp (KYC)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

async function ctx() {
  const c = await cookies();
  return {
    role: c.get('userRole')?.value || '',
    dnId: c.get('doanhNghiepId')?.value || '',
    userName: c.get('userName')?.value || 'DN',
  };
}

// GET — danh sách giấy phép của DN (admin có thể truyền ?doanhNghiepId=)
export async function GET(req: NextRequest) {
  try {
    const { role, dnId } = await ctx();
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const qDn = new URL(req.url).searchParams.get('doanhNghiepId');
    const targetDn = role === 'admin' && qDn ? qDn : dnId;
    if (!targetDn) return NextResponse.json({ items: [] });
    const items = await prisma.giayPhepLuuHanh.findMany({
      where: { doanhNghiepId: targetDn },
      orderBy: { ngayTao: 'desc' },
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — DN thêm giấy phép
export async function POST(req: NextRequest) {
  try {
    const { role, dnId } = await ctx();
    if (!['manufacturer', 'importer'].includes(role)) {
      return NextResponse.json({ error: 'Chỉ Doanh nghiệp được thêm giấy phép' }, { status: 403 });
    }
    if (!dnId) return NextResponse.json({ error: 'Tài khoản chưa gắn doanh nghiệp' }, { status: 403 });

    const b = await req.json();
    const tenGiayPhep = String(b.tenGiayPhep || '').trim();
    const soGiayPhep = String(b.soGiayPhep || '').trim();
    if (!tenGiayPhep || !soGiayPhep) {
      return NextResponse.json({ error: 'Vui lòng nhập tên giấy phép và số giấy phép' }, { status: 400 });
    }

    const item = await prisma.giayPhepLuuHanh.create({
      data: {
        tenGiayPhep,
        soGiayPhep,
        coQuanCap: b.coQuanCap?.trim() || null,
        ngayCap: b.ngayCap ? new Date(b.ngayCap) : null,
        ngayHetHan: b.ngayHetHan ? new Date(b.ngayHetHan) : null,
        phamVi: b.phamVi?.trim() || null,
        fileUrl: b.fileUrl || null,
        trangThai: 'active',
        doanhNghiepId: dnId,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — DN xóa giấy phép của mình (?id=...)
export async function DELETE(req: NextRequest) {
  try {
    const { role, dnId } = await ctx();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    const gp = await prisma.giayPhepLuuHanh.findUnique({ where: { id } });
    if (!gp) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (role !== 'admin' && gp.doanhNghiepId !== dnId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await prisma.giayPhepLuuHanh.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
