import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const WRITE_ROLES = ['admin', 'manufacturer', 'importer']

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
          select: { uid: true, trangThai: true, soLanQuet: true, ngayTao: true }
        }
      }
    });

    if (!loHang) {
      return NextResponse.json({ error: "Kh?ng t?m th?y l? h?ng" }, { status: 404 });
    }

    if (userRole !== 'admin' && loHang.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden: B?n kh?ng c? quy?n truy c?p d? li?u c?a doanh nghi?p kh?c" }, { status: 403 });
    }

    return NextResponse.json(loHang);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ??? PUT: C?p nh?t th?ng tin l? h?ng ?????????????????????????????????????????
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || !WRITE_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Kh?ng c? quy?n ch?nh s?a l? h?ng" }, { status: 403 });
    }

    const existing = await prisma.loHang.findUnique({
      where: { id },
      include: { sanPham: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "Kh?ng t?m th?y l? h?ng" }, { status: 404 });
    }

    if (userRole !== 'admin' && existing.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden: B?n kh?ng c? quy?n s?a l? h?ng c?a doanh nghi?p kh?c" }, { status: 403 });
    }

    const body = await req.json();
    const { ngaySanXuat, hanDung } = body;

    if (!ngaySanXuat || !hanDung) {
      return NextResponse.json({ error: "Vui l?ng cung c?p ng?y s?n xu?t v? h?n d?ng" }, { status: 400 });
    }

    const sxDate = new Date(ngaySanXuat + 'T00:00:00');
    const hdDate = new Date(hanDung + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (sxDate > today) {
      return NextResponse.json({ error: "Ng?y s?n xu?t kh?ng ???c ? t??ng lai" }, { status: 400 });
    }
    if (hdDate < sxDate) {
      return NextResponse.json({ error: "H?n d?ng kh?ng ???c nh? h?n ng?y s?n xu?t" }, { status: 400 });
    }

    const updated = await prisma.loHang.update({
      where: { id },
      data: { ngaySanXuat: sxDate, hanDung: hdDate },
    });

    return NextResponse.json({ loHang: updated, message: "C?p nh?t l? h?ng th?nh c?ng" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ??? DELETE: X?a l? h?ng v? to?n b? tem QR c?a l? ???????????????????????????
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userDoanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || !WRITE_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Kh?ng c? quy?n x?a l? h?ng" }, { status: 403 });
    }

    const existing = await prisma.loHang.findUnique({
      where: { id },
      include: {
        sanPham: true,
        _count: { select: { uids: true } }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: "Kh?ng t?m th?y l? h?ng" }, { status: 404 });
    }

    if (userRole !== 'admin' && existing.sanPham.doanhNghiepId !== userDoanhNghiepId) {
      return NextResponse.json({ error: "Forbidden: B?n kh?ng c? quy?n x?a l? h?ng c?a doanh nghi?p kh?c" }, { status: 403 });
    }

    const totalUids = existing._count.uids;

    await prisma.$transaction([
      prisma.maDinhDanh.deleteMany({ where: { loHangId: id } }),
      prisma.loHang.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      message: `?? x?a l? h?ng ${existing.maLo} v? ${totalUids} tem QR li?n quan`,
      deleted: { loHangId: id, maLo: existing.maLo, uidsDeleted: totalUids }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
