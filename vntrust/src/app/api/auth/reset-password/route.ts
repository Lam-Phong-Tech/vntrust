import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    // Giải mã token để lấy email
    let email: string;
    try {
      const decoded = Buffer.from(resetToken, 'base64').toString('utf-8');
      const [emailPart, timestamp] = decoded.split(':');
      // Token hết hạn sau 10 phút
      if (Date.now() - Number(timestamp) > 10 * 60 * 1000) {
        return NextResponse.json({ error: 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại.' }, { status: 400 });
      }
      email = (emailPart || '').toLowerCase().trim();
    } catch {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 400 });
    }

    if (!email) return NextResponse.json({ error: 'Token thiếu email' }, { status: 400 });

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
