import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertSystemApproval } from "@/lib/systemApproval";

const FAKE_TEST_UID = "VNTRUST-FAKE-UID-TEST";

export async function GET(req: NextRequest) {
  try {
    const existing = await prisma.doanhNghiep.findFirst();
    if (existing) {
      // Dọn dẹp DB nếu muốn (ở đây mình giữ nguyên và tạo thêm nếu cần)
      // return NextResponse.json({ message: "DB already seeded", doanhNghiep: existing });
      await prisma.luotQuet.deleteMany({});
      await prisma.canhBao.deleteMany({});
      await prisma.maDinhDanh.deleteMany({});
      await prisma.chungNhan.deleteMany({});
      await prisma.loHang.deleteMany({});
      await prisma.sanPham.deleteMany({});
      await prisma.doanhNghiep.deleteMany({});
    }

    const doanhNghiep = await prisma.doanhNghiep.create({
      data: {
        maSoThue: "0123456789",
        ten: "Tổng Công ty Dược phẩm và Y tế AI VeriGoods Phú Mỹ",
        diaChi: "Tòa nhà Bitexco, Q1, TP.HCM",
        loai: "NSX",
        trangThai: "verified",
      }
    });

    const sanPham = await prisma.sanPham.create({
      data: {
        maSKU: "SKU-VNTRUST-001",
        ten: "Thực phẩm Bảo vệ sức khỏe Nattokinase Premium",
        moTa: "Viên uống hỗ trợ tim mạch với nguồn gốc nguyên liệu đạt chuẩn GlobalGAP, nhập khẩu 100% từ Nhật Bản.",
        doanhNghiepId: doanhNghiep.id,
        chungNhans: {
          create: [
            {
              loai: "ISO",
              soChungNhan: "ISO 9001:2015",
              toChucCap: "Bureau Veritas",
              ngayCap: new Date("2023-01-01"),
              ngayHetHan: new Date("2026-01-01"),
            },
            {
              loai: "FDA",
              soChungNhan: "FDA US-FDA-2023",
              toChucCap: "FDA United States",
              ngayCap: new Date("2023-05-15"),
              ngayHetHan: new Date("2025-05-15"),
            }
          ]
        }
      }
    });

    const loHang = await prisma.loHang.create({
      data: {
        maLo: "BATCH-NTA-2024",
        ngaySanXuat: new Date("2024-02-10"),
        hanDung: new Date("2027-02-10"),
        soLuong: 1000,
        sanPhamId: sanPham.id,
      }
    });

    // Tạo UID Test (thường là mã UUID dài) và SerialNumber (số ngắn dùng trên mã vạch EAN)
    const ma1 = await prisma.maDinhDanh.create({
      data: {
        uid: "a1b2c3d4",
        serialNumber: "8935049501234", // Chuẩn barcode giả định EAN-13
        loai: "QR",
        loHangId: loHang.id,
      }
    });
    const productApproval = await upsertSystemApproval({
      target: "product",
      id: sanPham.id,
      status: "approved",
      note: "Seed test product approved.",
      reviewer: "VNTrust Seed",
    });
    const batchApproval = await upsertSystemApproval({
      target: "batch",
      id: loHang.id,
      status: "approved",
      note: "Seed test batch approved.",
      reviewer: "VNTrust Seed",
    });

    const fakeTest = {
      uid: FAKE_TEST_UID,
      expectedStatus: "fake",
      verifyUrl: `/api/verify/${encodeURIComponent(FAKE_TEST_UID)}`,
      checked: false,
      status: null as string | null,
      alertCreated: false,
    };

    if (req.nextUrl.searchParams.get("selfTest") === "1") {
      const res = await fetch(new URL(fakeTest.verifyUrl, req.url), { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      fakeTest.checked = true;
      fakeTest.status = data?.status || null;
      fakeTest.alertCreated = Boolean(await prisma.canhBao.findFirst({
        where: { uid: FAKE_TEST_UID, loai: "FAKE_QR_SCANNED" },
        select: { id: true },
      }));
    }

    return NextResponse.json({
      message: "Seed successful with approved product/batch, barcode and fake UID test data",
      data: { doanhNghiep, sanPham, loHang, ma1, productApproval, batchApproval },
      tests: {
        genuine: {
          uid: ma1.uid,
          serialNumber: ma1.serialNumber,
          expectedStatus: "genuine",
          verifyUrl: `/api/verify/${ma1.uid}`,
          barcodeVerifyUrl: `/api/verify/${ma1.serialNumber}`,
        },
        fake: fakeTest,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
