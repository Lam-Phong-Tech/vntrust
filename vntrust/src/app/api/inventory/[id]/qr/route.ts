import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

async function getEffectiveSubRole(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const vaiTroCty = cookieStore.get("vaiTroCty")?.value;
  if (vaiTroCty) return vaiTroCty;

  const userId = cookieStore.get("userId")?.value;
  if (!userId) return "viewer";

  const user = await prisma.nguoiDung.findUnique({
    where: { id: userId },
    select: { vaiTroCty: true },
  });
  return user?.vaiTroCty || "viewer";
}

async function assertCanManageQR(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const userRole = cookieStore.get("userRole")?.value;
  const userDoanhNghiepId = cookieStore.get("doanhNghiepId")?.value;

  if (!userRole || !["admin", "manufacturer"].includes(userRole)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (userRole !== "admin") {
    const subRole = await getEffectiveSubRole(cookieStore);
    if (!["company_admin", "staff_input"].includes(subRole)) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: `Forbidden: vai trò nội bộ "${subRole}" không có quyền quản lý QR` }, { status: 403 }),
      };
    }
  }

  return { ok: true as const, userRole, userDoanhNghiepId };
}

// POST: Add more QR codes to an existing batch
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const auth = await assertCanManageQR(cookieStore);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: "Số lượng thêm không hợp lệ (1 - 10000)" }, { status: 400 });
    }

    const loHang = await prisma.loHang.findUnique({
      where: { id },
      include: { sanPham: true }
    });

    if (!loHang) return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });

    if (auth.userRole !== "admin" && loHang.sanPham.doanhNghiepId !== auth.userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newUids = Array.from({ length: amount }).map(() => ({
      uid: randomUUID().replace(/-/g, "").substring(0, 16),
      loHangId: id,
      loai: "QR",
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
    const auth = await assertCanManageQR(cookieStore);
    if (!auth.ok) return auth.response;

    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "Thiếu UID" }, { status: 400 });

    const loHang = await prisma.loHang.findUnique({
      where: { id },
      include: { sanPham: true }
    });

    if (!loHang) return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });

    if (auth.userRole !== "admin" && loHang.sanPham.doanhNghiepId !== auth.userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingUid = await prisma.maDinhDanh.findFirst({
      where: { uid, loHangId: id },
      select: { uid: true },
    });
    if (!existingUid) {
      return NextResponse.json({ error: "UID không thuộc lô hàng này hoặc không tồn tại" }, { status: 404 });
    }

    const newUidString = randomUUID().replace(/-/g, "").substring(0, 16);

    await prisma.maDinhDanh.update({
      where: { uid },
      data: { uid: newUidString, trangThai: "active", soLanQuet: 0 }
    });

    return NextResponse.json({ message: "Đã tạo lại mã QR", newUid: newUidString });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a specific QR code or multiple QR codes
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const auth = await assertCanManageQR(cookieStore);
    if (!auth.ok) return auth.response;

    const loHang = await prisma.loHang.findUnique({
      where: { id },
      include: { sanPham: true }
    });

    if (!loHang) return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });

    if (auth.userRole !== "admin" && loHang.sanPham.doanhNghiepId !== auth.userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let uidsToDelete: string[] = [];

    try {
      const body = await req.json();
      if (body && Array.isArray(body.uids) && body.uids.length > 0) {
        uidsToDelete = body.uids;
      }
    } catch (e) {
      // Ignore empty or invalid JSON body
    }

    if (uidsToDelete.length === 0) {
      const { searchParams } = new URL(req.url);
      const uid = searchParams.get("uid");
      if (uid) uidsToDelete = [uid];
    }

    const uniqueUids = [...new Set(uidsToDelete.map(uid => String(uid).trim()).filter(Boolean))];
    if (uniqueUids.length === 0) {
      return NextResponse.json({ error: "Thiếu thông tin UID cần xóa" }, { status: 400 });
    }

    const deletedCount = await prisma.$transaction(async (tx) => {
      const deleted = await tx.maDinhDanh.deleteMany({
        where: { uid: { in: uniqueUids }, loHangId: id },
      });
      if (deleted.count === 0) return 0;

      const remaining = await tx.maDinhDanh.count({ where: { loHangId: id } });
      await tx.loHang.update({
        where: { id },
        data: { soLuong: remaining },
      });
      return deleted.count;
    });

    if (deletedCount === 0) {
      return NextResponse.json({ error: "Không tìm thấy mã QR thuộc lô hàng này để xóa" }, { status: 404 });
    }

    return NextResponse.json({ message: `Đã xóa ${deletedCount} mã QR`, deletedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
