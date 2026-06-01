import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// FR-HK-RULE: Quản lý bảng tiêu chuẩn kiểm nghiệm
// Dùng cho rule engine tự so sánh chỉ tiêu phân tích hậu kiểm vs ngưỡng quy định.
// Schema TieuChuanKiemNghiem: nhomSanPham + tenChiTieu + donVi + loaiNguong (max|min|range|qualitative) + nguongMin/Max/giaTriBatBuoc.

// GET — Danh sách standards (public read, có filter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nhomSanPham = searchParams.get('nhomSanPham') || undefined;
    const trangThai = searchParams.get('trangThai') || 'active';

    const where: any = { trangThai };
    if (nhomSanPham) where.nhomSanPham = nhomSanPham;

    const standards = await prisma.tieuChuanKiemNghiem.findMany({
      where,
      orderBy: [{ nhomSanPham: 'asc' }, { tenChiTieu: 'asc' }],
    });

    return NextResponse.json({ standards });
  } catch (e: any) {
    console.error('GET /api/standards:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — Tạo standard mới (admin only)
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin được tạo tiêu chuẩn' }, { status: 403 });
    }

    const body = await req.json();
    const { nhomSanPham, tenChiTieu, donVi, loaiNguong, nguongMin, nguongMax, giaTriBatBuoc, canCu, ghiChu } = body;

    if (!nhomSanPham || !tenChiTieu) {
      return NextResponse.json({ error: 'Thiếu nhomSanPham hoặc tenChiTieu' }, { status: 400 });
    }
    if (!['max', 'min', 'range', 'qualitative'].includes(loaiNguong)) {
      return NextResponse.json({ error: 'loaiNguong phải là max|min|range|qualitative' }, { status: 400 });
    }

    const created = await prisma.tieuChuanKiemNghiem.create({
      data: {
        nhomSanPham, tenChiTieu, donVi, loaiNguong,
        nguongMin: nguongMin != null ? Number(nguongMin) : null,
        nguongMax: nguongMax != null ? Number(nguongMax) : null,
        giaTriBatBuoc: giaTriBatBuoc || null,
        canCu, ghiChu,
      },
    });

    return NextResponse.json({ standard: created });
  } catch (e: any) {
    console.error('POST /api/standards:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — Cập nhật standard (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin được sửa tiêu chuẩn' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const data: any = {};
    if (rest.nhomSanPham !== undefined) data.nhomSanPham = rest.nhomSanPham;
    if (rest.tenChiTieu !== undefined) data.tenChiTieu = rest.tenChiTieu;
    if (rest.donVi !== undefined) data.donVi = rest.donVi;
    if (rest.loaiNguong !== undefined) data.loaiNguong = rest.loaiNguong;
    if (rest.nguongMin !== undefined) data.nguongMin = rest.nguongMin != null ? Number(rest.nguongMin) : null;
    if (rest.nguongMax !== undefined) data.nguongMax = rest.nguongMax != null ? Number(rest.nguongMax) : null;
    if (rest.giaTriBatBuoc !== undefined) data.giaTriBatBuoc = rest.giaTriBatBuoc;
    if (rest.canCu !== undefined) data.canCu = rest.canCu;
    if (rest.ghiChu !== undefined) data.ghiChu = rest.ghiChu;
    if (rest.trangThai !== undefined) data.trangThai = rest.trangThai;

    const updated = await prisma.tieuChuanKiemNghiem.update({ where: { id }, data });
    return NextResponse.json({ standard: updated });
  } catch (e: any) {
    console.error('PATCH /api/standards:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — Xóa mềm (set trangThai='deprecated')
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin được xóa' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const updated = await prisma.tieuChuanKiemNghiem.update({
      where: { id },
      data: { trangThai: 'deprecated' },
    });
    return NextResponse.json({ standard: updated, message: 'Đã chuyển sang deprecated' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
