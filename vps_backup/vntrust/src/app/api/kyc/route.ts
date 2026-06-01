import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET: List companies (admin sees all, others see their own)
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const listDistributors = searchParams.get('list_distributors');

    // ── list_distributors: trả về danh sách NPP đã xác thực (cả Admin và NSX đều dùng) ──
    if (listDistributors === 'true') {
      const list = await prisma.doanhNghiep.findMany({
        where: { 
          loai: 'NNK',    // Chỉ lấy Nhà nhập khẩu/phân phối
          trangThai: 'verified', // Đã được Admin phê duyệt
        },
        select: { id: true, ten: true, maSoThue: true, diaChi: true },
        orderBy: { ten: 'asc' },
      });
      // Map 'ten' -> 'tenDoanhNghiep' for frontend compatibility
      const mappedList = list.map(c => ({ ...c, tenDoanhNghiep: c.ten }));
      return NextResponse.json({ companies: mappedList });
    }

    // ── Admin: xem tất cả doanh nghiệp ──
    if (userRole === 'admin') {
      const list = await prisma.doanhNghiep.findMany({
        include: { _count: { select: { sanPhams: true, nguoiDungs: true } } },
        orderBy: { ngayDangKy: 'desc' },
      });
      return NextResponse.json({ role: 'admin', companies: list });
    }

    if (!doanhNghiepId) return NextResponse.json({ error: 'No enterprise assigned' }, { status: 403 });

    const company = await prisma.doanhNghiep.findUnique({
      where: { id: doanhNghiepId },
      include: { _count: { select: { sanPhams: true } } },
    });
    return NextResponse.json({ role: userRole, company });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: Admin approve/reject -OR- Company tự cập nhật thông tin KYC
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, action, trangThai, lyDo, ...kycFields } = body;

    // ── Admin: phê duyệt / từ chối ──────────────────────────────────────────
    if (action === 'admin_approval') {
      if (userRole !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      if (!id || !trangThai) return NextResponse.json({ error: 'Thiếu id hoặc trangThai' }, { status: 400 });
      if (!['verified', 'pending', 'suspended', 'revoked'].includes(trangThai)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
      }
      const updated = await prisma.doanhNghiep.update({ where: { id }, data: { trangThai } });
      const actionLabel = trangThai === 'verified' ? 'Phê duyệt / Mở khóa'
        : trangThai === 'suspended' ? 'Từ chối'
        : trangThai === 'revoked' ? 'Thu hồi (Khóa tài khoản)'
        : 'Đặt lại';
      await prisma.nhatKy.create({
        data: {
          action: `KYC ${actionLabel}: ${updated.ten}${lyDo ? ' — ' + lyDo : ''}`,
          user: 'Admin', role: 'admin',
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: trangThai === 'revoked' ? 'warning' : 'success',
        }
      });
      return NextResponse.json({ company: updated });
    }

    // ── Doanh nghiệp tự cập nhật thông tin KYC ──────────────────────────────
    if (action === 'update_info') {
      if (!doanhNghiepId) return NextResponse.json({ error: 'No enterprise assigned' }, { status: 403 });
      // Chỉ cho phép cập nhật các field KYC, không cho tự phê duyệt
      const allowed = ['nganh_VSIC', 'email', 'hotline', 'nguoiDaiDien', 'giayphep_url', 'cmnd_url', 'diaChi'];
      const updateData: Record<string, any> = {};
      for (const key of allowed) {
        if (kycFields[key] !== undefined) updateData[key] = kycFields[key];
      }
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu cập nhật' }, { status: 400 });
      }
      const updated = await prisma.doanhNghiep.update({
        where: { id: doanhNghiepId },
        data: updateData,
      });
      await prisma.nhatKy.create({
        data: {
          action: `KYC cập nhật thông tin: ${Object.keys(updateData).join(', ')}`,
          user: cookieStore.get('userName')?.value || 'User',
          role: userRole, ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'success',
        }
      });
      return NextResponse.json({ company: updated });
    }

    // Backward compat: old admin PATCH without action field
    if (userRole === 'admin' && trangThai) {
      if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
      const updated = await prisma.doanhNghiep.update({ where: { id }, data: { trangThai } });
      return NextResponse.json({ company: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


// POST: Register new company (from manufacturer/importer register flow)
export async function POST(req: NextRequest) {
  try {
    const { maSoThue, ten, diaChi, nganh_VSIC, loai } = await req.json();
    if (!maSoThue || !ten || !loai) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const existing = await prisma.doanhNghiep.findUnique({ where: { maSoThue } });
    if (existing) return NextResponse.json({ error: 'Mã số thuế đã tồn tại' }, { status: 409 });

    const company = await prisma.doanhNghiep.create({
      data: { maSoThue, ten, diaChi, nganh_VSIC, loai, trangThai: 'pending' },
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
