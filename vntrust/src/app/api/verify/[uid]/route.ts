import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const resolvedParams = await params;
  const uid = resolvedParams.uid;

  try {
    let maDinhDanh = await prisma.maDinhDanh.findUnique({
      where: { uid },
      include: {
        loHang: {
          include: {
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

    let currentStatus: string;
    if (isExpired) {
      currentStatus = "expired";
    } else if (maDinhDanh.soLanQuet >= 5) {
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
    if (updatedMa.soLanQuet >= 5 && currentStatus === "genuine") {
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

    return NextResponse.json({
      status: currentStatus,
      data: { ...maDinhDanh, soLanQuet: updatedMa.soLanQuet },
      scanCount: updatedMa.soLanQuet
    });
  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ status: "fake", message: "Lỗi hệ thống xác thực. Vui lòng thử lại." }, { status: 500 });
  }
}
