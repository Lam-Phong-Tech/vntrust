// UC03 — Accept invite (NV được mời tạo tài khoản + gia nhập DN)
// GET  ?token=...   → verify token, return invite preview (cho UI render form)
// POST { token, ten, password } → tạo NguoiDung + đánh dấu invite accepted
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

async function findInviteByToken(token: string) {
  const payload = verifyJWT(token);
  if (!payload || payload.role !== 'invite') return null;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const inv = await prisma.loiMoiNhanVien.findUnique({
    where: { token: hash },
    include: { doanhNghiep: { select: { ten: true, loai: true, maSoThue: true } } },
  });
  if (!inv) return null;
  if (inv.trangThai !== 'pending') return { ...inv, _err: `Lời mời đã ${inv.trangThai}` };
  if (inv.ngayHetHan < new Date()) return { ...inv, _err: 'Lời mời đã hết hạn' };
  return inv;
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!token) return NextResponse.json({ error: 'Thiếu token' }, { status: 400 });
  const inv = await findInviteByToken(token);
  if (!inv) return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
  if ((inv as any)._err) return NextResponse.json({ error: (inv as any)._err }, { status: 410 });

  return NextResponse.json({
    email: inv.email,
    vaiTroCty: inv.vaiTroCty,
    doanhNghiep: inv.doanhNghiep,
    ngayHetHan: inv.ngayHetHan,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, ten, password, soDienThoai } = body || {};

  if (!token || !password) {
    return NextResponse.json({ error: 'Thiếu token hoặc password' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Mật khẩu tối thiểu 8 ký tự' }, { status: 400 });
  }

  const inv = await findInviteByToken(token);
  if (!inv) return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
  if ((inv as any)._err) return NextResponse.json({ error: (inv as any)._err }, { status: 410 });

  // Email đã có user chưa?
  const existing = await prisma.nguoiDung.findUnique({ where: { email: inv.email } });
  if (existing) {
    return NextResponse.json({ error: 'Email đã có tài khoản — vui lòng đăng nhập' }, { status: 409 });
  }

  const hashedPwd = await bcrypt.hash(password, 10);
  const role = inv.vaiTroCty === 'warehouse' ? 'manufacturer' : 'manufacturer'; // platform role mặc định
  // Lưu ý: NV của 1 NSX có vaiTro = manufacturer; NV của NNK = importer
  const dn = await prisma.doanhNghiep.findUnique({ where: { id: inv.doanhNghiepId }, select: { loai: true } });
  const platformRole = dn?.loai === 'NNK' ? 'importer' : 'manufacturer';

  const newUser = await prisma.nguoiDung.create({
    data: {
      email: inv.email,
      matKhau: hashedPwd,
      ten: ten || null,
      soDienThoai: soDienThoai || null,
      vaiTro: platformRole,
      vaiTroCty: inv.vaiTroCty,
      quyenMoiNV: inv.vaiTroCty === 'company_admin',
      trangThai: 'active',
      doanhNghiepId: inv.doanhNghiepId,
    } as any,
  });

  await prisma.loiMoiNhanVien.update({
    where: { id: inv.id },
    data: { trangThai: 'accepted', ngayChapNhan: new Date() },
  });

  await prisma.nhatKy.create({
    data: {
      action: `[TEAM ACCEPT] ${inv.email} gia nhập DN ${inv.doanhNghiepId} với vai trò ${inv.vaiTroCty}`,
      user: inv.email, role: platformRole,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'success',
    },
  });

  return NextResponse.json({
    ok: true,
    userId: newUser.id,
    message: 'Tạo tài khoản thành công. Hãy đăng nhập tại trang chính.',
  });
}
