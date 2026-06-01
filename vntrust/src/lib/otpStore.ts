// B-06 Fix: OTP store dùng Prisma DB thay vì in-memory Map
// File này giờ chỉ còn là compatibility shim — logic thực đã chuyển sang DB
// (dùng model NhatKy với action='OTP' để lưu tạm)
import { prisma } from '@/lib/prisma';

export interface OtpRecord { otp: string; expires: number; }

// Lưu OTP vào DB (NhatKy với action='OTP_STORE')
export async function saveOtp(email: string, otp: string, expiresMs: number) {
  // Xóa OTP cũ nếu có
  await prisma.nhatKy.deleteMany({
    where: { action: 'OTP_STORE', user: email.toLowerCase() },
  });
  await prisma.nhatKy.create({
    data: {
      action: 'OTP_STORE',
      user: email.toLowerCase(),
      role: otp,                         // lưu otp value vào field role tạm
      ip: expiresMs.toString(),          // lưu expiry timestamp vào field ip
      status: 'pending',
    },
  });
}

// Lấy OTP từ DB
export async function getOtp(email: string): Promise<OtpRecord | null> {
  const record = await prisma.nhatKy.findFirst({
    where: { action: 'OTP_STORE', user: email.toLowerCase(), status: 'pending' },
    orderBy: { time: 'desc' },
  });
  if (!record) return null;
  return { otp: record.role, expires: parseInt(record.ip) };
}

// Xóa OTP sau khi dùng
export async function deleteOtp(email: string) {
  await prisma.nhatKy.deleteMany({
    where: { action: 'OTP_STORE', user: email.toLowerCase() },
  });
}

// Backward-compat shim (không dùng nữa nhưng giữ để tránh import error)
export const otpStore = new Map<string, OtpRecord>();
