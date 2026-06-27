import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getConfigInt } from "@/lib/config";

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const resolvedParams = await params;
  const uid = resolvedParams.uid;

  try {
    let maDinhDanh = await prisma.maDinhDanh.findUnique({
      where: { uid },
      include: {
        loHang: {
          include: {
            chungNhans: { where: { loai: 'SYSTEM_BATCH_APPROVAL' }, orderBy: { ngayDuyet: 'desc' }, take: 1 },
            sanPham: {
              include: {
                doanhNghiep: {
                  include: {
                    chungNhans: { where: { trangThaiDuyet: 'approved' } }
                  }
                },
                chungNhans: { where: { trangThaiDuyet: 'approved' } } // Chỉ trả về CN đã được duyệt
              }
            }
          }
        }
      }
    });

    if (!maDinhDanh) {
      maDinhDanh = await prisma.maDinhDanh.findUnique({
        where: { serialNumber: uid },
        include: {
        loHang: {
          include: {
            chungNhans: { where: { loai: 'SYSTEM_BATCH_APPROVAL' }, orderBy: { ngayDuyet: 'desc' }, take: 1 },
            sanPham: {
              include: {
                  doanhNghiep: {
                    include: {
                      chungNhans: { where: { trangThaiDuyet: 'approved' } }
                    }
                  },
                  chungNhans: { where: { trangThaiDuyet: 'approved' } }
                }
              }
            }
          }
        }
      });
    }

    if (!maDinhDanh) {
      await prisma.canhBao.create({
        data: {
          loai: "FAKE_QR_SCANNED",
          mucDo: "high",
          moTa: `Phát hiện quét mã QR không hợp lệ hoặc giả mạo: ${uid}`,
          uid: uid,
        }
      });
      return NextResponse.json({ status: "fake", message: "Mã không tồn tại trên hệ thống AI VeriGoods. Đây có thể là hàng giả." });
    }

    if (maDinhDanh.trangThai === "fake") {
      return NextResponse.json({ status: "fake", message: "Mã này đã bị gắn cờ là hàng giả." });
    }

    // P2 — UID bị vô hiệu vì DN bị tạm khóa (cascade từ KYC suspended/revoked)
    if (maDinhDanh.trangThai === "suspended") {
      const dn = maDinhDanh.loHang?.sanPham?.doanhNghiep;
      return NextResponse.json({
        status: "suspect",
        message: dn?.trangThai === 'revoked'
          ? `Doanh nghiệp "${dn?.ten}" đã bị thu hồi giấy phép trên AI VeriGoods. Sản phẩm tạm thời không xác thực được.`
          : `Doanh nghiệp "${dn?.ten || ''}" đang tạm khóa trên hệ thống. Vui lòng liên hệ cơ quan có thẩm quyền nếu nghi vấn.`,
        data: maDinhDanh,
      });
    }

    // Check expiry: so sánh giống UI (new Date(hanDung) < new Date())
    const isExpired = new Date(maDinhDanh.loHang.hanDung) < new Date();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

    // Geolocate IP để lấy tọa độ thực
    let lat: number | null = null;
    let lng: number | null = null;
    let cityName = ip;
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(2000) });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        if (geo.latitude && geo.longitude) {
          lat = parseFloat(geo.latitude);
          lng = parseFloat(geo.longitude);
          cityName = geo.city || geo.country_name || ip;
        }
      }
    } catch {
      // Fallback - không có geo thì để null
    }

    // #27: ngưỡng "quét nhiều → nghi ngờ" đọc từ Cấu hình hệ thống (admin chỉnh được), default 10
    const fakeThreshold = await getConfigInt('scan_threshold_fake', 10);
    const batchApproval = maDinhDanh.loHang.chungNhans?.[0];
    const batchApprovalStatus = batchApproval?.trangThaiDuyet || "pending";

    let currentStatus: string;
    if (isExpired) {
      currentStatus = "expired";
    } else if (batchApprovalStatus !== "approved") {
      currentStatus = "suspect";
    } else if (maDinhDanh.soLanQuet >= fakeThreshold) {
      currentStatus = "suspect";
    } else {
      currentStatus = "genuine";
    }

    // Ghi log lượt quét với đầy đủ thông tin
    await prisma.luotQuet.create({
      data: {
        uid: maDinhDanh.uid,
        diaChi_IP: `${cityName} - ${ip}`,
        lat,
        lng,
        ketQua: currentStatus,
        thietBi: req.headers.get("user-agent")?.includes("Android") ? "Android" : "iOS",
      }
    });

    // Tăng số lần quét
    const updatedMa = await prisma.maDinhDanh.update({
      where: { uid: maDinhDanh.uid },
      data: { soLanQuet: { increment: 1 } }
    });

    // Tạo cảnh báo nếu bị quét quá nhiều
    if (updatedMa.soLanQuet >= fakeThreshold && currentStatus === "genuine") {
      currentStatus = "suspect";
      await prisma.canhBao.create({
        data: {
          loai: "SCAN_ANOMALY",
          mucDo: "high",
          moTa: `Mã ${uid} đã bị quét ${updatedMa.soLanQuet} lần — có thể đang bị làm giả.`,
          uid: updatedMa.uid,
        }
      });
    }

    // ── #15: Ghi LỊCH SỬ CÁ NHÂN (LichSuKiemTra) — để trang "Lịch sử kiểm tra của tôi"
    //         hiển thị đúng (trước đây verify chỉ ghi LuotQuet nên history đếm = 0). ──
    const cookieStore = await cookies();
    const nguoiDungId = cookieStore.get('userId')?.value || null;
    const sessionRef = cookieStore.get('sessionToken')?.value || null;
    if (nguoiDungId || sessionRef) {
      const ketQuaMap: Record<string, string> = { genuine: 'verified', suspect: 'warning', expired: 'expired', fake: 'blocked' };
      await prisma.lichSuKiemTra.create({
        data: {
          nguoiDungId: nguoiDungId || null,
          sessionRef: nguoiDungId ? null : sessionRef,
          loaiHanhDong: 'quet_qr',
          uid: maDinhDanh.uid,
          ketQua: ketQuaMap[currentStatus] || 'unknown',
          lat, lng,
        },
      }).catch(() => { /* best-effort, không chặn kết quả quét */ });
    }

    // ── #16: Thông tin lần quét ĐẦU TIÊN để cảnh báo "Mã đã được quét trước đó". ──
    // priorCount = số lần quét TRƯỚC lần này (maDinhDanh.soLanQuet lấy lúc fetch, chưa tăng).
    const priorCount = maDinhDanh.soLanQuet || 0;
    const isRepeat = priorCount > 0;
    let firstScan: { thoiGian: Date; diaChi: string | null } | null = null;
    if (isRepeat) {
      const first = await prisma.luotQuet.findFirst({
        where: { uid: maDinhDanh.uid },
        orderBy: { thoiGian: 'asc' },
        select: { thoiGian: true, diaChi_IP: true },
      });
      if (first) firstScan = { thoiGian: first.thoiGian, diaChi: first.diaChi_IP };
    }

    // ── #28: Thưởng +10 điểm cho lần quét XÁC THỰC sản phẩm chính hãng — mỗi (user, uid)
    //         chỉ 1 lần (chống farm quét lại). Best-effort, không chặn kết quả quét. ──
    if (nguoiDungId && currentStatus === 'genuine') {
      const daThuong = await prisma.rewardHistory.findFirst({
        where: { nguoiDungId, loai: 'quet_ma', moTa: { contains: maDinhDanh.uid } },
        select: { id: true },
      }).catch(() => null);
      if (!daThuong) {
        await prisma.rewardHistory.create({
          data: {
            nguoiDungId,
            loai: 'quet_ma',
            diemThuong: 10,
            moTa: `Quét xác thực sản phẩm chính hãng (${maDinhDanh.uid})`,
          },
        }).catch(() => { /* best-effort */ });
      }
    }

    return NextResponse.json({
      status: currentStatus,
      data: { ...maDinhDanh, soLanQuet: updatedMa.soLanQuet },
      scanCount: updatedMa.soLanQuet,
      isRepeat,
      firstScan,
      approval: {
        batchStatus: batchApprovalStatus,
        note: batchApproval?.ghiChuAdmin || null,
      },
    });
  } catch (error: unknown) {
    console.error("Verification Error:", error);
    return NextResponse.json({ status: "fake", message: "Lỗi hệ thống xác thực. Vui lòng thử lại." }, { status: 500 });
  }
}
