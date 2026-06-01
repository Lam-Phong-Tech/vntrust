import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // P0.2 — Auth check + per-DN filter (NSX/NNK chỉ thấy stats của DN mình)
    const ck = await cookies();
    const userRole = ck.get('userRole')?.value;
    const userDN   = ck.get('doanhNghiepId')?.value;
    if (!userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isAdminOrConsumer = userRole === 'admin' || userRole === 'consumer';
    const dnFilter = !isAdminOrConsumer && userDN ? userDN : null;

    // Scan filter: theo SP của DN
    const scanWhere: any = dnFilter
      ? { maDinhDanh: { loHang: { sanPham: { doanhNghiepId: dnFilter } } } }
      : {};
    const productWhere: any = dnFilter ? { doanhNghiepId: dnFilter } : {};
    const batchWhere: any   = dnFilter ? { sanPham: { doanhNghiepId: dnFilter } } : {};
    // P0.2 fix: CanhBao chưa có DN denormalized → SQLite max 999 params nên
    // không thể filter `uid IN [500+ UIDs]`. Tạm để global open alerts cho NSX.
    // TODO: thêm doanhNghiepId column vào CanhBao + backfill để filter chính xác.
    const alertWhere: any = { trangThai: 'open' };

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
      prisma.luotQuet.count({ where: scanWhere }),
      prisma.luotQuet.count({ where: { ...scanWhere, ketQua: "genuine" } }),
      prisma.luotQuet.count({ where: { ...scanWhere, ketQua: "suspect" } }),
      prisma.luotQuet.count({ where: { ...scanWhere, ketQua: "fake" } }),
      prisma.sanPham.count({ where: productWhere }),
      prisma.loHang.count({ where: batchWhere }),
      prisma.canhBao.count({ where: alertWhere }),
      prisma.luotQuet.findMany({
        where: scanWhere,
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
        where: alertWhere,
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
