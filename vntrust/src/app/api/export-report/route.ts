import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRole, requireAuth } from "@/lib/auth";

type ReportPeriod = "week" | "month" | "quarter";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: "7 ngày",
  month: "30 ngày",
  quarter: "3 tháng",
};

function getPeriodStart(period: ReportPeriod) {
  const now = new Date();
  const start = new Date(now);
  if (period === "week") start.setDate(now.getDate() - 7);
  if (period === "month") start.setMonth(now.getMonth() - 1);
  if (period === "quarter") start.setMonth(now.getMonth() - 3);
  return start;
}

function asPeriod(value: string | null): ReportPeriod {
  return value === "week" || value === "quarter" ? value : "month";
}

function csvCell(value: unknown) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(",");
}

function sanitizeDescription(value: string) {
  return value.replace(/\[SECURE_CONTACT:.+?\]/g, "***SECURE_DATA***");
}

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  try {
    const role = getRole(req)!;
    const doanhNghiepId = req.cookies.get("doanhNghiepId")?.value || "";
    const { searchParams } = new URL(req.url);
    const period = asPeriod(searchParams.get("period"));
    const periodStart = getPeriodStart(period);

    const productWhere = role === "admin"
      ? {}
      : role === "manufacturer" || role === "importer"
        ? { doanhNghiepId: doanhNghiepId || "__none__" }
        : { id: "__none__" };

    const batchWhere = role === "admin"
      ? {}
      : role === "manufacturer" || role === "importer"
        ? { sanPham: { doanhNghiepId: doanhNghiepId || "__none__" } }
        : { id: "__none__" };

    const codeWhere = role === "admin"
      ? {}
      : role === "manufacturer" || role === "importer"
        ? { loHang: { sanPham: { doanhNghiepId: doanhNghiepId || "__none__" } } }
        : { uid: "__none__" };

    const scanWhere = role === "admin"
      ? { thoiGian: { gte: periodStart } }
      : role === "manufacturer" || role === "importer"
        ? { thoiGian: { gte: periodStart }, maDinhDanh: { loHang: { sanPham: { doanhNghiepId: doanhNghiepId || "__none__" } } } }
        : { thoiGian: { gte: periodStart }, uid: "__none__" };

    const scopedCodes = role === "admin"
      ? []
      : await prisma.maDinhDanh.findMany({
          where: codeWhere,
          select: { uid: true },
          take: 5000,
        });
    const scopedUidList = scopedCodes.map(item => item.uid);
    const alertWhere = role === "admin"
      ? { thoiGian: { gte: periodStart } }
      : scopedUidList.length > 0
        ? { thoiGian: { gte: periodStart }, uid: { in: scopedUidList } }
        : { id: "__none__" };
    const logWhere = role === "admin"
      ? { time: { gte: periodStart } }
      : { role, time: { gte: periodStart } };

    const [
      totalProducts,
      totalBatches,
      totalCodes,
      totalScans,
      suspectScans,
      openAlerts,
      logs,
      alerts,
      topCodes,
    ] = await Promise.all([
      prisma.sanPham.count({ where: productWhere }),
      prisma.loHang.count({ where: batchWhere }),
      prisma.maDinhDanh.count({ where: codeWhere }),
      prisma.luotQuet.count({ where: scanWhere }),
      prisma.luotQuet.count({ where: { ...scanWhere, ketQua: { in: ["fake", "suspect"] } } }),
      prisma.canhBao.count({ where: { ...alertWhere, trangThai: "open" } }),
      prisma.nhatKy.findMany({
        where: logWhere,
        orderBy: { time: "desc" },
        take: 200,
      }),
      prisma.canhBao.findMany({
        where: alertWhere,
        orderBy: { thoiGian: "desc" },
        take: 200,
      }),
      prisma.maDinhDanh.findMany({
        where: { ...codeWhere, soLanQuet: { gt: 0 } },
        orderBy: { soLanQuet: "desc" },
        take: 30,
        include: {
          loHang: {
            include: {
              sanPham: { select: { ten: true, maSKU: true } },
            },
          },
        },
      }),
    ]);

    const fakeRate = totalScans > 0 ? `${((suspectScans / totalScans) * 100).toFixed(1)}%` : "0.0%";
    const rows: string[] = [
      csvRow(["BÁO CÁO AI VERIGOODS"]),
      csvRow(["Ngày xuất", new Date().toLocaleString("vi-VN")]),
      csvRow(["Kỳ báo cáo", PERIOD_LABELS[period]]),
      csvRow(["Vai trò", role]),
      csvRow(["Doanh nghiệp", role === "admin" ? "Toàn hệ thống" : doanhNghiepId || "Không có"]),
      "",
      csvRow(["TỔNG QUAN"]),
      csvRow(["Chỉ số", "Giá trị"]),
      csvRow(["Tổng sản phẩm", totalProducts]),
      csvRow(["Tổng lô hàng", totalBatches]),
      csvRow(["Tổng mã định danh", totalCodes]),
      csvRow(["Lượt quét trong kỳ", totalScans]),
      csvRow(["Lượt quét nghi vấn/giả", suspectScans]),
      csvRow(["Tỷ lệ nghi giả", fakeRate]),
      csvRow(["Cảnh báo mở", openAlerts]),
      "",
      csvRow(["NHẬT KÝ HỆ THỐNG"]),
      csvRow(["Thời gian", "Người dùng", "Vai trò", "IP", "Trạng thái", "Hành động"]),
      ...logs.map(log => csvRow([log.time.toISOString(), log.user, log.role, log.ip, log.status, log.action])),
      "",
      csvRow(["CẢNH BÁO / BÁO CÁO"]),
      csvRow(["ID", "Thời gian", "Loại", "Mức độ", "Trạng thái", "UID", "Mô tả"]),
      ...alerts.map(alert => csvRow([
        alert.id,
        alert.thoiGian.toISOString(),
        alert.loai,
        alert.mucDo,
        alert.trangThai,
        alert.uid || "",
        sanitizeDescription(alert.moTa),
      ])),
      "",
      csvRow(["TOP MÃ ĐƯỢC QUÉT"]),
      csvRow(["UID", "Serial", "Trạng thái", "Số lần quét", "Mã lô", "Sản phẩm", "SKU"]),
      ...topCodes.map(code => csvRow([
        code.uid,
        code.serialNumber || "",
        code.trangThai,
        code.soLanQuet,
        code.loHang.maLo,
        code.loHang.sanPham.ten,
        code.loHang.sanPham.maSKU,
      ])),
    ];

    return new NextResponse(Buffer.from(`\uFEFF${rows.join("\n")}`, "utf-8"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="AIVeriGoods_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể xuất báo cáo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
