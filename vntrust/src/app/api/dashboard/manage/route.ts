import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const countBy = <T extends string>(items: Array<{ trangThai: T | null }>) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = item.trangThai || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const daysUntil = (value?: Date | string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
};

export async function GET() {
  try {
    const ck = await cookies();
    const userRole = ck.get("userRole")?.value;
    const doanhNghiepId = ck.get("doanhNghiepId")?.value;
    const vaiTroCty = ck.get("vaiTroCty")?.value || "viewer";

    if (!userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["manufacturer", "importer", "admin"].includes(userRole)) {
      return NextResponse.json({ error: "Chỉ tài khoản doanh nghiệp được truy cập trang này" }, { status: 403 });
    }

    let targetDoanhNghiepId = doanhNghiepId;
    if (userRole === "admin" && !targetDoanhNghiepId) {
      const firstCompany = await prisma.doanhNghiep.findFirst({ select: { id: true } });
      targetDoanhNghiepId = firstCompany?.id;
    }
    if (!targetDoanhNghiepId) {
      return NextResponse.json({ error: "Tài khoản chưa gắn doanh nghiệp" }, { status: 403 });
    }

    const company = await prisma.doanhNghiep.findUnique({
      where: { id: targetDoanhNghiepId },
      select: {
        id: true,
        maSoThue: true,
        ten: true,
        diaChi: true,
        nganh_VSIC: true,
        email: true,
        hotline: true,
        nguoiDaiDien: true,
        giayphep_url: true,
        cmnd_url: true,
        loai: true,
        trangThai: true,
        website: true,
        logoUrl: true,
        thuongHieu: true,
        ngayDangKy: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Không tìm thấy doanh nghiệp" }, { status: 404 });
    }

    const productWhere = { doanhNghiepId: targetDoanhNghiepId };
    const batchWhere = { sanPham: { doanhNghiepId: targetDoanhNghiepId } };
    const certificateWhere = {
      OR: [
        { doanhNghiepId: targetDoanhNghiepId },
        { sanPham: { doanhNghiepId: targetDoanhNghiepId } },
        { loHang: { sanPham: { doanhNghiepId: targetDoanhNghiepId } } },
      ],
    };
    const distributionWhere = {
      OR: [
        { nsxDoanhNghiepId: targetDoanhNghiepId },
        { nsdDoanhNghiepId: targetDoanhNghiepId },
      ],
    };

    const [
      products,
      batches,
      certificates,
      licenses,
      distributionOrders,
      members,
      invites,
      recentScans,
      recentAlerts,
    ] = await Promise.all([
      prisma.sanPham.findMany({
        where: productWhere,
        orderBy: { ngayTao: "desc" },
        take: 8,
        select: {
          id: true,
          maSKU: true,
          ten: true,
          GTIN: true,
          nhomSanPham: true,
          hinhAnhUrl: true,
          ngayTao: true,
          _count: { select: { loHangs: true, chungNhans: true } },
        },
      }),
      prisma.loHang.findMany({
        where: batchWhere,
        orderBy: { ngaySanXuat: "desc" },
        take: 12,
        select: {
          id: true,
          maLo: true,
          ngaySanXuat: true,
          hanDung: true,
          soLuong: true,
          trangThai: true,
          khuVucPhanPhoi: true,
          sanPham: { select: { id: true, ten: true, maSKU: true } },
          _count: { select: { uids: true, donChuyenHangs: true } },
        },
      }),
      prisma.chungNhan.findMany({
        where: certificateWhere,
        orderBy: { ngayCap: "desc" },
        take: 10,
        select: {
          id: true,
          loai: true,
          soChungNhan: true,
          ngayCap: true,
          ngayHetHan: true,
          toChucCap: true,
          trangThaiDuyet: true,
          sanPham: { select: { ten: true, maSKU: true } },
          loHang: { select: { maLo: true } },
        },
      }),
      prisma.giayPhepLuuHanh.findMany({
        where: { doanhNghiepId: targetDoanhNghiepId },
        orderBy: { ngayTao: "desc" },
        take: 10,
      }),
      prisma.donChuyenHang.findMany({
        where: distributionWhere,
        orderBy: { capNhat: "desc" },
        take: 10,
        include: {
          loHang: {
            select: {
              maLo: true,
              sanPham: { select: { ten: true, maSKU: true } },
            },
          },
        },
      }),
      prisma.nguoiDung.findMany({
        where: { doanhNghiepId: targetDoanhNghiepId },
        orderBy: [{ vaiTroCty: "asc" }, { email: "asc" }],
        take: 20,
        select: {
          id: true,
          ten: true,
          email: true,
          soDienThoai: true,
          vaiTroCty: true,
          quyenMoiNV: true,
          trangThai: true,
        },
      }),
      prisma.loiMoiNhanVien.findMany({
        where: { doanhNghiepId: targetDoanhNghiepId, trangThai: "pending", ngayHetHan: { gt: new Date() } },
        orderBy: { ngayTao: "desc" },
        take: 10,
        select: { id: true, email: true, vaiTroCty: true, ngayHetHan: true },
      }),
      prisma.luotQuet.findMany({
        where: { maDinhDanh: { loHang: { sanPham: { doanhNghiepId: targetDoanhNghiepId } } } },
        orderBy: { thoiGian: "desc" },
        take: 6,
        select: {
          id: true,
          ketQua: true,
          thoiGian: true,
          uid: true,
          maDinhDanh: {
            select: {
              serialNumber: true,
              loHang: {
                select: {
                  maLo: true,
                  sanPham: { select: { ten: true, maSKU: true } },
                },
              },
            },
          },
        },
      }),
      prisma.canhBao.findMany({
        where: { uid: { not: null } },
        orderBy: { thoiGian: "desc" },
        take: 20,
        select: { id: true, uid: true, mucDo: true, trangThai: true, thoiGian: true, moTa: true },
      }),
    ]);

    const [
      allProductCount,
      allBatchCount,
      certificateCount,
      licenseCount,
      memberCount,
      pendingInviteCount,
      totalUidCount,
      batchStatusRows,
      certificateStatusRows,
      distributionStatusRows,
      memberStatusRows,
    ] = await Promise.all([
      prisma.sanPham.count({ where: productWhere }),
      prisma.loHang.count({ where: batchWhere }),
      prisma.chungNhan.count({ where: certificateWhere }),
      prisma.giayPhepLuuHanh.count({ where: { doanhNghiepId: targetDoanhNghiepId } }),
      prisma.nguoiDung.count({ where: { doanhNghiepId: targetDoanhNghiepId } }),
      prisma.loiMoiNhanVien.count({ where: { doanhNghiepId: targetDoanhNghiepId, trangThai: "pending", ngayHetHan: { gt: new Date() } } }),
      prisma.maDinhDanh.count({ where: { loHang: batchWhere } }),
      prisma.loHang.findMany({ where: batchWhere, select: { trangThai: true } }),
      prisma.chungNhan.findMany({ where: certificateWhere, select: { trangThaiDuyet: true } }),
      prisma.donChuyenHang.findMany({ where: distributionWhere, select: { trangThai: true } }),
      prisma.nguoiDung.findMany({ where: { doanhNghiepId: targetDoanhNghiepId }, select: { trangThai: true } }),
    ]);
    const openAlerts = recentAlerts.filter(alert => alert.trangThai === "open");
    const expiringBatches = batches.filter(batch => {
      const remaining = daysUntil(batch.hanDung);
      return remaining !== null && remaining >= 0 && remaining <= 30;
    });
    const expiringCertificates = certificates.filter(cert => {
      const remaining = daysUntil(cert.ngayHetHan);
      return remaining !== null && remaining >= 0 && remaining <= 30;
    });

    const profileFields = [
      company.ten,
      company.maSoThue,
      company.diaChi,
      company.nguoiDaiDien,
      company.hotline,
      company.email,
      company.nganh_VSIC,
      company.giayphep_url,
      company.cmnd_url,
    ];
    const completedProfileFields = profileFields.filter(Boolean).length;

    return NextResponse.json({
      me: { userRole, vaiTroCty },
      company,
      profileCompletion: {
        completed: completedProfileFields,
        total: profileFields.length,
        percent: Math.round((completedProfileFields / profileFields.length) * 100),
      },
      stats: {
        products: allProductCount,
        batches: allBatchCount,
        certificates: certificateCount,
        licenses: licenseCount,
        totalUid: totalUidCount,
        members: memberCount,
        pendingInvites: pendingInviteCount,
        openAlerts: openAlerts.length,
        expiringBatches: expiringBatches.length,
        expiringCertificates: expiringCertificates.length,
      },
      statusBreakdown: {
        batches: countBy(batchStatusRows),
        certificates: certificateStatusRows.reduce<Record<string, number>>((acc, cert) => {
          const key = cert.trangThaiDuyet || "unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
        distribution: countBy(distributionStatusRows),
        members: countBy(memberStatusRows),
      },
      products,
      batches,
      certificates,
      licenses,
      distributionOrders,
      members,
      invites,
      recentScans,
      recentAlerts: openAlerts.slice(0, 6),
      recommendations: [
        company.trangThai !== "verified" ? "Hoàn thiện hồ sơ KYC để mở khóa nghiệp vụ tem và phân phối chính thức." : null,
        allProductCount === 0 ? "Tạo sản phẩm đầu tiên trước khi sinh lô hàng và mã định danh." : null,
        allBatchCount === 0 && allProductCount > 0 ? "Tạo lô hàng cho sản phẩm đã khai báo." : null,
        certificates.length === 0 ? "Tải chứng nhận ISO/HACCP/GMP/VietGAP hoặc giấy chứng nhận liên quan." : null,
        licenses.length === 0 ? "Bổ sung giấy phép lưu hành nếu sản phẩm thuộc nhóm cần công bố/đăng ký." : null,
        members.length <= 1 ? "Mời nhân sự nội bộ để phân quyền nhập liệu, kho và chỉ xem." : null,
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("Enterprise manage summary error:", error);
    return NextResponse.json({ error: error.message || "Không tải được dữ liệu quản lý doanh nghiệp" }, { status: 500 });
  }
}
