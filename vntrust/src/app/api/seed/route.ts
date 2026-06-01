import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

// B-05 Fix: Chỉ admin + chỉ dev mode
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const cookieStore = await cookies();
  const userRole = cookieStore.get("userRole")?.value;
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
  }

  try {
    // ── 1. Dọn sạch DB ────────────────────────────────────────────────────
    await prisma.luotQuet.deleteMany({});
    await prisma.canhBao.deleteMany({});
    await prisma.khoHang.deleteMany({});
    await prisma.ketQuaHauKiem.deleteMany({});
    await prisma.chungNhan.deleteMany({});
    await prisma.maDinhDanh.deleteMany({});
    await prisma.loHang.deleteMany({});
    await prisma.sanPham.deleteMany({});
    await prisma.doanhNghiep.deleteMany({});
    // Giữ NguoiDung và NhatKy để không mất tài khoản đã tạo

    // ── 2. Tạo Doanh nghiệp ──────────────────────────────────────────────
    const dn1 = await prisma.doanhNghiep.create({
      data: {
        maSoThue: "0123456789",
        ten: "Tổng Công ty Dược phẩm VNTrust Phú Mỹ",
        diaChi: "Tòa nhà Bitexco, Q1, TP.HCM",
        loai: "NSX",
        trangThai: "verified",
        email: "contact@vntrust-pharma.vn",
        hotline: "1800-6789",
        nguoiDaiDien: "Nguyễn Văn An",
      },
    });

    const dn2 = await prisma.doanhNghiep.create({
      data: {
        maSoThue: "0987654321",
        ten: "Công ty TNHH Nhập khẩu Thực phẩm Sạch Việt",
        diaChi: "KCN Sóng Thần, Bình Dương",
        loai: "NNK",
        trangThai: "verified",
        email: "info@sach-viet.com.vn",
        hotline: "1900-8888",
        nguoiDaiDien: "Trần Thị Bình",
      },
    });

    const dn3 = await prisma.doanhNghiep.create({
      data: {
        maSoThue: "0111222333",
        ten: "Công ty Mỹ phẩm Thiên Nhiên Xanh",
        diaChi: "12 Lê Thánh Tôn, Q3, TP.HCM",
        loai: "NSX",
        trangThai: "pending",
        email: "info@thiennhienxanh.vn",
        hotline: "0901-234-567",
        nguoiDaiDien: "Lê Minh Cường",
      },
    });

    // ── 3. Sản phẩm & Lô hàng ────────────────────────────────────────────
    const sp1 = await prisma.sanPham.create({
      data: {
        maSKU: "SKU-VNTRUST-001",
        ten: "Thực phẩm BVSK Nattokinase Premium",
        moTa: "Viên uống hỗ trợ tim mạch, nhập khẩu 100% từ Nhật Bản",
        nhomSanPham: "Thực phẩm",
        phanLoai2: "Thực phẩm chức năng",
        khoiLuong: "60 viên",
        nuocSanXuat: "Nhật Bản",
        doanhNghiepId: dn1.id,
        chungNhans: {
          create: [
            { loai: "ISO", soChungNhan: "ISO 9001:2015", toChucCap: "Bureau Veritas", ngayCap: new Date("2023-01-01"), ngayHetHan: new Date("2026-01-01") },
            { loai: "HACCP", soChungNhan: "HACCP-VN-2023", toChucCap: "SGS Vietnam", ngayCap: new Date("2023-03-15"), ngayHetHan: new Date("2026-03-15") },
          ],
        },
      },
    });

    const sp2 = await prisma.sanPham.create({
      data: {
        maSKU: "SKU-SACH-001",
        ten: "Nước mắm Phú Quốc 35N - Chai 500ml",
        moTa: "Nước mắm truyền thống cá cơm Phú Quốc, nhập khẩu chính hãng",
        nhomSanPham: "Thực phẩm",
        phanLoai2: "Gia vị",
        khoiLuong: "500ml",
        nuocSanXuat: "Việt Nam",
        doanhNghiepId: dn2.id,
        chungNhans: {
          create: [
            { loai: "ISO", soChungNhan: "ISO 22000:2018", toChucCap: "Intertek", ngayCap: new Date("2024-01-01"), ngayHetHan: new Date("2027-01-01") },
          ],
        },
      },
    });

    const sp3 = await prisma.sanPham.create({
      data: {
        maSKU: "SKU-TNX-001",
        ten: "Kem dưỡng da Thiên Nhiên Xanh SPF50",
        moTa: "Kem dưỡng da chiết xuất thiên nhiên, chống nắng SPF50",
        nhomSanPham: "Mỹ phẩm",
        phanLoai2: "Chăm sóc da mặt",
        khoiLuong: "50g",
        nuocSanXuat: "Việt Nam",
        doanhNghiepId: dn3.id,
      },
    });

    // ── 4. Lô hàng ────────────────────────────────────────────────────────
    const lo1 = await prisma.loHang.create({
      data: {
        maLo: "BATCH-NTA-2024",
        ngaySanXuat: new Date("2024-02-10"),
        hanDung: new Date("2027-02-10"),
        soLuong: 500,
        trangThai: "active",
        khuVucPhanPhoi: "Miền Nam",
        sanPhamId: sp1.id,
      },
    });

    const lo2 = await prisma.loHang.create({
      data: {
        maLo: "BATCH-NMM-2025",
        ngaySanXuat: new Date("2025-01-15"),
        hanDung: new Date("2027-01-15"),
        soLuong: 1000,
        trangThai: "active",
        khuVucPhanPhoi: "Toàn quốc",
        soToKhaiHQ: "TK-2025-HCM-001234",
        ngayThongQuan: new Date("2025-01-20"),
        cuaKhau: "Cảng Cát Lái",
        hsCode: "2103.90.90",
        nuocXuatXu: "Việt Nam",
        sanPhamId: sp2.id,
      },
    });

    const lo3 = await prisma.loHang.create({
      data: {
        maLo: "BATCH-TNX-2025",
        ngaySanXuat: new Date("2025-03-01"),
        hanDung: new Date("2027-03-01"),
        soLuong: 300,
        trangThai: "active",
        khuVucPhanPhoi: "Miền Nam",
        sanPhamId: sp3.id,
      },
    });

    // Lô hàng HẾT HẠN (để test expired status)
    const lo_expired = await prisma.loHang.create({
      data: {
        maLo: "BATCH-EXPIRED-2023",
        ngaySanXuat: new Date("2021-06-01"),
        hanDung: new Date("2023-06-01"),
        soLuong: 100,
        trangThai: "active",
        sanPhamId: sp1.id,
      },
    });

    // ── 5. Mã định danh (QR/Serial) ───────────────────────────────────────
    // Seed data cố định để dễ test
    const ma1 = await prisma.maDinhDanh.create({
      data: { uid: "a1b2c3d4", serialNumber: "8935049501234", loai: "QR", loHangId: lo1.id },
    });
    const ma2 = await prisma.maDinhDanh.create({
      data: { uid: "e5f6g7h8", serialNumber: "8935049501235", loai: "QR", loHangId: lo2.id },
    });
    const ma3 = await prisma.maDinhDanh.create({
      data: { uid: "expired-uid-001", serialNumber: "8935049509999", loai: "QR", loHangId: lo_expired.id },
    });

    // Batch UIDs ngẫu nhiên
    const batchUids1 = Array.from({ length: 50 }, () => ({ uid: randomUUID(), loai: "QR", loHangId: lo1.id }));
    const batchUids2 = Array.from({ length: 100 }, () => ({ uid: randomUUID(), loai: "QR", loHangId: lo2.id }));
    const batchUids3 = Array.from({ length: 30 }, () => ({ uid: randomUUID(), loai: "QR", loHangId: lo3.id }));
    await prisma.maDinhDanh.createMany({ data: [...batchUids1, ...batchUids2, ...batchUids3] });

    // ── 6. LuotQuet (Lịch sử quét) — để analytics có data ────────────────
    const vietNameLocations = [
      { city: "Hà Nội", lat: 21.0285, lng: 105.8048 },
      { city: "TP.HCM", lat: 10.8231, lng: 106.6297 },
      { city: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
      { city: "Cần Thơ", lat: 10.0452, lng: 105.7469 },
      { city: "Hải Phòng", lat: 20.8449, lng: 106.6881 },
    ];

    const scanResults = ["genuine", "genuine", "genuine", "genuine", "genuine", "suspect", "fake"];
    const allUids = [ma1.uid, ma2.uid, ma3.uid, ...batchUids1.slice(0, 10).map(u => u.uid)];
    const luotQuets: any[] = [];

    // Tạo 90 ngày lịch sử quét
    for (let dayBack = 89; dayBack >= 0; dayBack--) {
      const date = new Date();
      date.setDate(date.getDate() - dayBack);

      // Số lần quét tăng dần theo thời gian (realistic growth)
      const scansThisDay = Math.floor(5 + Math.random() * 20 + (89 - dayBack) * 0.5);

      for (let s = 0; s < scansThisDay; s++) {
        const loc = vietNameLocations[Math.floor(Math.random() * vietNameLocations.length)];
        const uid = allUids[Math.floor(Math.random() * allUids.length)];
        const result = scanResults[Math.floor(Math.random() * scanResults.length)];
        const scanTime = new Date(date.getTime() + Math.random() * 86400000);

        luotQuets.push({
          uid,
          thoiGian: scanTime,
          diaChi_IP: `113.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          lat: loc.lat + (Math.random() - 0.5) * 0.5,
          lng: loc.lng + (Math.random() - 0.5) * 0.5,
          ketQua: result,
          thietBi: Math.random() > 0.5 ? "Android" : "iOS",
        });
      }
    }
    await prisma.luotQuet.createMany({ data: luotQuets });

    // ── 7. CanhBao ────────────────────────────────────────────────────────
    await prisma.canhBao.createMany({
      data: [
        { loai: "SCAN_ANOMALY", mucDo: "high", moTa: "Mã a1b2c3d4 bị quét 12 lần trong 1 giờ tại Hà Nội — nghi ngờ làm giả", uid: "a1b2c3d4", trangThai: "open" },
        { loai: "FAKE_QR_SCANNED", mucDo: "high", moTa: "Quét mã QR không hợp lệ: FAKE-ABC123 tại TP.HCM", uid: "FAKE-ABC123", trangThai: "reviewing" },
        { loai: "NGUOI_DUNG_BAO_CAO", mucDo: "medium", moTa: "[Thực phẩm] Serial: 8935049501234 | Vị trí: Chợ Bến Thành | Mô tả: Hộp bị rách, màu sắc khác hàng thật", uid: "8935049501234", trangThai: "open" },
        { loai: "SCAN_ANOMALY", mucDo: "low", moTa: "Mã e5f6g7h8 quét tại Đà Nẵng nhưng lô hàng phân phối Miền Nam — kiểm tra phân phối lại", uid: "e5f6g7h8", trangThai: "open" },
        { loai: "FAKE_QR_SCANNED", mucDo: "medium", moTa: "Phát hiện 3 mã QR giả tại chợ đầu mối Long An trong 24h", trangThai: "closed" },
      ],
    });

    // ── 8. KhoHang (Nhật ký nhập/xuất kho) ───────────────────────────────
    await prisma.khoHang.createMany({
      data: [
        { loaiGD: "NHAP_KHO", soLuong: 500, viTri: "Kho A - Bình Dương", lat: 10.9808, lng: 106.6517, nguoiThuc: "Nguyễn Văn An", ghiChu: "Nhập kho lô Nattokinase từ Nhật", thoiGian: new Date("2024-02-12"), loHangId: lo1.id },
        { loaiGD: "XUAT_KHO", soLuong: 200, viTri: "Kho A - Bình Dương", lat: 10.9808, lng: 106.6517, nguoiThuc: "Trần Thị Bình", ghiChu: "Xuất cho đại lý TP.HCM", thoiGian: new Date("2024-03-01"), loHangId: lo1.id },
        { loaiGD: "NHAP_KHO", soLuong: 1000, viTri: "Kho Cảng Cát Lái", lat: 10.7643, lng: 106.7572, nguoiThuc: "Lê Minh Cường", ghiChu: "Nhập từ cảng sau thông quan", thoiGian: new Date("2025-01-21"), loHangId: lo2.id },
        { loaiGD: "CHUYEN_KHO", soLuong: 300, viTri: "Kho B - Hà Nội", lat: 21.0285, lng: 105.8048, nguoiThuc: "Nguyễn Văn An", ghiChu: "Chuyển ra kho Hà Nội phân phối miền Bắc", thoiGian: new Date("2025-02-15"), loHangId: lo2.id },
        { loaiGD: "NHAP_KHO", soLuong: 300, viTri: "Kho Mỹ phẩm - Q7 HCM", lat: 10.7321, lng: 106.7224, nguoiThuc: "Lê Minh Cường", ghiChu: "Nhập lô kem dưỡng da mới", thoiGian: new Date("2025-03-02"), loHangId: lo3.id },
      ],
    });

    // ── 9. KetQuaHauKiem ──────────────────────────────────────────────────
    await prisma.ketQuaHauKiem.createMany({
      data: [
        {
          doiTuongLayMau: "doanhnghiep",
          coSoPhanTich: "Viện Kiểm nghiệm An toàn Vệ sinh Thực phẩm Quốc gia",
          ngayLayMau: new Date("2025-01-10"),
          ngayPhanTich: new Date("2025-01-20"),
          ketQua: "dambao",
          ghiChu: "Tất cả 12 chỉ tiêu đều đạt tiêu chuẩn QCVN",
          trangThaiXacMinh: "verified",
          sanPhamId: sp1.id,
          loHangId: lo1.id,
        },
        {
          doiTuongLayMau: "nguoitieudung",
          coSoPhanTich: "Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3",
          ngayLayMau: new Date("2025-02-05"),
          ngayPhanTich: new Date("2025-02-15"),
          ketQua: "khongdambao",
          chiTieuVuotNguong: "Độ muối: 37% (ngưỡng cho phép: 35%); Histamine: 210mg/kg (ngưỡng: 200mg/kg)",
          ghiChu: "Mẫu lấy tại thị trường không đạt 2 chỉ tiêu",
          trangThaiXacMinh: "verified",
          sanPhamId: sp2.id,
          loHangId: lo2.id,
        },
        {
          doiTuongLayMau: "doituongthu3",
          coSoPhanTich: "Chi cục QLTT TP.HCM",
          ngayLayMau: new Date("2025-03-10"),
          ngayPhanTich: new Date("2025-03-20"),
          ketQua: "dambao",
          ghiChu: "Kiểm tra định kỳ, đạt tất cả chỉ tiêu",
          trangThaiXacMinh: "pending",
          sanPhamId: sp3.id,
          loHangId: lo3.id,
        },
      ],
    });

    // ── Cập nhật soLanQuet cho các mã đã quét ─────────────────────────────
    await prisma.maDinhDanh.update({ where: { uid: ma1.uid }, data: { soLanQuet: 12 } });
    await prisma.maDinhDanh.update({ where: { uid: ma2.uid }, data: { soLanQuet: 3 } });
    await prisma.maDinhDanh.update({ where: { uid: ma3.uid }, data: { soLanQuet: 1 } });

    return NextResponse.json({
      message: "✅ Seed thành công với đầy đủ dữ liệu thực tế",
      summary: {
        doanhNghiep: 3,
        sanPham: 3,
        loHang: 4,
        maDinhDanh: 183 + 3,
        luotQuet: luotQuets.length,
        canhBao: 5,
        khoHang: 5,
        ketQuaHauKiem: 3,
      },
      testAccounts: {
        admin: "admin@vntrust.vn / Admin@VNTrust2024!",
        nsx:   "nsx@vntrust.vn / Mfr@VNTrust2024!",
        nnk:   "nhapkhau@vntrust.vn / Imp@VNTrust2024!",
        consumer: "nguoitieudung@vntrust.vn / Con@VNTrust2024!",
      },
      testUIDs: {
        genuine: "a1b2c3d4 hoặc e5f6g7h8",
        genuine_serial: "8935049501234",
        expired: "expired-uid-001",
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
