import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loHang = await prisma.loHang.findUnique({
      where: { id },
      include: {
        sanPham: { include: { doanhNghiep: true } },
        uids: {
          orderBy: { ngayTao: "asc" },
          select: { uid: true, serialNumber: true, loai: true, trangThai: true, soLanQuet: true, ngayTao: true }
        }
      }
    });

    if (!loHang) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    // RBAC: If not admin, the user's doanhNghiepId must match the product's doanhNghiepId
    if (userRole !== 'admin' && loHang.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền truy cập dữ liệu của doanh nghiệp khác" }, { status: 403 });
    }

    return NextResponse.json(loHang);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PUT: Cập nhật thông tin lô hàng ─────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || (userRole !== 'admin' && userRole !== 'manufacturer')) {
      return NextResponse.json({ error: "Forbidden: Không có quyền chỉnh sửa lô hàng" }, { status: 403 });
    }

    const existing = await prisma.loHang.findUnique({
      where: { id },
      include: { sanPham: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    if (userRole !== 'admin' && existing.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền sửa lô hàng của doanh nghiệp khác" }, { status: 403 });
    }

    const body = await req.json();
    const { ngaySanXuat, hanDung } = body;

    if (!ngaySanXuat || !hanDung) {
      return NextResponse.json({ error: "Vui lòng cung cấp ngày sản xuất và hạn dùng" }, { status: 400 });
    }

    const sxDate = new Date(ngaySanXuat + 'T00:00:00');
    const hdDate = new Date(hanDung + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (sxDate > today) {
      return NextResponse.json({ error: "Ngày sản xuất không được ở tương lai" }, { status: 400 });
    }
    if (hdDate < sxDate) {
      return NextResponse.json({ error: "Hạn dùng không được nhỏ hơn ngày sản xuất" }, { status: 400 });
    }

    const updated = await prisma.loHang.update({
      where: { id },
      data: { ngaySanXuat: sxDate, hanDung: hdDate },
    });

    return NextResponse.json({ loHang: updated, message: "Cập nhật lô hàng thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Xóa lô hàng và toàn bộ tem QR của lô ───────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || !['admin', 'manufacturer', 'importer'].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Không có quyền xóa lô hàng" }, { status: 403 });
    }

    const existing = await prisma.loHang.findUnique({
      where: { id },
      include: {
        sanPham: true,
        _count: { select: { uids: true } }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    if (userRole !== 'admin' && existing.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền xóa lô hàng của doanh nghiệp khác" }, { status: 403 });
    }

    const totalUids = existing._count.uids;

    // Schema KHÔNG có onDelete: Cascade → phải xóa bảng con theo đúng thứ tự khóa ngoại,
    // nếu không sẽ vỡ ràng buộc FK (đây là lý do "không xóa được lô hàng" khi lô đã có
    // tem được quét / nhập kho / phân phối).
    await prisma.$transaction([
      // 1) Lịch sử quét của các tem trong lô (LuotQuet tham chiếu MaDinhDanh.uid)
      prisma.luotQuet.deleteMany({ where: { maDinhDanh: { loHangId: id } } }),
      // 2) FK bắt buộc tới lô → phải xóa: tồn kho + đơn chuyển hàng
      prisma.khoHang.deleteMany({ where: { loHangId: id } }),
      prisma.donChuyenHang.deleteMany({ where: { loHangId: id } }),
      // 3) FK optional → gỡ liên kết, GIỮ bản ghi (chứng nhận, hậu kiểm, checklist)
      prisma.chungNhan.updateMany({ where: { loHangId: id }, data: { loHangId: null } }),
      prisma.ketQuaHauKiem.updateMany({ where: { loHangId: id }, data: { loHangId: null } }),
      prisma.verificationChecklist.updateMany({ where: { loHangId: id }, data: { loHangId: null } }),
      // 4) Tem QR rồi tới lô hàng
      prisma.maDinhDanh.deleteMany({ where: { loHangId: id } }),
      prisma.loHang.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      message: `Đã xóa lô hàng ${existing.maLo} và ${totalUids} tem QR liên quan`,
      deleted: { loHangId: id, maLo: existing.maLo, uidsDeleted: totalUids }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
