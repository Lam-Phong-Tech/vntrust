import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userRole = request.cookies.get('userRole')?.value

  // ?? B?o v? to?n b? /dashboard v? /enterprise ??????????????????????????????
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/enterprise')
  ) {
    // Ch?a ??ng nh?p ? v? trang login
    if (!userRole) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // /dashboard/haukiem ch? d?nh cho admin
    if (pathname.startsWith('/dashboard/haukiem') && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // /supply-chain l? trang c?ng khai ? kh?ng c?n b?o v?
  // /verify l? trang c?ng khai ? kh?ng c?n b?o v?

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/enterprise/:path*'],
}
