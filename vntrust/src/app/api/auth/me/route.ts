// B3 Sprint 4 — /api/auth/me — sliding session refresh
// ClientShell polls every 30s; if JWT vẫn valid → re-issue cookies với fresh 30min TTL
// (idle timeout = 30 min after last activity).
// Nếu JWT expired/tampered → 401, client tự forceLogout.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { signJWT, verifyJWT, SESSION_TOKEN_NAME, SESSION_TTL_SEC } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_TOKEN_NAME)?.value;
  const userRole = cookieStore.get('userRole')?.value;

  // Path 1: JWT mode (preferred — verified signature + expiry)
  if (token) {
    const payload = verifyJWT(token);
    if (!payload) {
      // JWT invalid/expired → 401
      return NextResponse.json(
        { error: 'session_expired', reason: 'expired' },
        { status: 401 }
      );
    }

    // ── Check user trạng thái (suspended/revoked) ────────────────
    // Nếu admin đình chỉ tài khoản, kick user ra dù JWT còn hạn
    const userName = payload.name || cookieStore.get('userName')?.value;
    if (userName && payload.role !== 'admin') {
      try {
        const user: any = await prisma.nguoiDung.findFirst({
          where: { OR: [{ email: userName }, { ten: userName }] },
          include: { doanhNghiep: { select: { trangThai: true } } },
        });
        if (user && (user.trangThai === 'suspended' || user.trangThai === 'revoked')) {
          return NextResponse.json(
            { error: 'account_suspended', reason: 'suspended' },
            { status: 403 }
          );
        }
        // #26: DN của user bị khoá/thu hồi → kick khỏi phiên ngay (dù JWT còn hạn)
        if (user?.doanhNghiep && ['suspended', 'revoked'].includes(user.doanhNghiep.trangThai)) {
          return NextResponse.json(
            { error: 'account_suspended', reason: 'enterprise_locked' },
            { status: 403 }
          );
        }
      } catch {}
    }

    // UC03: nếu JWT cũ chưa có userId/vaiTroCty/quyenMoiNV, backfill từ DB
    let userId = payload.userId;
    let vaiTroCty = payload.vaiTroCty;
    let quyenMoiNV = payload.quyenMoiNV;
    // Profile fields — load từ DB để return cho UI
    let profileFields: any = {};
    if (payload.name) {
      try {
        const u: any = await prisma.nguoiDung.findFirst({
          where: { OR: [{ email: payload.name }, { ten: payload.name }] },
          include: { doanhNghiep: true },
        });
        if (u) {
          if (!userId) userId = u.id;
          if (!vaiTroCty) vaiTroCty = u.vaiTroCty ?? undefined;
          if (typeof quyenMoiNV !== 'boolean') quyenMoiNV = u.quyenMoiNV ?? false;
          profileFields = {
            ten: u.ten,
            email: u.email,
            soDienThoai: u.soDienThoai,
            avatar: u.avatar,
            diaChi: u.diaChi,
            ngaySinh: u.ngaySinh,
            gioiTinh: u.gioiTinh,
            cccd: u.cccd,
            tenDoanhNghiep: u.doanhNghiep?.ten || null,
          };
        }
      } catch {}
    }

    // ── Sliding refresh: re-sign JWT với fresh exp + reset cookie TTL ──
    const fresh = signJWT(
      {
        role: payload.role,
        name: payload.name,
        doanhNghiepId: payload.doanhNghiepId,
        userId,
        vaiTroCty,
        quyenMoiNV,
      },
      SESSION_TTL_SEC
    );
    const res = NextResponse.json({
      ok: true,
      role: payload.role,
      name: payload.name,
      doanhNghiepId: payload.doanhNghiepId || null,
      userId: userId || null,
      vaiTroCty: vaiTroCty || null,
      quyenMoiNV: !!quyenMoiNV,
      expiresIn: SESSION_TTL_SEC,
      refreshed: true,
      ...profileFields,  // ten, email, sdt, avatar, diaChi, ngaySinh, gioiTinh, cccd, tenDoanhNghiep
    });
    const opts = { path: '/', maxAge: SESSION_TTL_SEC, sameSite: 'lax' as const };
    res.cookies.set(SESSION_TOKEN_NAME, fresh, { ...opts, httpOnly: true });
    res.cookies.set('userRole', payload.role, opts);
    if (payload.name) res.cookies.set('userName', payload.name, opts);
    if (payload.doanhNghiepId) res.cookies.set('doanhNghiepId', payload.doanhNghiepId, opts);
    // UC03 cookies — luôn set (kể cả empty để clear cookie cũ rỗng)
    if (userId) res.cookies.set('userId', userId, opts);
    if (vaiTroCty) res.cookies.set('vaiTroCty', vaiTroCty, opts);
    res.cookies.set('quyenMoiNV', quyenMoiNV ? '1' : '0', opts);
    return res;
  }

  // Path 2: Legacy fallback — userRole cookie exists nhưng KHÔNG có JWT
  // (user logged in trước khi deploy B3). Re-issue JWT để migrate dần.
  if (userRole) {
    const userName = cookieStore.get('userName')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;
    // UC03: lookup DB cho fields mới
    let userId: string | undefined;
    let vaiTroCty: string | undefined;
    let quyenMoiNV = false;
    if (userName && userRole !== 'admin') {
      try {
        const u: any = await prisma.nguoiDung.findFirst({
          where: { OR: [{ email: userName }, { ten: userName }] },
        });
        if (u) {
          userId = u.id;
          vaiTroCty = u.vaiTroCty ?? undefined;
          quyenMoiNV = !!u.quyenMoiNV;
        }
      } catch {}
    }
    const fresh = signJWT(
      { role: userRole, name: userName, doanhNghiepId, userId, vaiTroCty, quyenMoiNV },
      SESSION_TTL_SEC
    );
    const res = NextResponse.json({
      ok: true,
      role: userRole,
      name: userName,
      doanhNghiepId: doanhNghiepId || null,
      userId: userId || null,
      vaiTroCty: vaiTroCty || null,
      quyenMoiNV,
      expiresIn: SESSION_TTL_SEC,
      refreshed: true,
      migrated: true,  // signal: legacy user just got JWT
    });
    const opts = { path: '/', maxAge: SESSION_TTL_SEC, sameSite: 'lax' as const };
    res.cookies.set(SESSION_TOKEN_NAME, fresh, { ...opts, httpOnly: true });
    res.cookies.set('userRole', userRole, opts);
    if (userName) res.cookies.set('userName', userName, opts);
    if (doanhNghiepId) res.cookies.set('doanhNghiepId', doanhNghiepId, opts);
    if (userId) res.cookies.set('userId', userId, opts);
    if (vaiTroCty) res.cookies.set('vaiTroCty', vaiTroCty, opts);
    res.cookies.set('quyenMoiNV', quyenMoiNV ? '1' : '0', opts);
    return res;
  }

  // Path 3: No session at all
  return NextResponse.json(
    { error: 'unauthenticated', reason: 'no_session' },
    { status: 401 }
  );
}

