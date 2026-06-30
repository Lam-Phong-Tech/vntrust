import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
// B3 Sprint 4: JWT TTL ngắn 30 phút + sliding refresh
import { signJWT, SESSION_TOKEN_NAME, SESSION_TTL_SEC } from '@/lib/jwt';

// ─── Demo account credentials từ env (B-01 fix) ──────────────────────────────
const DEMO_ACCOUNTS: Record<string, { role: string; name: string; pass: string }> = {
  [process.env.DEMO_ADMIN_EMAIL   || 'admin@vntrust.vn']:          { role: 'admin',        name: 'Admin',                    pass: process.env.DEMO_ADMIN_PASS   || 'Admin@VNTrust2024!' },
  [process.env.DEMO_MFR_EMAIL     || 'nsx@vntrust.vn']:            { role: 'manufacturer', name: 'Nhà sản xuất (Demo)',       pass: process.env.DEMO_MFR_PASS     || 'Mfr@VNTrust2024!' },
  [process.env.DEMO_IMP_EMAIL     || 'nhapkhau@vntrust.vn']:       { role: 'importer',     name: 'Nhà nhập khẩu (Demo)',      pass: process.env.DEMO_IMP_PASS     || 'Imp@VNTrust2024!' },
  [process.env.DEMO_CON_EMAIL     || 'nguoitieudung@vntrust.vn']:  { role: 'consumer',     name: 'Người tiêu dùng (Demo)',    pass: process.env.DEMO_CON_PASS     || 'Con@VNTrust2024!' },
};

const BLOCKED_ACCOUNT_STATUSES = ['pending', 'suspended', 'revoked'];

