import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Đã đăng xuất' });
  // Xóa tất cả cookie session — đặt maxAge = 0 để trình duyệt xóa ngay
  response.cookies.set('userRole', '', { path: '/', maxAge: 0 });
  response.cookies.set('userName', '', { path: '/', maxAge: 0 });
  response.cookies.set('doanhNghiepId', '', { path: '/', maxAge: 0 });
  return response;
}
