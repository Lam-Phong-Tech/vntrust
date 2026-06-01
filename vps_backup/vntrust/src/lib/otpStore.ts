// Singleton OTP store — dùng chung giữa send-otp và verify-otp (cùng process)
export const otpStore = new Map<string, { otp: string; expires: number }>();
