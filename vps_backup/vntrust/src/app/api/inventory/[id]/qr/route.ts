import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

// POST: Add more QR codes to an existing batch
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || !['admin', 'manufacturer'].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { amount } = await req.json();
    if (!amount || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: "Số lượng thêm không hợp lệ (1 - 10000)" }, { status: 400 });
    }

    const loHang = await prisma.loHang.findUnique({
      where: { id },
      include: { sanPham: true }
    });

    if (!loHang) return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    
    if (userRole !== 'admin' && loHang.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newUids = Array.from({ length: amount }).map(() => ({
      uid: randomUUID().replace(/-/g, "").substring(0, 16),
      loHangId: id,
    }));

    await prisma.$transaction([
      prisma.maDinhDanh.createMany({ data: newUids }),
      prisma.loHang.update({
        where: { id },
        data: { soLuong: { increment: amount } }
      })
    ]);

    return NextResponse.json({ message: `Đã thêm ${amount} mã QR thành công` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Regenerate a specific QR code
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || !['admin', 'manufacturer'].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "Thiếu UID" }, { status: 400 });

    const loHang = await prisma.loHang.findUnique({
      where: { id },
      include: { sanPham: true }
    });

    if (!loHang) return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    
    if (userRole !== 'admin' && loHang.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate new UID to replace the old one
    const newUidString = randomUUID().replace(/-/g, "").substring(0, 16);

    // Update the UID
    await prisma.maDinhDanh.update({
      where: { uid },
      data: { uid: newUidString, trangThai: "active", soLanQuet: 0 }
    });

    return NextResponse.json({ message: "Đã tạo lại mã QR", newUid: newUidString });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a specific QR code
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || !['admin', 'manufacturer'].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    
    if (!uid) return NextResponse.json({ error: "Thiếu UID" }, { status: 400 });

    const loHang = await prisma.loHang.findUnique({
      where: { id },
      include: { sanPham: true }
    });

    if (!loHang) return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    
    if (userRole !== 'admin' && loHang.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.maDinhDanh.delete({ where: { uid } }),
      prisma.loHang.update({
        where: { id },
        data: { soLuong: { decrement: 1 } }
      })
    ]);

    return NextResponse.json({ message: "Đã xóa mã QR" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
