import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Vui lòng nhập email hoặc số điện thoại" }, { status: 400 });
    }

    const user = await prisma.nguoiDung.findFirst({
      where: {
        OR: [{ email: username }, { soDienThoai: username }]
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại trên hệ thống" }, { status: 404 });
    }

    // Generate a new 6-digit password
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();

    // Update password in DB
    await prisma.nguoiDung.update({
      where: { id: user.id },
      data: { matKhau: newPassword }
    });

    // Create a Nodemailer transporter
    let transporter;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      // Use ethereal for testing if no env variables provided
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const info = await transporter.sendMail({
      from: '"Hệ thống VNTrust" <no-reply@vntrust.vn>',
      to: user.email,
      subject: "Khôi phục mật khẩu tài khoản VNTrust",
      text: `Xin chào ${user.ten || user.email},\n\nMật khẩu mới của bạn là: ${newPassword}\n\nVui lòng đăng nhập và đổi lại mật khẩu ngay.\n\nTrân trọng,\nĐội ngũ hỗ trợ VNTrust`
    });

    if (!process.env.EMAIL_USER) {
      console.log("-----------------------------------------");
      console.log("🚀 PREVIEW EMAIL QUÊN MẬT KHẨU:");
      console.log("Truy cập link này để xem nội dung mail:");
      console.log(nodemailer.getTestMessageUrl(info));
      console.log("-----------------------------------------");
    }

    return NextResponse.json({ message: "Mật khẩu mới đã được gửi vào email của bạn!" });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi gửi yêu cầu. Vui lòng thử lại sau." }, { status: 500 });
  }
}
