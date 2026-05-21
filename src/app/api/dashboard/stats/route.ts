import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalScans,
      genuineScans,
      suspectScans,
      fakeAttempts,
      totalProducts,
      totalBatches,
      openAlerts,
      recentScans,
      recentAlerts,
    ] = await Promise.all([
      prisma.luotQuet.count(),
      prisma.luotQuet.count({ where: { ketQua: "genuine" } }),
      prisma.luotQuet.count({ where: { ketQua: "suspect" } }),
      prisma.luotQuet.count({ where: { ketQua: "fake" } }),
      prisma.sanPham.count(),
      prisma.loHang.count(),
      prisma.canhBao.count({ where: { trangThai: "open" } }),
      prisma.luotQuet.findMany({
        orderBy: { thoiGian: "desc" },
        take: 10,
        include: {
          maDinhDanh: {
            include: {
              loHang: { include: { sanPham: true } }
            }
          }
        }
      }),
      prisma.canhBao.findMany({
        orderBy: { thoiGian: "desc" },
        take: 5,
        where: { trangThai: "open" },
      }),
    ]);

    const integrityScore = totalScans > 0
      ? (((genuineScans) / totalScans) * 100).toFixed(1)
      : "100.0";

    return NextResponse.json({
      totalScans,
      genuineScans,
      suspectScans,
      fakeAttempts,
      totalProducts,
      totalBatches,
      openAlerts,
      integrityScore,
      recentScans,
      recentAlerts,
    });
  } catch (error: any) {
    console.error("Stats Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
