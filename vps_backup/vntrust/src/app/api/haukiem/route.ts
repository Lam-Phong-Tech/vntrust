import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sanPhamId = searchParams.get('sanPhamId');
    const role = searchParams.get('role') || '';
    const doanhNghiepId = searchParams.get('doanhNghiepId') || '';

    let whereClause: any = sanPhamId ? { sanPhamId } : {};

    // Manufacturer/importer chỉ thấy kết quả của sản phẩm thuộc doanh nghiệp mình
    if (role === 'manufacturer' || role === 'importer') {
      whereClause = {
        ...whereClause,
        sanPham: { doanhNghiepId: doanhNghiepId || 'none' }
      };
    }

    const haukiems = await prisma.ketQuaHauKiem.findMany({
      where: whereClause,
      include: {
        sanPham: {
          include: { doanhNghiep: { select: { ten: true } } }
        },
        loHang: true,
      },
      orderBy: { ngayPhanTich: 'desc' },
    });

    return NextResponse.json(haukiems);
  } catch (error) {
    console.error("GET /api/haukiem list error:", error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    const body = await request.json();
    const { 
      doiTuongLayMau, 
      coSoPhanTich, 
      ngayLayMau, 
      ngayPhanTich, 
      ketQua, 
      chiTieuVuotNguong, 
      fileDinhKem, 
      ghiChu, 
      sanPhamId, 
      loHangId 
    } = body;

    const newHauKiem = await prisma.ketQuaHauKiem.create({
      data: {
        doiTuongLayMau,
        coSoPhanTich,
        ngayLayMau: new Date(ngayLayMau),
        ngayPhanTich: new Date(ngayPhanTich),
        ketQua,
        chiTieuVuotNguong,
        fileDinhKem,
        ghiChu,
        sanPhamId: sanPhamId || null,
        loHangId: loHangId || null,
        trangThaiXacMinh: "pending",
      },
      include: { sanPham: true },
    });

    // Tự động tạo cảnh báo nếu kết quả VƯỢT NGƯỠNG
    if (ketQua === 'khongdambao') {
      const tenSP = newHauKiem.sanPham?.ten || 'Không xác định';
      await prisma.canhBao.create({
        data: {
          loai: 'AI_PHAT_HIEN',
          mucDo: 'high',
          moTa: `[HẬU KIỂM] Sản phẩm "${tenSP}" có kết quả phân tích VƯỢT NGƯỠNG tại cơ sở "${coSoPhanTich}". Chi tiết: ${chiTieuVuotNguong || 'Xem chi tiết trong hệ thống hậu kiểm'}`,
          uid: sanPhamId || null,
        }
      });
    }

    return NextResponse.json(newHauKiem);
  } catch (error) {
    console.error("POST /api/haukiem create error:", error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}

// PATCH: Admin xác minh hoặc từ chối kết quả hậu kiểm
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const adminName = cookieStore.get('userName')?.value || 'admin';

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Chỉ Admin mới có quyền xác minh kết quả hậu kiểm' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action, ghiChuAdmin } = body; // action: 'verify' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: 'Thiếu id hoặc action' }, { status: 400 });
    }
    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json({ error: "action phải là 'verify' hoặc 'reject'" }, { status: 400 });
    }

    const hauKiem = await prisma.ketQuaHauKiem.findUnique({
      where: { id },
      include: { sanPham: true },
    });
    if (!hauKiem) return NextResponse.json({ error: 'Không tìm thấy kết quả hậu kiểm' }, { status: 404 });

    const trangThaiMoi = action === 'verify' ? 'verified' : 'rejected';

    const updated = await prisma.ketQuaHauKiem.update({
      where: { id },
      data: {
        trangThaiXacMinh: trangThaiMoi,
        ghiChu: ghiChuAdmin
          ? `${hauKiem.ghiChu || ''}\n[Admin ${action === 'verify' ? 'XÁC MINH' : 'TỪ CHỐI'} — ${new Date().toLocaleDateString('vi-VN')}]: ${ghiChuAdmin}`.trim()
          : hauKiem.ghiChu,
      },
      include: { sanPham: true },
    });

    // Ghi NhatKy
    await prisma.nhatKy.create({
      data: {
        action: `Admin ${action === 'verify' ? 'XÁC MINH ✅' : 'TỪ CHỐI ❌'} kết quả hậu kiểm SP: ${hauKiem.sanPham?.ten ?? 'N/A'} (${hauKiem.coSoPhanTich} — ${new Date(hauKiem.ngayPhanTich).toLocaleDateString('vi-VN')})`,
        user: adminName,
        role: 'admin',
        ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        status: action === 'verify' ? 'success' : 'warning',
      }
    });

    // Nếu admin XÁC MINH kết quả VƯỢT NGƯỠNG → tạo thêm cảnh báo mức cao
    if (action === 'verify' && hauKiem.ketQua === 'khongdambao') {
      await prisma.canhBao.create({
        data: {
          loai: 'AI_PHAT_HIEN',
          mucDo: 'high',
          moTa: `[ADMIN XÁC MINH] Kết quả hậu kiểm VƯỢT NGƯỠNG đã được xác nhận cho sản phẩm "${hauKiem.sanPham?.ten}". Chỉ tiêu: ${hauKiem.chiTieuVuotNguong}. Cần thu hồi hoặc điều tra ngay.`,
          uid: hauKiem.sanPhamId || null,
        }
      });
    }

    return NextResponse.json({ success: true, hauKiem: updated });
  } catch (error: any) {
    console.error("PATCH /api/haukiem error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
