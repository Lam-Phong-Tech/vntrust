// UC03 — /api/team
// GET   : Liệt kê toàn bộ nhân viên + lời mời pending của DN hiện tại
// POST  : Tạo lời mời nhân viên mới (chỉ company_admin có quyenMoiNV)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { signJWT } from '@/lib/jwt';
import {
  requireCompanyUser, requireCompanyAdmin,
  buildInviteUrl, ALLOWED_SUB_ROLES,
} from '@/lib/teamAuth';
import { sendMail, inviteEmailTemplate, EMAIL_ENABLED } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

// ─── GET: list ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireCompanyUser();
  if (auth.error) return auth.error;
  const { doanhNghiepId } = auth.ctx;

  const [members, invites] = await Promise.all([
    prisma.nguoiDung.findMany({
      where: { doanhNghiepId },
      select: {
        id: true, ten: true, email: true, soDienThoai: true,
        vaiTro: true, vaiTroCty: true, quyenMoiNV: true,
        trangThai: true,
      } as any,
      orderBy: [{ vaiTroCty: 'asc' as any }, { email: 'asc' }],
    }),
    prisma.loiMoiNhanVien.findMany({
      where: { doanhNghiepId, trangThai: 'pending' },
      orderBy: { ngayTao: 'desc' },
      include: { nguoiTao: { select: { ten: true, email: true } } },
    }),
  ]);

  // Lọc invite đã hết hạn (mark expired thay vì xóa)
  const now = new Date();
  const expiredIds: string[] = [];
  const pendingInvites = invites.filter(inv => {
    if (inv.ngayHetHan < now) { expiredIds.push(inv.id); return false; }
    return true;
  });
  if (expiredIds.length > 0) {
    await prisma.loiMoiNhanVien.updateMany({
      where: { id: { in: expiredIds } },
      data: { trangThai: 'expired' },
    });
  }

  return NextResponse.json({
    members,
    invites: pendingInvites.map(inv => ({
      id: inv.id,
      email: inv.email,
      vaiTroCty: inv.vaiTroCty,
      ngayTao: inv.ngayTao,
      ngayHetHan: inv.ngayHetHan,
      nguoiTao: inv.nguoiTao,
    })),
    me: auth.ctx,
  });
}

// ─── POST: invite ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireCompanyAdmin();
  if (auth.error) return auth.error;
  const { userId, userName, doanhNghiepId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const vaiTroCty = String(body.vaiTroCty || '');

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
  }
  if (!ALLOWED_SUB_ROLES.includes(vaiTroCty as any)) {
    return NextResponse.json({ error: `vaiTroCty phải là: ${ALLOWED_SUB_ROLES.join(' | ')}` }, { status: 400 });
  }

  // Check email đã thuộc DN khác chưa
  const existing = await prisma.nguoiDung.findUnique({ where: { email } });
  if (existing && existing.doanhNghiepId && existing.doanhNghiepId !== doanhNghiepId) {
    return NextResponse.json({ error: 'Email này đã gắn với DN khác' }, { status: 409 });
  }
  if (existing && existing.doanhNghiepId === doanhNghiepId) {
    return NextResponse.json({ error: 'Người này đã là thành viên DN' }, { status: 409 });
  }

  // Có invite pending chưa hết hạn?
  const pending = await prisma.loiMoiNhanVien.findFirst({
    where: { email, doanhNghiepId, trangThai: 'pending', ngayHetHan: { gt: new Date() } },
  });
  if (pending) {
    return NextResponse.json({ error: 'Đã có lời mời pending cho email này' }, { status: 409 });
  }

  // Generate JWT invite token (7d)
  const TTL_SEC = 7 * 24 * 60 * 60;
  const nonce = crypto.randomBytes(8).toString('hex');
  const token = signJWT({
    role: 'invite',
    name: email,
    doanhNghiepId,
    userId: nonce,         // dùng nonce để token unique
    vaiTroCty,
  }, TTL_SEC);

  // Hash token trước khi lưu DB (chống leak)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invite = await prisma.loiMoiNhanVien.create({
    data: {
      token: tokenHash,
      email,
      doanhNghiepId,
      vaiTroCty,
      ngayHetHan: new Date(Date.now() + TTL_SEC * 1000),
      nguoiTaoId: userId,
    },
  });

  // Build invite URL (host từ request headers)
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host  = req.headers.get('host') || 'anticounterfeit.test9.io.vn';
  const inviteUrl = buildInviteUrl(token, `${proto}://${host}`);

  // Gửi email tự động nếu SMTP enabled
  let emailResult: any = null;
  if (EMAIL_ENABLED) {
    const dn = await prisma.doanhNghiep.findUnique({
      where: { id: doanhNghiepId },
      select: { ten: true },
    });
    const { subject, html } = inviteEmailTemplate({
      inviteUrl,
      dnTen: dn?.ten || 'Doanh nghiệp VNTrust',
      vaiTroCty,
      inviterName: userName,
      daysValid: 7,
    });
    emailResult = await sendMail({ to: email, subject, html });
  }

  // Audit log
  await prisma.nhatKy.create({
    data: {
      action: `[TEAM INVITE] ${userName} mời ${email} với vai trò ${vaiTroCty}${emailResult?.ok ? ' · email sent' : emailResult?.error ? ' · email FAILED: ' + emailResult.error : ' · email disabled'}`,
      user: userName,
      role: 'manufacturer',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'success',
    },
  });

  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      email: invite.email,
      vaiTroCty: invite.vaiTroCty,
      ngayHetHan: invite.ngayHetHan,
    },
    inviteUrl,
    emailSent: !!emailResult?.ok,
    emailError: emailResult?.error || null,
    note: emailResult?.ok
      ? `Email lời mời đã gửi tới ${email}. Bạn cũng có thể copy link dưới đây để gửi qua kênh khác.`
      : 'Email service chưa hoạt động — hãy copy link và gửi thủ công cho nhân viên qua email/SMS.',
  });
}
