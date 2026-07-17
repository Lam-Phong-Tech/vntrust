// Admin user management — GET list
// Admin-only endpoint: liệt kê toàn bộ NguoiDung kèm DN, filter theo role/status/search
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { sanitizeInput, validatePassword } from '@/lib/security';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'manufacturer', 'importer', 'consumer', 'authority'] as const;
const ALLOWED_STATUS = ['active', 'suspended', 'pending'] as const;

function normalizeVNPhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^(\+84|0084)/, '0').replace(/[^\d]/g, '');
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Ten nguoi dung la bat buoc';
  if (trimmed.length < 2) return 'Ten nguoi dung toi thieu 2 ky tu';
  if (trimmed.length > 60) return 'Ten nguoi dung toi da 60 ky tu';
  if (!/^[\p{L}\s]+$/u.test(trimmed)) return 'Ten nguoi dung chi duoc nhap chu va khoang trang';
  return null;
}

function validateEmail(email: string): string | null {
  if (!email) return 'Email la bat buoc';
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return 'Email khong dung dinh dang';
  return null;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value || 'Admin';
  if (!userRole) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (userRole !== 'admin') return { error: NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 }) };
  return { userRole, userName };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const roleFilter   = searchParams.get('role')   || ''; // admin|manufacturer|importer|consumer|staff
    const statusFilter = searchParams.get('status') || ''; // active|suspended|pending
    const search       = (searchParams.get('q') || '').trim();

    const where: any = {};
    if (roleFilter)   where.vaiTro    = roleFilter;
    if (statusFilter) where.trangThai = statusFilter;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { ten:   { contains: search } },
        { soDienThoai: { contains: search } },
      ];
    }

    const users = await prisma.nguoiDung.findMany({
      where,
      select: {
        id: true,
        ten: true,
        email: true,
        soDienThoai: true,
        vaiTro: true,
        trangThai: true,
        doanhNghiepId: true,
        doanhNghiep: {
          select: { id: true, ten: true, loai: true, maSoThue: true },
        },
      },
      orderBy: [{ trangThai: 'asc' }, { vaiTro: 'asc' }, { email: 'asc' }],
    });

    // Aggregate stats
    const [total, byRole, byStatus] = await Promise.all([
      prisma.nguoiDung.count(),
      prisma.nguoiDung.groupBy({ by: ['vaiTro'],    _count: { _all: true } }),
      prisma.nguoiDung.groupBy({ by: ['trangThai'], _count: { _all: true } }),
    ]);

    return NextResponse.json({
      users,
      total,
      stats: {
        byRole:   Object.fromEntries(byRole.map(r => [r.vaiTro,    r._count._all])),
        byStatus: Object.fromEntries(byStatus.map(r => [r.trangThai, r._count._all])),
      },
    });
  } catch (e: any) {
    console.error('[admin/users GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const name = sanitizeInput(String(body?.name || ''));
    const email = sanitizeInput(String(body?.email || '')).toLowerCase();
    const phone = body?.phone ? normalizeVNPhone(String(body.phone)) : '';
    const password = String(body?.password || '');
    const role = String(body?.role || 'consumer');
    const status = String(body?.status || 'active');

    const nameError = validateName(name);
    if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

    const emailError = validateEmail(email);
    if (emailError) return NextResponse.json({ error: emailError }, { status: 400 });

    if (phone && !/^0[1-9]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: 'So dien thoai phai du 10 so, bat dau bang 01-09' }, { status: 400 });
    }

    if (!ALLOWED_ROLES.includes(role as any)) {
      return NextResponse.json({ error: `Vai tro khong hop le: ${ALLOWED_ROLES.join(', ')}` }, { status: 400 });
    }

    if (!ALLOWED_STATUS.includes(status as any)) {
      return NextResponse.json({ error: `Trang thai khong hop le: ${ALLOWED_STATUS.join(', ')}` }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: 'Mat khau chua dat chinh sach bao mat', details: pwCheck.errors }, { status: 400 });
    }

    const existingEmail = await prisma.nguoiDung.findUnique({ where: { email } });
    if (existingEmail) return NextResponse.json({ error: 'Email nay da ton tai trong he thong' }, { status: 400 });

    if (phone) {
      const existingPhone = await prisma.nguoiDung.findFirst({ where: { soDienThoai: phone } });
      if (existingPhone) return NextResponse.json({ error: 'So dien thoai nay da ton tai trong he thong' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.nguoiDung.create({
      data: {
        ten: name,
        email,
        soDienThoai: phone || null,
        vaiTro: role,
        trangThai: status,
        matKhau: hashedPassword,
      },
      select: {
        id: true,
        ten: true,
        email: true,
        soDienThoai: true,
        vaiTro: true,
        trangThai: true,
        doanhNghiepId: true,
      },
    });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    await prisma.nhatKy.create({
      data: {
        action: `[ADMIN USER CREATE] ${email} (role=${role}, status=${status})`,
        user: auth.userName,
        role: 'admin',
        ip,
        status: 'success',
      },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (e: any) {
    console.error('[admin/users POST]', e);
    return NextResponse.json({ error: e.message || 'Khong the tao nguoi dung' }, { status: 500 });
  }
}
