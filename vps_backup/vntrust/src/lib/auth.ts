import { NextRequest, NextResponse } from 'next/server'

/** L?y role t? cookie server-side (NextRequest) */
export function getRole(request: NextRequest): string | null {
  return request.cookies.get('userRole')?.value ?? null
}

/** Tr? v? 401 n?u ch?a ??ng nh?p */
export function requireAuth(request: NextRequest): NextResponse | null {
  if (!getRole(request)) {
    return NextResponse.json(
      { error: 'Unauthorized: Vui l?ng ??ng nh?p' },
      { status: 401 }
    )
  }
  return null
}

/** Tr? v? 401/403 n?u role kh?ng n?m trong danh s?ch cho ph?p */
export function requireRoles(
  request: NextRequest,
  allowedRoles: string[]
): NextResponse | null {
  const role = getRole(request)
  if (!role) {
    return NextResponse.json(
      { error: 'Unauthorized: Vui l?ng ??ng nh?p' },
      { status: 401 }
    )
  }
  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      { error: 'Forbidden: Kh?ng c? quy?n truy c?p' },
      { status: 403 }
    )
  }
  return null
}