const normalizePhone = (value: string) => value.replace(/\s+/g, '').replace(/^(\+84|0084)/, '0');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L}\s]+$/u;
const addressPattern = /^[\p{L}\p{N}\s,./#()\-]+$/u;
const minBirthday = new Date('1900-01-01T00:00:00');
const roleValues = new Set(['M', 'F', 'O']);

// PATCH: Update hồ sơ cá nhân (ten, sdt, email, avatar, diaChi, ngaySinh, gioiTinh, cccd)
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_TOKEN_NAME)?.value;
  const userName = cookieStore.get('userName')?.value;
  const userIdCookie = cookieStore.get('userId')?.value;
  const userRole = cookieStore.get('userRole')?.value;

  let identifier: any = null;
  if (token) {
    const payload = verifyJWT(token);
    if (payload?.userId) identifier = { id: payload.userId };
    else if (payload?.name) identifier = { OR: [{ email: payload.name }, { ten: payload.name }] };
  }
  if (!identifier && userIdCookie) identifier = { id: userIdCookie };
  if (!identifier && userName) identifier = { OR: [{ email: userName }, { ten: userName }] };

  if (!identifier || !userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const allowed = ['ten', 'soDienThoai', 'email', 'avatar', 'diaChi', 'gioiTinh', 'cccd'] as const;
  const data: any = {};
  for (const k of allowed) {
    if (body[k] !== undefined && body[k] !== null) data[k] = String(body[k]).trim() || null;
  }

  if ('tenDoanhNghiep' in body || 'doanhNghiepId' in body || 'vaiTro' in body || 'role' in body) {
    return NextResponse.json({ error: 'Thông tin doanh nghiệp và vai trò không được sửa tại trang hồ sơ' }, { status: 400 });
  }

  if (data.ten !== undefined && (!data.ten || data.ten.length < 2 || data.ten.length > 80)) {
    return NextResponse.json({ error: 'Họ tên phải từ 2 đến 80 ký tự' }, { status: 400 });
  }

  if (data.ten && !namePattern.test(data.ten)) {
    return NextResponse.json({ error: 'Họ tên chỉ được gồm chữ cái và khoảng trắng' }, { status: 400 });
  }

  if (data.email !== undefined) {
    data.email = data.email ? String(data.email).toLowerCase() : null;
  }

  if (data.soDienThoai) data.soDienThoai = normalizePhone(data.soDienThoai);

  // ngaySinh: convert ISO date string → Date
  if (body.ngaySinh !== undefined) {
    if (!body.ngaySinh) {
      data.ngaySinh = null;
    } else {
      const parsedDate = new Date(`${String(body.ngaySinh).slice(0, 10)}T00:00:00`);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (Number.isNaN(parsedDate.getTime()) || parsedDate > today || parsedDate < minBirthday) {
        return NextResponse.json({ error: parsedDate < minBirthday ? 'Ngày sinh không được trước năm 1900' : 'Ngày sinh không được lớn hơn ngày hiện tại' }, { status: 400 });
      }
      data.ngaySinh = parsedDate;
    }
  }
  // Validate email format nếu có
  if (data.email !== undefined && (!data.email || !emailPattern.test(data.email) || data.email.length > 120)) {
    return NextResponse.json({ error: 'Email liên hệ không hợp lệ' }, { status: 400 });
  }
  if (data.soDienThoai && !/^0\d{9}$/.test(data.soDienThoai)) {
    return NextResponse.json({ error: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0' }, { status: 400 });
  }
  if (data.gioiTinh && !roleValues.has(data.gioiTinh)) {
    return NextResponse.json({ error: 'Giới tính không hợp lệ' }, { status: 400 });
  }
  if (data.cccd && !/^\d{9}$|^\d{12}$/.test(data.cccd)) {
    return NextResponse.json({ error: 'CCCD/CMND phải gồm 9 hoặc 12 số' }, { status: 400 });
  }
  if (data.diaChi && data.diaChi.length > 200) {
    return NextResponse.json({ error: 'Địa chỉ cá nhân tối đa 200 ký tự' }, { status: 400 });
  }
  // Avatar: chỉ chấp nhận URL nội bộ /uploads/...
  if (data.diaChi && !addressPattern.test(data.diaChi)) {
    return NextResponse.json({ error: 'Địa chỉ chỉ nên gồm chữ, số và ký tự , . / # ( ) -' }, { status: 400 });
  }
  if (data.avatar && !data.avatar.startsWith('/uploads/') && !data.avatar.startsWith('http')) {
    return NextResponse.json({ error: 'URL ảnh đại diện không hợp lệ' }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Không có dữ liệu cập nhật' }, { status: 400 });
  }

  // Tìm user trước khi update để biết id
  const existing = await prisma.nguoiDung.findFirst({ where: identifier });
  if (!existing) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
  }

  // Email unique check: nếu đổi email → check xem đã có người khác dùng chưa
  if (data.email && data.email !== existing.email) {
    const dup = await prisma.nguoiDung.findUnique({ where: { email: data.email } });
    if (dup) return NextResponse.json({ error: 'Email này đã được dùng' }, { status: 409 });
  }
  if (data.soDienThoai && data.soDienThoai !== existing.soDienThoai) {
    const dupPhone = await prisma.nguoiDung.findFirst({
      where: { soDienThoai: data.soDienThoai, NOT: { id: existing.id } },
      select: { id: true },
    });
    if (dupPhone) return NextResponse.json({ error: 'Số điện thoại này đã được dùng' }, { status: 409 });
  }

  const updated: any = Object.keys(data).length > 0
    ? await prisma.nguoiDung.update({ where: { id: existing.id }, data })
    : existing;

  // Update userName cookie nếu đổi tên
  const response = NextResponse.json({ ok: true, ten: updated.ten, email: updated.email });
  if (data.ten) {
    response.cookies.set('userName', data.ten, {
      path: '/', maxAge: SESSION_TTL_SEC, sameSite: 'lax',
    });
  }
  return response;
}
