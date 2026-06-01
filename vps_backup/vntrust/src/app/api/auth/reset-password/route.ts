import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      email = emailPart;
    } catch {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 400 });
    }

    // Cập nhật mật khẩu trong DB
    const updated = await prisma.nguoiDung.updateMany({
      where: { email },
      data: { matKhau: newPassword },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản với email này' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
