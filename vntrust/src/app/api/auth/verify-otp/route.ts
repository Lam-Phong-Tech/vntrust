import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otpStore';
import { signJWT } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const record = otpStore.get(email.toLowerCase());
    console.log(`[OTP-VERIFY] email=${email}, submitted=${otp}, stored=`, record);

    if (!record) {
      return NextResponse.json({ error: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.' }, { status: 400 });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(email.toLowerCase());
      return NextResponse.json({ error: 'Mã OTP đã hết hạn (5 phút). Vui lòng yêu cầu mã mới.' }, { status: 400 });
    }

    if (record.otp !== otp.toString()) {
      return NextResponse.json({ error: 'Mã OTP không chính xác' }, { status: 400 });
    }

    otpStore.delete(email.toLowerCase());
    // Token ĐÃ KÝ HMAC (role='pwd-reset') — chỉ server cấp được sau khi verify OTP,
    // hết hạn sau 10 phút. Chống giả mạo token để đổi mật khẩu tài khoản bất kỳ.
    const resetToken = signJWT({ role: 'pwd-reset', email: email.toLowerCase() }, 600);
    console.log(`[OTP-VERIFY] OK for ${email}, resetToken issued`);

    return NextResponse.json({ message: 'Xác thực thành công', resetToken });
  } catch (error) {
    console.error('[OTP-VERIFY] Error:', error);
    return NextResponse.json({ error: 'Lỗi xác thực' }, { status: 500 });
  }
}
