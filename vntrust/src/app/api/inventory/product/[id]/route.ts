// PATCH (sửa) + DELETE (xóa) SẢN PHẨM — bổ sung cho bug #6 "chưa có nút sửa/xóa sản phẩm".
// (Thêm sản phẩm đã có ở POST /api/inventory type='product'.)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Xác thực quyền + sở hữu sản phẩm; trả về NextResponse lỗi hoặc bản ghi sản phẩm.
async function authOrError(id: string): Promise<NextResponse | any> {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userDoanhNghiepId = cookieStore.get("doanhNghiepId")?.value;
  if (!userRole || !["admin", "manufacturer", "importer"].includes(userRole)) {
    return NextResponse.json({ error: "Không có quyền thao tác sản phẩm" }, { status: 403 });
  }
  const sanPham = await prisma.sanPham.findUnique({
    where: { id },
    include: { _count: { select: { loHangs: true } } },
  });
  if (!sanPham) return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
  if (userRole !== "admin" && sanPham.doanhNghiepId !== userDoanhNghiepId) {
    return NextResponse.json({ error: "Bạn không có quyền với sản phẩm của doanh nghiệp khác" }, { status: 403 });
  }
  return sanPham;
}

// ── PATCH: cập nhật thông tin sản phẩm ──
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const a = await authOrError(id);
    if (a instanceof NextResponse) return a;

    const body = await req.json().catch(() => ({}));
    const allowed = ["ten", "moTa", "GTIN", "nuocSanXuat", "hinhAnhUrl", "thanhPhan", "khoiLuong", "quyCach"];
    const data: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) data[k] = body[k] === "" ? null : body[k];
    }
    if (data.ten !== undefined && !String(data.ten).trim()) {
      return NextResponse.json({ error: "Tên sản phẩm không được để trống" }, { status: 400 });
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu cập nhật" }, { status: 400 });
    }
    const updated = await prisma.sanPham.update({ where: { id }, data });
    return NextResponse.json({ sanPham: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── DELETE: xóa sản phẩm (chặn nếu còn lô hàng; xóa chứng nhận kèm; gỡ liên kết optional) ──
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const a = await authOrError(id);
    if (a instanceof NextResponse) return a;

    if (a._count.loHangs > 0) {
      return NextResponse.json(
        { error: `Sản phẩm còn ${a._count.loHangs} lô hàng. Vui lòng xóa hết lô hàng trước khi xóa sản phẩm.` },
        { status: 400 }
      );
    }

    // Không còn lô hàng → xóa an toàn: chứng nhận của SP (xóa kèm), các tham chiếu optional (gỡ liên kết)
    await prisma.$transaction([
      prisma.chungNhan.deleteMany({ where: { sanPhamId: id } }),
      prisma.ketQuaHauKiem.updateMany({ where: { sanPhamId: id }, data: { sanPhamId: null } }),
      prisma.fraudHistory.updateMany({ where: { sanPhamId: id }, data: { sanPhamId: null } }),
      prisma.sanPham.delete({ where: { id } }),
    ]);
    return NextResponse.json({ message: "Đã xóa sản phẩm" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
