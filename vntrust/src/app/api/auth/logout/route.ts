import { NextResponse } from 'next/server';
import { SESSION_TOKEN_NAME } from '@/lib/jwt';

export async function POST() {
  const response = NextResponse.json({ message: 'Đã đăng xuất' });
  // Xóa tất cả cookie session — đặt maxAge = 0 để trình duyệt xóa ngay
  response.cookies.set('userRole', '', { path: '/', maxAge: 0 });
  response.cookies.set('userName', '', { path: '/', maxAge: 0 });
  response.cookies.set('doanhNghiepId', '', { path: '/', maxAge: 0 });
  // B3: xoá cả JWT session token (httpOnly cookie)
  response.cookies.set(SESSION_TOKEN_NAME, '', { path: '/', maxAge: 0, httpOnly: true });
  return response;
}
