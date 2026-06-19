// POST /api/auth/change-password — đổi mật khẩu cho user ĐANG ĐĂNG NHẬP
// Sửa bug "Không đổi được mật khẩu" (DN + người tiêu dùng): trước đây route này KHÔNG tồn tại
// → modal gọi fetch trả 404. Nhận diện user giống /api/auth/me (JWT → userId/name, fallback cookie).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyJWT, SESSION_TOKEN_NAME } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_TOKEN_NAME)?.value;
    const userName = cookieStore.get('userName')?.value;
    const userIdCookie = cookieStore.get('userId')?.value;
    const userRole = cookieStore.get('userRole')?.value;

    // ── Nhận diện user đang đăng nhập (giống /api/auth/me PATCH) ──
    let identifier: any = null;
    if (token) {
      const payload = verifyJWT(token);
      if (payload?.userId) identifier = { id: payload.userId };
      else if (payload?.name) identifier = { OR: [{ email: payload.name }, { ten: payload.name }] };
    }
    if (!identifier && userIdCookie) identifier = { id: userIdCookie };
    if (!identifier && userName) identifier = { OR: [{ email: userName }, { ten: userName }] };

    if (!identifier || !userRole) {
      return NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await req.json().catch(() => ({}));
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập đủ mật khẩu cũ và mật khẩu mới' }, { status: 400 });
    }
    if (String(newPassword).length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    const user = await prisma.nguoiDung.findFirst({ where: identifier });
    if (!user) {
      // Tài khoản demo (env, không nằm trong DB) sẽ rơi vào đây
      return NextResponse.json({ error: 'Không tìm thấy tài khoản (tài khoản demo không đổi được mật khẩu).' }, { status: 404 });
    }

    // ── Verify mật khẩu hiện tại: hỗ trợ cả bcrypt hash lẫn plaintext (legacy) ──
    const stored = user.matKhau || '';
    const oldOk = stored.startsWith('$2')
      ? await bcrypt.compare(String(oldPassword), stored)
      : stored === String(oldPassword);
    if (!oldOk) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
    }

    // ── Hash + cập nhật mật khẩu mới ──
    const hashed = await bcrypt.hash(String(newPassword), 12);
    await prisma.nguoiDung.update({ where: { id: user.id }, data: { matKhau: hashed } });

    // Audit (best-effort)
    await prisma.nhatKy.create({
      data: {
        action: 'Đổi mật khẩu thành công',
        user: user.ten || user.email,
        role: user.vaiTro,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        status: 'success',
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, message: 'Đổi mật khẩu thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + (error?.message || 'unknown') }, { status: 500 });
  }
}
