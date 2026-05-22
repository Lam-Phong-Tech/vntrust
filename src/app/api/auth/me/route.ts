import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Demo accounts email list (read-only, không có trong DB)
const DEMO_EMAILS = [
  process.env.DEMO_ADMIN_EMAIL    || 'admin@vntrust.vn',
  process.env.DEMO_MFR_EMAIL      || 'nsx@vntrust.vn',
  process.env.DEMO_IMP_EMAIL      || 'nhapkhau@vntrust.vn',
  process.env.DEMO_CON_EMAIL      || 'nguoitieudung@vntrust.vn',
];

// ── GET /api/auth/me  — lấy thông tin user hiện tại ───────────────────────────
export async function GET(req: NextRequest) {
  const userName = req.cookies.get('userName')?.value;
  const userRole = req.cookies.get('userRole')?.value;
  const doanhNghiepId = req.cookies.get('doanhNghiepId')?.value;

  if (!userRole) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  // Demo accounts — trả về thông tin từ cookie
  const demoEmails = DEMO_EMAILS;
  const isDemo = demoEmails.some(e => userName?.includes('(Demo)') || userName?.includes('Admin'));
  if (isDemo || !doanhNghiepId) {
    return NextResponse.json({
      ten: userName || '',
      email: '',
      soDienThoai: '',
      tenDoanhNghiep: '',
      role: userRole,
      isDemo: true,
    });
  }

  // Real user — tìm trong DB theo doanhNghiepId + vaiTro
  try {
    const user = await prisma.nguoiDung.findFirst({
      where: { doanhNghiepId, vaiTro: userRole },
      include: { doanhNghiep: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      ten: user.ten || '',
      email: user.email || '',
      soDienThoai: user.soDienThoai || '',
      tenDoanhNghiep: user.doanhNghiep?.ten || '',
      diaChiDoanhNghiep: user.doanhNghiep?.diaChi || '',
      role: user.vaiTro,
      isDemo: false,
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// ── PATCH /api/auth/me  — cập nhật thông tin user ─────────────────────────────
export async function PATCH(req: NextRequest) {
  const userRole = req.cookies.get('userRole')?.value;
  const doanhNghiepId = req.cookies.get('doanhNghiepId')?.value;

  if (!userRole) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
  if (!doanhNghiepId) {
    return NextResponse.json({ error: 'Tài khoản demo không thể chỉnh sửa' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { ten, soDienThoai, email, tenDoanhNghiep } = body;

    // Tìm user
    const user = await prisma.nguoiDung.findFirst({
      where: { doanhNghiepId, vaiTro: userRole },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Cập nhật NguoiDung
    const updated = await prisma.nguoiDung.update({
      where: { id: user.id },
      data: {
        ...(ten !== undefined && { ten }),
        ...(soDienThoai !== undefined && { soDienThoai }),
        ...(email !== undefined && email !== user.email && { email }),
      },
    });

    // Cập nhật tên DoanhNghiep nếu có
    if (tenDoanhNghiep !== undefined) {
      await prisma.doanhNghiep.update({
        where: { id: doanhNghiepId },
        data: { ten: tenDoanhNghiep },
      });
    }

    // Cập nhật cookie userName
    const response = NextResponse.json({ success: true, ten: updated.ten });
    response.cookies.set('userName', updated.ten || updated.email, { path: '/', maxAge: 86400 });
    return response;
  } catch (err: any) {
    console.error('PATCH /api/auth/me error:', err);
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email này đã được sử dụng bởi tài khoản khác' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
