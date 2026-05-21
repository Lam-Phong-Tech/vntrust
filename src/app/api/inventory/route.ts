import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let doanhNghiep;
    if (userRole === 'admin') {
      doanhNghiep = await prisma.doanhNghiep.findFirst();
    } else {
      if (!userDoanhNghiepId) return NextResponse.json({ error: "No enterprise assigned" }, { status: 403 });
      doanhNghiep = await prisma.doanhNghiep.findUnique({ where: { id: userDoanhNghiepId } });
    }

    if (!doanhNghiep) {
      return NextResponse.json({ error: "Chưa có doanh nghiệp nào. Hãy gọi /api/seed trước." }, { status: 404 });
    }

    const sanPhams = await prisma.sanPham.findMany({
      where: { doanhNghiepId: doanhNghiep.id },
      include: {
        chungNhans: { orderBy: { ngayCap: "desc" }, take: 1 },
        loHangs: {
          include: {
            _count: { select: { uids: true } }
          },
          orderBy: { ngaySanXuat: "desc" },
        },
        _count: { select: { loHangs: true } },
      },
      orderBy: { ngayTao: "desc" },
    });

    return NextResponse.json({ doanhNghiep, sanPhams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || (userRole !== 'admin' && userRole !== 'manufacturer')) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền thêm dữ liệu" }, { status: 403 });
    }

    const body = await req.json();
    const { type } = body;

    if (type === "product") {
      const { ten, moTa, GTIN, nuocSanXuat, thanhPhan, nhomSanPham, phanLoai2, phamCap, khoiLuong, quyCach, hinhAnhUrl } = body;
      
      // FR-PRD-01: ten là bắt buộc
      if (!ten) {
        return NextResponse.json({ error: "Tên sản phẩm là bắt buộc" }, { status: 400 });
      }

      // Bảo mật: Chỉ chấp nhận URL ảnh nội bộ
      if (hinhAnhUrl && !hinhAnhUrl.startsWith('/uploads/')) {
        return NextResponse.json({ error: "URL ảnh không hợp lệ" }, { status: 400 });
      }
      
      let targetDoanhNghiepId = userDoanhNghiepId;
      if (userRole === 'admin' && !targetDoanhNghiepId) {
        const d = await prisma.doanhNghiep.findFirst();
        if (d) targetDoanhNghiepId = d.id;
      }

      if (!targetDoanhNghiepId) {
        return NextResponse.json({ error: "Chưa có doanh nghiệp. Hãy gọi /api/seed trước." }, { status: 404 });
      }

      // Check if doanhNghiep exists to prevent Foreign Key Constraint errors (e.g. db was reset but old cookies exist)
      const existingDn = await prisma.doanhNghiep.findUnique({ where: { id: targetDoanhNghiepId }});
      if (!existingDn) {
        return NextResponse.json({ error: "Lỗi cookie doanhNghiepId đã cũ hoặc không hợp lệ. Vui lòng đăng xuất và đăng nhập lại, hoặc gọi /api/seed" }, { status: 400 });
      }

      const sanPham = await prisma.sanPham.create({
        data: {
          maSKU: `SKU-${randomUUID().substring(0, 8).toUpperCase()}`,
          ten,
          moTa: moTa || null,
          GTIN: GTIN || null,
          nuocSanXuat: nuocSanXuat || null,
          thanhPhan: thanhPhan || null,
          nhomSanPham: nhomSanPham || null,
          phanLoai2: phanLoai2 || null,
          phamCap: phamCap || null,
          khoiLuong: khoiLuong || null,
          quyCach: quyCach || null,
          hinhAnhUrl: hinhAnhUrl || null,
          doanhNghiepId: targetDoanhNghiepId,
        }
      });
      return NextResponse.json({ sanPham }, { status: 201 });
    }

    if (type === "batch") {
      const { sanPhamId, ngaySanXuat, hanDung, soLuong } = body;
      if (!sanPhamId || !ngaySanXuat || !hanDung || !soLuong) {
        return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
      }

      const sxDate = new Date(ngaySanXuat);
      const hdDate = new Date(hanDung);
      const today = new Date();
      today.setHours(today.getHours() + 24); // Account for timezone offset
      
      if (sxDate > today) {
        return NextResponse.json({ error: "Ngày sản xuất không được lớn hơn ngày hiện tại" }, { status: 400 });
      }
      if (hdDate < sxDate) {
        return NextResponse.json({ error: "Hạn dùng không được nhỏ hơn ngày sản xuất" }, { status: 400 });
      }

      const existingProduct = await prisma.sanPham.findUnique({ where: { id: sanPhamId } });
      if (!existingProduct || (userRole !== 'admin' && existingProduct.doanhNghiepId !== userDoanhNghiepId)) {
        return NextResponse.json({ error: "Forbidden: Bạn không có quyền thêm lô hàng vào sản phẩm này" }, { status: 403 });
      }

      const parsedQty = parseInt(soLuong);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        return NextResponse.json({ error: "Số lượng phải là số nguyên dương" }, { status: 400 });
      }
      // Số UIDs thực tế = min(soLuong, 10000) — đồng bộ với cột "Tem QR" trên UI
      const qty = Math.min(parsedQty, 10000);

      const loHang = await prisma.loHang.create({
        data: {
          maLo: `LO-${randomUUID().substring(0, 8).toUpperCase()}`,
          ngaySanXuat: new Date(ngaySanXuat),
          hanDung: new Date(hanDung),
          soLuong: qty,
          // FR-BAT-07: Tờ khai hải quan
          soToKhaiHQ: body.soToKhaiHQ || null,
          ngayThongQuan: body.ngayThongQuan ? new Date(body.ngayThongQuan) : null,
          cuaKhau: body.cuaKhau || null,
          hsCode: body.hsCode || null,
          nuocXuatXu: body.nuocXuatXu || null,
          sanPhamId,
        }
      });

      const uids = Array.from({ length: qty }, () => ({
        uid: randomUUID(),
        loai: "QR",
        loHangId: loHang.id,
      }));

      await prisma.maDinhDanh.createMany({ data: uids });

      return NextResponse.json({ loHang, totalUids: uids.length }, { status: 201 });
    }

    return NextResponse.json({ error: "type phải là 'product' hoặc 'batch'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PATCH: Đồng bộ số tem ↔ số sản phẩm cho tất cả lô hàng ─────────────────
// Phát hiện lô hàng bị lệch (soLuong ≠ _count.uids) và sửa chữa:
//   • Nếu UIDs < soLuong → tạo bổ sung UIDs còn thiếu
//   • Cập nhật soLuong = số UIDs thực tế
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get("userRole")?.value;
    if (!userRole || (userRole !== "admin" && userRole !== "manufacturer")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Lấy loHangId cụ thể (nếu truyền) hoặc sync tất cả
    const body = await req.json().catch(() => ({}));
    const targetId: string | undefined = body.loHangId;

    const whereClause = targetId ? { id: targetId } : {};

    // Lấy tất cả lô hàng kèm số UIDs thực tế
    const loHangs = await prisma.loHang.findMany({
      where: whereClause,
      include: { _count: { select: { uids: true } } },
    });

    let synced = 0;
    const results: { maLo: string; before: number; after: number; created: number }[] = [];

    for (const lo of loHangs) {
      const actualUids = lo._count.uids;
      const declared  = lo.soLuong;

      if (actualUids === declared) continue; // Đã đồng bộ, bỏ qua

      let created = 0;

      if (actualUids < declared) {
        // Thiếu UIDs → tạo bổ sung
        const missing = declared - actualUids;
        const newUids = Array.from({ length: missing }, () => ({
          uid: randomUUID(),
          loai: "QR",
          loHangId: lo.id,
        }));
        await prisma.maDinhDanh.createMany({ data: newUids });
        created = missing;
      }

      // Đếm lại sau khi tạo bổ sung
      const finalCount = await prisma.maDinhDanh.count({ where: { loHangId: lo.id } });

      // Cập nhật soLuong = số UIDs thực tế
      await prisma.loHang.update({
        where: { id: lo.id },
        data: { soLuong: finalCount },
      });

      results.push({ maLo: lo.maLo, before: declared, after: finalCount, created });
      synced++;
    }

    return NextResponse.json({
      message: synced === 0
        ? "Tất cả lô hàng đã đồng bộ, không cần sửa chữa."
        : `Đã đồng bộ ${synced} lô hàng.`,
      synced,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
