import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
// §V Sprint 7: validate against cert validity rules
import { validateExpiryWithinRule, findValidityRule } from '@/lib/certValidityRules';

export const dynamic = 'force-dynamic';

// GET: List certificates for a company's products  
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;
    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // pending | approved | rejected | all

    const whereClause: any = {};
    // Filter theo trạng thái duyệt nếu có
    if (status && status !== 'all') {
      whereClause.trangThaiDuyet = status;
    }
    // Manufacturer chỉ xem của doanh nghiệp mình
    if (userRole === 'manufacturer') {
      whereClause.sanPham = { doanhNghiepId: doanhNghiepId || 'none' };
    }

    const certs = await prisma.chungNhan.findMany({
      where: whereClause,
      include: {
        sanPham: { select: { ten: true, maSKU: true, doanhNghiep: { select: { ten: true } } } },
        loHang: { select: { maLo: true } },
      },
      orderBy: { ngayCap: 'desc' },
      take: 100,
    });
    return NextResponse.json({ certs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Add a certificate with image upload (ISO, HACCP, GMP, CFS...)
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;
    const vaiTroCty = cookieStore.get('vaiTroCty')?.value;

    if (!userRole || !['admin', 'manufacturer', 'importer'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // P1a — Sub-role guard: chỉ company_admin + staff_input được upload chứng nhận
    if (userRole !== 'admin' && vaiTroCty && !['company_admin', 'staff_input'].includes(vaiTroCty)) {
      return NextResponse.json({ error: `Forbidden — vai trò nội bộ "${vaiTroCty}" không có quyền upload chứng nhận` }, { status: 403 });
    }

    const { loai, soChungNhan, ngayCap, ngayHetHan, toChucCap, hinhAnhUrl, sanPhamId, loHangId } = await req.json();

    // Validate required fields
    if (!loai || !soChungNhan || !ngayCap || !ngayHetHan) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' }, { status: 400 });
    }

    // §V validate ngayHetHan không vượt quá max validity quy định (Sprint 7)
    const validity = validateExpiryWithinRule(loai, new Date(ngayCap), new Date(ngayHetHan));
    if (!validity.ok) {
      return NextResponse.json({
        error: 'Ngày hết hạn vượt quá quy định',
        detail: validity.reason,
        rule: findValidityRule(loai),
      }, { status: 400 });
    }

    if (!['ISO', 'HACCP', 'GMP', 'CFS', 'FDA', 'HALAL', 'ORGANIC', 'VIETGAP', 'GLOBALGAP', 'OTHER'].includes(loai)) {
      return NextResponse.json({ error: 'Loại chứng nhận không hợp lệ' }, { status: 400 });
    }

    if (new Date(ngayCap) > new Date(ngayHetHan)) {
      return NextResponse.json({ error: 'Ngày cấp không được sau ngày hết hạn' }, { status: 400 });
    }

    // Verify ownership if not admin
    if (sanPhamId && userRole !== 'admin') {
      const sp = await prisma.sanPham.findUnique({ where: { id: sanPhamId } });
      if (!sp || sp.doanhNghiepId !== doanhNghiepId) {
        return NextResponse.json({ error: 'Forbidden: Sản phẩm không thuộc doanh nghiệp bạn' }, { status: 403 });
      }
    }

    // Validate URL ảnh nếu có (chỉ cho phép đường dẫn nội bộ)
    if (hinhAnhUrl && !hinhAnhUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'URL ảnh không hợp lệ. Vui lòng upload ảnh qua hệ thống.' }, { status: 400 });
    }

    const cert = await prisma.chungNhan.create({
      data: {
        loai,
        soChungNhan: soChungNhan.trim(),
        ngayCap: new Date(ngayCap),
        ngayHetHan: new Date(ngayHetHan),
        toChucCap: toChucCap || null,
        hinhAnhUrl: hinhAnhUrl || null,
        trangThaiDuyet: 'pending', // Mặc định chờ admin duyệt
        sanPhamId: sanPhamId || null,
        loHangId: loHangId || null,
      },
    });

    await prisma.nhatKy.create({
      data: {
        action: `Thêm chứng nhận ${loai}: ${soChungNhan} — Trạng thái: Chờ duyệt`,
        user: doanhNghiepId || 'Admin',
        role: userRole,
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: 'success',
      }
    });

    return NextResponse.json({ cert }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: Admin phê duyệt hoặc từ chối chứng nhận
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const adminEmail = cookieStore.get('userName')?.value || 'admin';

    // Chỉ admin mới có quyền duyệt
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Chỉ Admin mới có quyền phê duyệt chứng nhận' }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, ghiChuAdmin } = body; // action: 'approve' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: 'Thiếu id và action' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: "action phải là 'approve' hoặc 'reject'" }, { status: 400 });
    }

    const cn = await prisma.chungNhan.findUnique({ where: { id } });
    if (!cn) return NextResponse.json({ error: 'Không tìm thấy chứng nhận' }, { status: 404 });

    const trangThaiMoi = action === 'approve' ? 'approved' : 'rejected';

    const updated = await prisma.chungNhan.update({
      where: { id },
      data: {
        trangThaiDuyet: trangThaiMoi,
        ghiChuAdmin: ghiChuAdmin || null,
        ngayDuyet: new Date(),
      },
      include: { sanPham: { select: { ten: true } } }
    });

    // Ghi log hành động admin
    await prisma.nhatKy.create({
      data: {
        action: `Admin ${action === 'approve' ? 'PHÊ DUYỆT ✅' : 'TỪ CHỐI ❌'} chứng nhận ${cn.soChungNhan} (SP: ${updated.sanPham?.ten ?? 'N/A'})`,
        user: adminEmail,
        role: 'admin',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: action === 'approve' ? 'success' : 'warning',
      }
    });

    return NextResponse.json({ success: true, chungNhan: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a certificate
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const vaiTroCty = cookieStore.get('vaiTroCty')?.value;
    if (!userRole || !['admin', 'manufacturer'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // P1a — chỉ company_admin được xóa chứng nhận
    if (userRole !== 'admin' && vaiTroCty && vaiTroCty !== 'company_admin') {
      return NextResponse.json({ error: `Forbidden — chỉ Quản trị DN được xóa chứng nhận` }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    await prisma.chungNhan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
