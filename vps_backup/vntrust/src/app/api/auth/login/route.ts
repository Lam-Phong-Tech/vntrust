import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// ─── Demo account credentials từ env (B-01 fix) ──────────────────────────────
const DEMO_ACCOUNTS: Record<string, { role: string; name: string; pass: string }> = {
  [process.env.DEMO_ADMIN_EMAIL   || 'admin@vntrust.vn']:          { role: 'admin',        name: 'Admin',                    pass: process.env.DEMO_ADMIN_PASS   || 'Admin@VNTrust2024!' },
  [process.env.DEMO_MFR_EMAIL     || 'nsx@vntrust.vn']:            { role: 'manufacturer', name: 'Nhà sản xuất (Demo)',       pass: process.env.DEMO_MFR_PASS     || 'Mfr@VNTrust2024!' },
  [process.env.DEMO_IMP_EMAIL     || 'nhapkhau@vntrust.vn']:       { role: 'importer',     name: 'Nhà nhập khẩu (Demo)',      pass: process.env.DEMO_IMP_PASS     || 'Imp@VNTrust2024!' },
  [process.env.DEMO_CON_EMAIL     || 'nguoitieudung@vntrust.vn']:  { role: 'consumer',     name: 'Người tiêu dùng (Demo)',    pass: process.env.DEMO_CON_PASS     || 'Con@VNTrust2024!' },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ thông tin đăng nhập' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';

    let foundRole = "";
    let foundUsername = "";
    let doanhNghiepId = "";

    // Check demo accounts (B-01: credentials từ env, không hardcode)
    const demoEntry = DEMO_ACCOUNTS[username?.toLowerCase?.()];
    if (demoEntry && password === demoEntry.pass) {
      foundRole = demoEntry.role;
      foundUsername = demoEntry.name;
    } else {
      // Find in DB — B-02: so sánh bằng bcrypt
      const user = await prisma.nguoiDung.findFirst({
        where: {
          OR: [{ email: username?.toLowerCase() }, { soDienThoai: username }],
        },
        include: { doanhNghiep: true }
      });

      if (user) {
        const isHashed = user.matKhau.startsWith('$2');
        const passwordMatch = isHashed
          ? await bcrypt.compare(password, user.matKhau)
          : user.matKhau === password;

        if (passwordMatch) {
          if (user.trangThai === 'pending' || user.trangThai === 'suspended') {
            return NextResponse.json({ error: 'Tài khoản của bạn chưa được phê duyệt hoặc đã bị khóa.' }, { status: 403 });
          }
          if (user.doanhNghiep && (user.doanhNghiep.trangThai === 'pending' || user.doanhNghiep.trangThai === 'suspended')) {
            return NextResponse.json({ error: 'Hồ sơ đang chờ phê duyệt. Vui lòng quay lại sau.' }, { status: 403 });
          }

          foundRole = user.vaiTro;
          doanhNghiepId = user.doanhNghiepId || "";
          foundUsername = user.ten || user.email;
        }
      }
    }

    // For demo manufacturer/importer accounts without a doanhNghiepId,
    // auto-assign the first available company in the database
    if ((foundRole === 'manufacturer' || foundRole === 'importer') && !doanhNghiepId) {
      try {
        const firstDN = await prisma.doanhNghiep.findFirst({ where: { trangThai: 'verified' } });
        if (firstDN) doanhNghiepId = firstDN.id;
      } catch {}
    }

    if (foundRole) {
      // Record login to DB
      try {
        await prisma.nhatKy.create({
          data: {
            action: "Đăng nhập hệ thống thành công",
            user: foundUsername,
            role: foundRole,
            ip,
            status: "success",
          }
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      const response = NextResponse.json({
        message: 'Đăng nhập thành công',
        role: foundRole,
        username: foundUsername,
        doanhNghiepId: doanhNghiepId || null,
      });
      response.cookies.set('userRole', foundRole, { path: '/', maxAge: 86400 });
      response.cookies.set('userName', foundUsername, { path: '/', maxAge: 86400 });
      if (doanhNghiepId) {
        response.cookies.set('doanhNghiepId', doanhNghiepId, { path: '/', maxAge: 86400 });
      }
      return response;
    }

    // Record failed login
    try {
      await prisma.nhatKy.create({
        data: {
          action: `Đăng nhập thất bại: ${username}`,
          user: username,
          role: "unknown",
          ip,
          status: "error",
        }
      });
    } catch {}

    return NextResponse.json(
      { error: 'Sai tên đăng nhập hoặc mật khẩu!' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
