import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { otpStore } from '@/lib/otpStore';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email không được để trống' }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    console.log('[OTP] GMAIL_USER:', gmailUser ?? 'NOT SET');
    console.log('[OTP] GMAIL_APP_PASSWORD:', gmailPass ? '***SET***' : 'NOT SET');

    if (!gmailUser || !gmailPass || gmailPass === 'your_app_password_here') {
      console.error('[OTP] Gmail credentials not configured!');
      return NextResponse.json({ error: 'Hệ thống email chưa được cấu hình.' }, { status: 500 });
    }

    const otp = generateOTP();
    otpStore.set(email.toLowerCase(), { otp, expires: Date.now() + 5 * 60 * 1000 });
    console.log(`[OTP] Generated for ${email}: ${otp}`);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

    try {
      await transporter.verify();
      console.log('[OTP] SMTP verified OK');
    } catch (verifyErr: any) {
      console.error('[OTP] SMTP verify failed:', verifyErr.message);
      return NextResponse.json({ error: `Lỗi kết nối Gmail: ${verifyErr.message}` }, { status: 500 });
    }

    const info = await transporter.sendMail({
      from: `"VNTrust" <${gmailUser}>`,
      replyTo: gmailUser,
      to: email,
      subject: `Mã xác thực VNTrust của bạn`,
      headers: {
        'X-Mailer': 'VNTrust Mailer 1.0',
        'Precedence': 'transactional',
        'X-Entity-Ref-ID': `vntrust-otp-${Date.now()}`,
      },
      // Plain-text fallback — giảm điểm spam đáng kể
      text: `VNTrust - Mã xác thực tài khoản\n\nMã OTP của bạn là: ${otp}\n\nMã có hiệu lực trong 5 phút.\nKhông chia sẻ mã này với bất kỳ ai.\n\n---\nVNTrust · anticounterfeit.test9.io.vn`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
          <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
            <div style="background:#0a3352;padding:28px 32px;text-align:center;">
              <h1 style="color:#3cdada;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">VNTrust</h1>
              <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:12px;">Hệ thống chống hàng giả toàn quốc</p>
            </div>
            <div style="padding:32px;">
              <p style="color:#475569;font-size:15px;margin:0 0 24px;line-height:1.6;">
                Xin chào, bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong style="color:#0a3352;">${email}</strong>.
              </p>
              <div style="background:#f0fdf9;border:2px solid #3cdada;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
                <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:3px;margin:0 0 12px;text-transform:uppercase;">Mã xác thực của bạn</p>
                <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#0a3352;font-family:'Courier New',monospace;">${otp}</div>
                <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">Hiệu lực trong <strong style="color:#d97706;">5 phút</strong></p>
              </div>
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;">
                <p style="color:#92400e;font-size:12px;margin:0;line-height:1.6;">
                  Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này. Không chia sẻ mã với bất kỳ ai.
                </p>
              </div>
            </div>
            <div style="background:#f8fafc;padding:16px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">© 2024 VNTrust &middot; <a href="https://anticounterfeit.test9.io.vn" style="color:#94a3b8;">anticounterfeit.test9.io.vn</a></p>
            </div>
          </div>
        </body></html>
      `,
    });

    console.log('[OTP] Email sent! MessageId:', info.messageId);
    return NextResponse.json({ message: 'Mã OTP đã được gửi đến email của bạn' });

  } catch (error: any) {
    console.error('[OTP] ERROR:', error.message, '| code:', error.code);
    return NextResponse.json({ error: `Không thể gửi email: ${error.message}` }, { status: 500 });
  }
}