function getAccountStatusMessage(status: string) {
  if (status === 'pending') {
    return 'Tài khoản của bạn chưa được phê duyệt. Vui lòng quay lại sau.';
  }
  if (status === 'suspended') {
    return 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.';
  }
  if (status === 'revoked') {
    return 'Tài khoản của bạn đã bị thu hồi. Vui lòng liên hệ quản trị viên để được hỗ trợ.';
  }
  return 'Tài khoản của bạn hiện không thể đăng nhập. Vui lòng liên hệ quản trị viên.';
}

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
    let foundEmail = "";
    let doanhNghiepId = "";
    // UC03 — sub-role context (chỉ có giá trị khi login bằng DB account, không phải demo)
    let foundUser: { id: string; vaiTroCty: string; quyenMoiNV: boolean } | null = null;

    // Check demo accounts (B-01: credentials từ env, không hardcode)
    const demoEntry = DEMO_ACCOUNTS[username?.toLowerCase?.()];
    if (demoEntry && password === demoEntry.pass) {
      const email = String(username).toLowerCase();
      const existingDemoUser = await prisma.nguoiDung.findUnique({
        where: { email },
        include: { doanhNghiep: true },
      });
      if (existingDemoUser && BLOCKED_ACCOUNT_STATUSES.includes(existingDemoUser.trangThai)) {
        return NextResponse.json({ error: getAccountStatusMessage(existingDemoUser.trangThai) }, { status: 403 });
      }
      if (existingDemoUser?.doanhNghiep && BLOCKED_ACCOUNT_STATUSES.includes(existingDemoUser.doanhNghiep.trangThai)) {
        return NextResponse.json({
          error: existingDemoUser.doanhNghiep.trangThai === 'pending'
            ? 'Hồ sơ doanh nghiệp đang chờ phê duyệt. Vui lòng quay lại sau.'
            : 'Doanh nghiệp đã bị khoá/thu hồi trên hệ thống. Vui lòng liên hệ quản trị viên.'
        }, { status: 403 });
      }
      foundRole = demoEntry.role;
      foundUsername = demoEntry.name;
      foundEmail = email;
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
          if (BLOCKED_ACCOUNT_STATUSES.includes(user.trangThai)) {
            return NextResponse.json({ error: getAccountStatusMessage(user.trangThai) }, { status: 403 });
          }
          // #26: DN bị khoá/thu hồi → KHÔNG cho đăng nhập (trước đây thiếu 'revoked')
          if (user.doanhNghiep && BLOCKED_ACCOUNT_STATUSES.includes(user.doanhNghiep.trangThai)) {
            return NextResponse.json({
              error: user.doanhNghiep.trangThai === 'pending'
                ? 'Hồ sơ doanh nghiệp đang chờ phê duyệt. Vui lòng quay lại sau.'
                : 'Doanh nghiệp đã bị khoá/thu hồi trên hệ thống. Vui lòng liên hệ quản trị viên.'
            }, { status: 403 });
          }

          foundRole = user.vaiTro;
          foundEmail = user.email;
          doanhNghiepId = user.doanhNghiepId || "";
          foundUsername = user.ten || user.email;
          // UC03 — sub-role context (chỉ áp dụng cho NSX/NNK)
          foundUser = {
            id:         user.id,
            vaiTroCty:  (user as any).vaiTroCty   ?? 'company_admin',
            quyenMoiNV: (user as any).quyenMoiNV  ?? false,
          };
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

    // UC03 fix: demo accounts không có row trong NguoiDung → upsert để lấy userId
    // (giúp /api/team yêu cầu userId hoạt động cho cả demo)
    if (foundRole && !foundUser && username) {
      try {
        const email = String(username).toLowerCase();
        // Chỉ NSX/NNK cần vaiTroCty; admin/consumer để null
        const needSubRole = foundRole === 'manufacturer' || foundRole === 'importer';
        const upserted = await prisma.nguoiDung.upsert({
          where: { email },
          create: {
            email,
            matKhau: '$demo$',  // placeholder — demo login KHÔNG verify qua DB matKhau
            ten: foundUsername,
            vaiTro: foundRole,
            vaiTroCty: needSubRole ? 'company_admin' : null,
            quyenMoiNV: needSubRole,
            trangThai: 'active',
            doanhNghiepId: doanhNghiepId || null,
          } as any,
          update: {
            // Nếu user đã tồn tại nhưng thiếu sub-role context (legacy), backfill
            vaiTroCty: needSubRole ? { set: 'company_admin' } : undefined,
            quyenMoiNV: needSubRole ? { set: true } : undefined,
          } as any,
        });
        foundUser = {
          id: upserted.id,
          vaiTroCty: (upserted as any).vaiTroCty ?? (needSubRole ? 'company_admin' : ''),
          quyenMoiNV: (upserted as any).quyenMoiNV ?? needSubRole,
        };
      } catch (e) {
        console.error('[demo upsert error]', e);
      }
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

      // B3: Sign JWT session token (HS256, 30-min TTL — Luật BVDLCN §III.8)
      // UC03: payload thêm userId + vaiTroCty cho phân quyền nội bộ DN
      const sessionToken = signJWT(
        {
          role: foundRole,
          name: foundUsername,
          email: foundEmail || undefined,
          doanhNghiepId: doanhNghiepId || undefined,
          userId: foundUser?.id,
          vaiTroCty: foundUser?.vaiTroCty,
          quyenMoiNV: foundUser?.quyenMoiNV,
        },
        SESSION_TTL_SEC
      );

      const response = NextResponse.json({
        message: 'Đăng nhập thành công',
        role: foundRole,
        username: foundUsername,
        doanhNghiepId: doanhNghiepId || null,
        userId: foundUser?.id || null,
        vaiTroCty: foundUser?.vaiTroCty || null,
        quyenMoiNV: !!foundUser?.quyenMoiNV,
        expiresIn: SESSION_TTL_SEC,
      });
      // B3: All session cookies → 30-min TTL (was 24h). Sliding refresh via /api/auth/me.
      const cookieOpts = { path: '/', maxAge: SESSION_TTL_SEC, sameSite: 'lax' as const };
      response.cookies.set('userRole', foundRole, cookieOpts);
      response.cookies.set('userName', foundUsername, cookieOpts);
      if (doanhNghiepId) {
        response.cookies.set('doanhNghiepId', doanhNghiepId, cookieOpts);
      }
      // UC03 cookies (non-httpOnly để UI đọc + ẩn nút Mời NV nếu không có quyền)
      if (foundUser?.id) {
        response.cookies.set('userId', foundUser.id, cookieOpts);
      }
      if (foundUser?.vaiTroCty) {
        response.cookies.set('vaiTroCty', foundUser.vaiTroCty, cookieOpts);
      }
      response.cookies.set('quyenMoiNV', foundUser?.quyenMoiNV ? '1' : '0', cookieOpts);
      // sessionToken: httpOnly to prevent XSS theft (NFR-SC-04 + §III.8)
      response.cookies.set(SESSION_TOKEN_NAME, sessionToken, {
        ...cookieOpts, httpOnly: true,
      });
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
