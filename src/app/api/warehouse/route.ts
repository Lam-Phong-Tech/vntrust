import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// FR-BAT-05: Warehouse transactions (nhập/xuất kho với timestamp)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loHangId = searchParams.get('loHangId');
    const userRole = searchParams.get('role') || '';
    const doanhNghiepId = searchParams.get('doanhNghiepId') || '';

    let finalDnId = doanhNghiepId;
    if (!finalDnId && userRole !== 'admin') {
      const cookieStore = await cookies();
      const userName = cookieStore.get('userName')?.value;
      if (userName) {
        const user = await prisma.nguoiDung.findFirst({ where: { ten: userName } });
        if (user && user.doanhNghiepId) finalDnId = user.doanhNghiepId;
      }
    }

    const where: any = loHangId
      ? { loHangId }
      : userRole === 'admin'
      ? {}
      : { loHang: { sanPham: { doanhNghiepId: finalDnId || 'none' } } };

    const transactions = await prisma.khoHang.findMany({
      where,
      include: {
        loHang: {
          include: { sanPham: { select: { ten: true, maSKU: true } } },
        },
      },
      orderBy: { thoiGian: 'desc' },
      take: 200,
    });

    const totalNhap = await prisma.khoHang.aggregate({
      where: { ...where, loaiGD: 'NHAP_KHO' },
      _sum: { soLuong: true },
    });
    const totalXuat = await prisma.khoHang.aggregate({
      where: { ...where, loaiGD: 'XUAT_KHO' },
      _sum: { soLuong: true },
    });

    return NextResponse.json({
      transactions,
      stats: {
        totalNhap: totalNhap._sum.soLuong || 0,
        totalXuat: totalXuat._sum.soLuong || 0,
        tonKho: (totalNhap._sum.soLuong || 0) - (totalXuat._sum.soLuong || 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;
    const userName = cookieStore.get('userName')?.value || 'User';

    let finalDnId = doanhNghiepId;
    if (!finalDnId && userRole !== 'admin') {
      const user = await prisma.nguoiDung.findFirst({ where: { ten: userName } });
      if (user && user.doanhNghiepId) finalDnId = user.doanhNghiepId;
    }

    if (!userRole || !['admin', 'manufacturer', 'importer'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { loHangId, loaiGD, soLuong, viTri, lat, lng, ghiChu } = await req.json();

    if (!loHangId || !loaiGD || !soLuong) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: loHangId, loaiGD, soLuong' }, { status: 400 });
    }
    if (!['NHAP_KHO', 'XUAT_KHO', 'CHUYEN_KHO'].includes(loaiGD)) {
      return NextResponse.json({ error: 'Loại giao dịch không hợp lệ' }, { status: 400 });
    }
    if (parseInt(soLuong) <= 0) {
      return NextResponse.json({ error: 'Số lượng phải lớn hơn 0' }, { status: 400 });
    }

    // Verify ownership
    const lo = await prisma.loHang.findUnique({
      where: { id: loHangId },
      include: { sanPham: true },
    });
    if (!lo) return NextResponse.json({ error: 'Không tìm thấy lô hàng' }, { status: 404 });
    if (userRole !== 'admin' && lo.sanPham.doanhNghiepId !== finalDnId) {
      return NextResponse.json({ error: 'Forbidden: Không có quyền với lô này' }, { status: 403 });
    }

    // Create warehouse transaction record
    const transaction = await prisma.khoHang.create({
      data: {
        loaiGD,
        soLuong: parseInt(soLuong),
        viTri: viTri || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        nguoiThuc: userName,
        ghiChu: ghiChu || null,
        loHangId,
      },
    });

    // ── NHAP_KHO: ensure LoHang is active ──────────────────────────────────
    if (loaiGD === 'NHAP_KHO') {
      if (lo.trangThai !== 'active') {
        await prisma.loHang.update({
          where: { id: loHangId },
          data: { trangThai: 'active' },
        });
      }
    }

    // ── XUAT_KHO: auto-create DonChuyenHang → pending_review ──────────
    if (loaiGD === 'XUAT_KHO') {
      const nsxDoanhNghiepId = doanhNghiepId || lo.sanPham.doanhNghiepId;
      await prisma.donChuyenHang.create({
        data: {
          loHangId,
          nsxDoanhNghiepId,
          trangThai: 'pending_review',
          ghiChu: ghiChu ? `[Xuất kho] ${ghiChu}` : '[Xuất kho tự động]',
        },
      });
      // Update batch status
      await prisma.loHang.update({
        where: { id: loHangId },
        data: { trangThai: 'pending_review' },
      });
      // Notify admin for review
      await prisma.thongBao.create({
        data: {
          tieuDe: '📦 Đơn chuyển hàng mới cần duyệt (Từ Xuất kho)',
          noiDung: `Nhà sản xuất đã xuất kho lô hàng ${lo.maLo} (${lo.sanPham?.ten || ''}). Vui lòng kiểm duyệt trước khi chuyển cho nhà phân phối.`,
          loai: 'shipment',
          roleTarget: 'admin',
          daDoc: false,
        },
      });
    }

    // Log to NhatKy
    const loaiLabel = loaiGD === 'NHAP_KHO' ? 'Nhập kho' : loaiGD === 'XUAT_KHO' ? 'Xuất kho' : 'Chuyển kho';
    await prisma.nhatKy.create({
      data: {
        action: `${loaiLabel}: ${parseInt(soLuong).toLocaleString()} sản phẩm từ lô ${lo.maLo}${viTri ? ' tại ' + viTri : ''}`,
        user: userName,
        role: userRole,
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: 'success',
      }
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
