import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SYSTEM_APPROVAL_CERT_TYPES, upsertSystemApproval } from "@/lib/systemApproval";

export const dynamic = "force-dynamic";

type ApprovalTarget = keyof typeof SYSTEM_APPROVAL_CERT_TYPES;

function isTarget(value: string | null): value is ApprovalTarget {
  return value === "product" || value === "batch";
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userName = cookieStore.get("userName")?.value || "admin";
  if (userRole !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden: admin only" }, { status: userRole ? 403 : 401 }),
    };
  }
  return { userName };
}

function approvalStatus(records?: Array<{ trangThaiDuyet: string }>) {
  const latest = records?.[0];
  return latest?.trangThaiDuyet || "pending";
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target");
  if (!isTarget(target)) {
    return NextResponse.json({ error: "target must be product or batch" }, { status: 400 });
  }

  const status = searchParams.get("status") || "all";
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  if (target === "product") {
    const rows = await prisma.sanPham.findMany({
      include: {
        doanhNghiep: { select: { ten: true, maSoThue: true } },
        chungNhans: {
          where: { loai: SYSTEM_APPROVAL_CERT_TYPES.product },
          orderBy: { ngayDuyet: "desc" },
          take: 1,
        },
        _count: { select: { loHangs: true } },
      },
      orderBy: { ngayTao: "desc" },
    });

    const items = rows
      .map((sp) => ({
        id: sp.id,
        code: sp.maSKU,
        name: sp.ten,
        secondary: sp.GTIN || sp.nhomSanPham || "",
        owner: sp.doanhNghiep?.ten || "",
        ownerTaxCode: sp.doanhNghiep?.maSoThue || "",
        createdAt: sp.ngayTao,
        status: approvalStatus(sp.chungNhans),
        note: sp.chungNhans[0]?.ghiChuAdmin || null,
        countLabel: `${sp._count.loHangs} lo hang`,
      }))
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => {
        if (!q) return true;
        return [item.code, item.name, item.secondary, item.owner, item.ownerTaxCode]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(q));
      });

    return NextResponse.json({ items });
  }

  const rows = await prisma.loHang.findMany({
    include: {
      sanPham: {
        select: {
          ten: true,
          maSKU: true,
          doanhNghiep: { select: { ten: true, maSoThue: true } },
        },
      },
      chungNhans: {
        where: { loai: SYSTEM_APPROVAL_CERT_TYPES.batch },
        orderBy: { ngayDuyet: "desc" },
        take: 1,
      },
      _count: { select: { uids: true } },
    },
    orderBy: { ngaySanXuat: "desc" },
  });

  const items = rows
    .map((lo) => ({
      id: lo.id,
      code: lo.maLo,
      name: lo.sanPham?.ten || "Unknown product",
      secondary: `${lo.sanPham?.maSKU || ""} - ${lo.soLuong} tem`,
      owner: lo.sanPham?.doanhNghiep?.ten || "",
      ownerTaxCode: lo.sanPham?.doanhNghiep?.maSoThue || "",
      createdAt: lo.ngaySanXuat,
      expiresAt: lo.hanDung,
      status: approvalStatus(lo.chungNhans),
      note: lo.chungNhans[0]?.ghiChuAdmin || null,
      countLabel: `${lo._count.uids} ma`,
    }))
    .filter((item) => status === "all" || item.status === status)
    .filter((item) => {
      if (!q) return true;
      return [item.code, item.name, item.secondary, item.owner, item.ownerTaxCode]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    });

  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { target: rawTarget, id, action, note } = body as {
    target?: string;
    id?: string;
    action?: string;
    note?: string;
  };

  const parsedTarget = rawTarget || null;
  if (!isTarget(parsedTarget) || !id || !["approve", "reject"].includes(action || "")) {
    return NextResponse.json({ error: "Invalid approval request" }, { status: 400 });
  }

  const target = parsedTarget;
  const status = action === "approve" ? "approved" : "rejected";

  const targetRecord = target === "product"
    ? await prisma.sanPham.findUnique({ where: { id }, select: { id: true, ten: true, maSKU: true } })
    : await prisma.loHang.findUnique({ where: { id }, select: { id: true, maLo: true } });

  if (!targetRecord) {
    return NextResponse.json({ error: "Approval target not found" }, { status: 404 });
  }

  const approval = await upsertSystemApproval({
    target,
    id,
    status,
    note: note || null,
    reviewer: "VNTrust Admin",
  });

  if (target === "batch") {
    await prisma.loHang.update({
      where: { id },
      data: { trangThai: status === "approved" ? "active" : "rejected" },
    });
  }

  await prisma.nhatKy.create({
    data: {
      action: `Admin ${status === "approved" ? "duyet" : "tu choi"} ${target} ${id}${note ? `: ${note}` : ""}`,
      user: auth.userName,
      role: "admin",
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: status === "approved" ? "success" : "warning",
    },
  });

  return NextResponse.json({ success: true, approval });
}
