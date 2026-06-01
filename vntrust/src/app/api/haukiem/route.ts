import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { evaluateHauKiem, RULE_ENGINE_VERSION } from "@/lib/hauKiemRule";

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
    // P1a — Auth + sub-role check
    if (!userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'manufacturer', 'importer'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const vaiTroCty = cookieStore.get('vaiTroCty')?.value;
    if (userRole !== 'admin' && vaiTroCty && !['company_admin', 'staff_input'].includes(vaiTroCty)) {
      return NextResponse.json({ error: `Forbidden — vai trò nội bộ "${vaiTroCty}" không có quyền submit kết quả hậu kiểm` }, { status: 403 });
    }

    const body = await request.json();
    const {
      doiTuongLayMau,
      coSoPhanTich,
      ngayLayMau,
      ngayPhanTich,
      ketQua: ketQuaInput,
      chiTieuVuotNguong: chiTieuVuotNguongInput,
      chiTieuPhanTich, // NEW: array | string JSON [{tenChiTieu, giaTri, donVi}]
      fileDinhKem,
      ghiChu,
      sanPhamId,
      loHangId,
    } = body;

    // FR-HK-RULE: Nếu client gửi chiTieuPhanTich → chạy rule engine để
    // tự suy ra ketQua + chiTieuVuotNguong. Nếu không gửi → giữ giá trị nhập tay.
    let ketQua = ketQuaInput;
    let chiTieuVuotNguong = chiTieuVuotNguongInput;
    let ruleEngineVersionUsed: string | null = null;
    let ruleEngineSummary: string | null = null;

    let chiTieuArr: any[] = [];
    if (chiTieuPhanTich) {
      try {
        chiTieuArr = typeof chiTieuPhanTich === 'string' ? JSON.parse(chiTieuPhanTich) : chiTieuPhanTich;
        if (!Array.isArray(chiTieuArr)) chiTieuArr = [];
      } catch {
        chiTieuArr = [];
      }
    }

    if (chiTieuArr.length > 0 && sanPhamId) {
      // Lấy nhóm sản phẩm để rule engine biết chuẩn cần so sánh
      const sp = await prisma.sanPham.findUnique({
        where: { id: sanPhamId },
        select: { nhomSanPham: true },
      });
      const result = await evaluateHauKiem(chiTieuArr, sp?.nhomSanPham || null);
      ketQua = result.ketQua;
      chiTieuVuotNguong = result.chiTieuVuotNguong;
      ruleEngineVersionUsed = RULE_ENGINE_VERSION;
      ruleEngineSummary = `Đã so sánh ${result.daSoSanh}/${chiTieuArr.length} chỉ tiêu với tiêu chuẩn (${result.viPham.length} vi phạm, ${result.khongCoChuan} không có chuẩn)`;
    }

    const newHauKiem = await prisma.ketQuaHauKiem.create({
      data: {
        doiTuongLayMau,
        coSoPhanTich,
        ngayLayMau: new Date(ngayLayMau),
        ngayPhanTich: new Date(ngayPhanTich),
        ketQua: ketQua || 'dambao',
        chiTieuVuotNguong: chiTieuVuotNguong || null,
        chiTieuPhanTich: chiTieuArr.length > 0 ? JSON.stringify(chiTieuArr) : null,
        ruleEngineVersion: ruleEngineVersionUsed,
        fileDinhKem,
        ghiChu: ruleEngineSummary
          ? (ghiChu ? `${ghiChu}\n\n[Rule Engine ${RULE_ENGINE_VERSION}] ${ruleEngineSummary}` : `[Rule Engine ${RULE_ENGINE_VERSION}] ${ruleEngineSummary}`)
          : ghiChu,
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

    return NextResponse.json({
      ...newHauKiem,
      ruleEngine: ruleEngineVersionUsed ? { version: ruleEngineVersionUsed, summary: ruleEngineSummary } : null,
    });
  } catch (error: any) {
    console.error("POST /api/haukiem create error:", error);
    return NextResponse.json({ error: error?.message || "Lỗi Server" }, { status: 500 });
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
