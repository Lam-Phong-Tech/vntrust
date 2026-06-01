import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const chartPeriod = searchParams.get("chartPeriod") || "1"; // "1"=day | "7"=week | "30"=month
    const userRole = searchParams.get("role") || "";
    const doanhNghiepId = searchParams.get("doanhNghiepId") || "";

    // Admin sees all scans. Partners see only scans for their own products.
    let baseScanWhere: any = {};

    // Consumer không có sản phẩm → luôn trả về 0
    if (userRole === "consumer") {
      return NextResponse.json({
        totalAuths: 0, prevPeriodAuths: 0, preventions: 0,
        todayAuths: 0, chartData: [], chartLabels: [],
        recentLogs: [], recentNode: { loc: "Chưa có dữ liệu", lat: "16.0", lng: "108.0" }
      });
    }

    if (userRole && userRole !== "admin" && doanhNghiepId) {
      // Filter only scans whose uid belongs to a product of this company
      const uidsOfCompany = await prisma.maDinhDanh.findMany({
        where: {
          loHang: {
            sanPham: { doanhNghiepId }
          }
        },
        select: { uid: true }
      });
      const uidList = uidsOfCompany.map((u: { uid: string }) => u.uid);
      if (uidList.length === 0) {
        // New account with no products → return zeros
        return NextResponse.json({
          totalAuths: 0, prevPeriodAuths: 0, preventions: 0,
          todayAuths: 0, chartData: [], chartLabels: [],
          recentLogs: [], recentNode: { loc: "Chưa có dữ liệu", lat: "16.0", lng: "108.0" }
        });
      }
      baseScanWhere = { uid: { in: uidList } };
    } else if (userRole && userRole !== "admin" && !doanhNghiepId) {
      // Role không phải admin nhưng không có doanhNghiepId → trả về 0
      return NextResponse.json({
        totalAuths: 0, prevPeriodAuths: 0, preventions: 0,
        todayAuths: 0, chartData: [], chartLabels: [],
        recentLogs: [], recentNode: { loc: "Chưa có dữ liệu", lat: "16.0", lng: "108.0" }
      });
    }
    // Admin: baseScanWhere = {} → lấy tất cả

    const now = new Date();
    const dateLimit = new Date(now);
    dateLimit.setDate(dateLimit.getDate() - days);

    // Previous same-length period (for growth rate)
    const prevDateStart = new Date(dateLimit);
    prevDateStart.setDate(prevDateStart.getDate() - days);

    // Current period auths
    const totalAuths = await prisma.luotQuet.count({
      where: { thoiGian: { gte: dateLimit }, ...baseScanWhere },
    });

    // Previous period auths (growth comparison)
    const prevPeriodAuths = await prisma.luotQuet.count({
      where: { thoiGian: { gte: prevDateStart, lt: dateLimit }, ...baseScanWhere },
    });

    // Fake/suspect preventions from real luotQuet data
    const preventions = await prisma.luotQuet.count({
      where: {
        thoiGian: { gte: dateLimit },
        ketQua: { in: ["fake", "suspect"] },
        ...baseScanWhere
      },
    });

    // Today's auths
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayAuths = await prisma.luotQuet.count({
      where: { thoiGian: { gte: todayStart }, ...baseScanWhere },
    });

    // ── Chart data ──────────────────────────────────────────────
    let chartData: number[] = [];
    let chartLabels: string[] = [];

    if (chartPeriod === "1") {
      // Last 24 hours — 24 hourly buckets
      const NUM = 24;
      chartData = Array(NUM).fill(0);
      chartLabels = Array.from({ length: NUM }, (_, i) => {
        const h = new Date(now.getTime() - (NUM - 1 - i) * 3600_000);
        return `${h.getHours()}h`;
      });
      const start = new Date(now.getTime() - NUM * 3600_000);
      const scans = await prisma.luotQuet.findMany({
        where: { thoiGian: { gte: start }, ...baseScanWhere },
        select: { thoiGian: true },
      });
      scans.forEach((s) => {
        const diffH = Math.floor((now.getTime() - s.thoiGian.getTime()) / 3600_000);
        if (diffH >= 0 && diffH < NUM) chartData[NUM - 1 - diffH]++;
      });
    } else if (chartPeriod === "7") {
      // Last 7 days — 7 daily buckets
      const NUM = 7;
      chartData = Array(NUM).fill(0);
      chartLabels = Array.from({ length: NUM }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (NUM - 1 - i));
        return `${d.getDate()}/${d.getMonth() + 1}`;
      });
      const start = new Date(now);
      start.setDate(start.getDate() - NUM);
      start.setHours(0, 0, 0, 0);
      const scans = await prisma.luotQuet.findMany({
        where: { thoiGian: { gte: start }, ...baseScanWhere },
        select: { thoiGian: true },
      });
      scans.forEach((s) => {
        const diffD = Math.floor((now.getTime() - s.thoiGian.getTime()) / 86400_000);
        if (diffD >= 0 && diffD < NUM) chartData[NUM - 1 - diffD]++;
      });
    } else {
      // Last 30 days — 10 buckets of 3 days each
      const NUM = 10;
      const GROUP = 3;
      chartData = Array(NUM).fill(0);
      chartLabels = Array.from({ length: NUM }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (NUM - 1 - i) * GROUP);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      });
      const start = new Date(now);
      start.setDate(start.getDate() - NUM * GROUP);
      const scans = await prisma.luotQuet.findMany({
        where: { thoiGian: { gte: start }, ...baseScanWhere },
        select: { thoiGian: true },
      });
      scans.forEach((s) => {
        const diffD = Math.floor((now.getTime() - s.thoiGian.getTime()) / 86400_000);
        const idx = NUM - 1 - Math.floor(diffD / GROUP);
        if (idx >= 0 && idx < NUM) chartData[idx]++;
      });
    }

    // Recent Logs for live feed (Real Data)
    const recentScans = await prisma.luotQuet.findMany({
      where: baseScanWhere,
      orderBy: { thoiGian: 'desc' },
      take: 10,
      include: {
        maDinhDanh: {
          include: {
            loHang: {
              include: {
                sanPham: true
              }
            }
          }
        }
      }
    });

    const recentLogs = recentScans.map((scan) => {
      const isError = scan.ketQua === 'fake' || scan.ketQua === 'suspect';
      const type = isError ? "error" : "success";

      // Lấy IP thật từ diaChi_IP (format: "Thành phố - IP" hoặc chỉ IP)
      const rawAddr = scan.diaChi_IP || 'Unknown';
      const ipParts = rawAddr.split(' - ');
      const ipAddress = ipParts.length > 1 ? ipParts[1].trim() : rawAddr;
      const cityName = ipParts.length > 1 ? ipParts[0].trim() : rawAddr;

      let titleKey = "";
      let titleSuffix = "";
      let desc = "";
      let timeKey = "sc_log_just_now";

      const diffMins = Math.floor((now.getTime() - scan.thoiGian.getTime()) / 60000);
      const timeSuffix = diffMins === 0 ? "" : `${diffMins} `;
      if (diffMins > 0) timeKey = "sc_log_mins_ago";

      if (isError) {
        titleKey = "sc_log_fraud";
        desc = `sc_log_found_at:${cityName} - ${ipAddress}|sc_log_sig_viol:${scan.uid.substring(0, 8)}`;
      } else {
        titleKey = "sc_log_auth_cert";
        titleSuffix = ` - ${scan.uid.substring(0, 8).toUpperCase()}`;
        const productName = scan.maDinhDanh?.loHang?.sanPham?.ten || 'Sản phẩm';
        // Admin hiển thị IP người quét; NSX/NSD hiển thị tên sản phẩm
        desc = `${productName} | Chữ Ký: ${scan.uid.substring(0, 8)} | IP: ${ipAddress} | ${cityName}`;
      }

      return {
        id: scan.id,
        type,
        titleKey,
        titleSuffix,
        desc,
        timeKey,
        timeSuffix,
        ipAddress,
        cityName,
      };
    });

    let recentNode = {
      loc: "Hà Nội",
      lat: "21.0285",
      lng: "105.8048"
    };

    if (recentScans.length > 0) {
      const latest = recentScans[0];
      recentNode = {
        loc: latest.diaChi_IP || "Unknown",
        lat: latest.lat?.toFixed(4) || "21.0285",
        lng: latest.lng?.toFixed(4) || "105.8048"
      };
    }

    return NextResponse.json({
      totalAuths,
      prevPeriodAuths,
      preventions,
      todayAuths,
      chartData,
      chartLabels,
      recentLogs,
      recentNode
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      totalAuths: 0, prevPeriodAuths: 0, preventions: 0,
      todayAuths: 0, chartData: [], chartLabels: [],
    });
  }
}
