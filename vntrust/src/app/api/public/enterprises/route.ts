import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const enterprises = await prisma.doanhNghiep.findMany({
      where: {
        trangThai: { notIn: ["suspended", "revoked"] },
      },
      select: {
        id: true,
        ten: true,
        maSoThue: true,
        loai: true,
        logoUrl: true,
        trangThai: true,
        thuongHieu: true,
      },
      orderBy: { ten: "asc" },
    });

    return NextResponse.json({ enterprises });
  } catch (error) {
    console.error("[public enterprises] load failed", error);
    return NextResponse.json({ error: "Could not load enterprises" }, { status: 500 });
  }
}
