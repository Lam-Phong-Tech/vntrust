import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyJWT } from '@/lib/jwt';

// Demo accounts — không reset được (không lưu trong DB)
const DEMO_EMAILS = [
  (process.env.DEMO_ADMIN_EMAIL || 'admin@vntrust.vn').toLowerCase(),
  (process.env.DEMO_MFR_EMAIL   || 'nsx@vntrust.vn').toLowerCase(),
  (process.env.DEMO_IMP_EMAIL   || 'nhapkhau@vntrust.vn').toLowerCase(),
  (process.env.DEMO_CON_EMAIL   || 'nguoitieudung@vntrust.vn').toLowerCase(),
];

export async function POST(req: NextRequest) {
  try {
    const { resetToken, newPassword } = await req.json();

    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    if (
      newPassword.length < 12 ||
      newPassword.length > 20 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      return NextResponse.json({
        error: 'Mật khẩu phải dài 12-20 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.',
      }, { status: 400 });
    }

    // Xác thực token ĐÃ KÝ HMAC (chống giả mạo). verifyJWT trả null nếu chữ ký sai HOẶC hết hạn.
    // Token phải do server cấp sau khi verify OTP (role='pwd-reset') — kẻ xấu không tự chế được.
    const payload = verifyJWT(resetToken);
    if (!payload || payload.role !== 'pwd-reset' || !payload.email) {
      return NextResponse.json({ error: 'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại từ đầu.' }, { status: 400 });
    }
    const email = payload.email.toLowerCase().trim();

    // Demo accounts không reset được
    if (DEMO_EMAILS.includes(email)) {
      return NextResponse.json({
        error: 'Tài khoản demo không thể đổi mật khẩu. Vui lòng dùng mật khẩu mặc định.',
      }, { status: 400 });
    }

    // Tìm user case-insensitive — fix bug "Không tìm thấy tài khoản"
    // SQLite default case-sensitive, ta query rộng rồi filter ở app
    const candidates = await prisma.nguoiDung.findMany({
      where: {
        email: { contains: email.split('@')[0] }, // tìm theo local part trước @
      },
      take: 20,
    });
    const targetUser = candidates.find(u => (u.email || '').toLowerCase().trim() === email)
      || await prisma.nguoiDung.findFirst({ where: { email } });

    if (!targetUser) {
      return NextResponse.json({
        error: 'Không tìm thấy tài khoản với email này. Kiểm tra lại email đã đăng ký.',
      }, { status: 404 });
    }

    // Hash mật khẩu mới bằng bcrypt (theo doc §III — không lưu plaintext)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.nguoiDung.update({
      where: { id: targetUser.id },
      data: { matKhau: hashedPassword },
    });

    // Audit
    await prisma.nhatKy.create({
      data: {
        action: `Reset password thành công cho ${targetUser.email}`,
        user: targetUser.ten || targetUser.email,
        role: targetUser.vaiTro,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        status: 'success',
      },
    }).catch(() => {});

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + (error?.message || 'unknown') }, { status: 500 });
  }
}
