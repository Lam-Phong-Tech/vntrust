import { NextRequest, NextResponse } from 'next/server';
import { getOtp, deleteOtp } from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    // B-06 Fix: Lấy OTP từ DB thay vì in-memory
    const record = await getOtp(email.toLowerCase());

    if (!record) {
      return NextResponse.json({ error: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.' }, { status: 400 });
    }

    if (Date.now() > record.expires) {
      await deleteOtp(email.toLowerCase());
      return NextResponse.json({ error: 'Mã OTP đã hết hạn (5 phút). Vui lòng yêu cầu mã mới.' }, { status: 400 });
    }

    if (record.otp !== otp.toString()) {
      return NextResponse.json({ error: 'Mã OTP không chính xác' }, { status: 400 });
    }

    await deleteOtp(email.toLowerCase());
    const resetToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    return NextResponse.json({ message: 'Xác thực thành công', resetToken });
  } catch (error) {
    console.error('[OTP-VERIFY] Error:', error);
    return NextResponse.json({ error: 'Lỗi xác thực' }, { status: 500 });
  }
}
