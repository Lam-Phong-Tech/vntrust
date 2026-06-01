// Email sending helper (Gmail SMTP)
// Dùng GMAIL_USER + GMAIL_APP_PASSWORD đã có sẵn trong env prod
import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || '';
export const EMAIL_ENABLED = !!(GMAIL_USER && GMAIL_PASS);

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!EMAIL_ENABLED) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
  }
  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  disabled?: boolean;
}

export async function sendMail(opts: SendMailOptions): Promise<SendMailResult> {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] EMAIL_ENABLED=false (missing GMAIL_USER or GMAIL_APP_PASSWORD)');
    return { ok: false, disabled: true, error: 'Email service chưa cấu hình' };
  }
  try {
    const info = await t.sendMail({
      from: `"VNTrust" <${GMAIL_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || stripHtml(opts.html),
    });
    return { ok: true, messageId: info.messageId };
  } catch (e: any) {
    console.error('[mailer] send error:', e?.message || e);
    return { ok: false, error: e?.message || 'Unknown SMTP error' };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Templates ────────────────────────────────────────────────────────

export function inviteEmailTemplate(opts: {
  inviteUrl: string;
  dnTen: string;
  vaiTroCty: string;
  inviterName: string;
  daysValid: number;
}): { subject: string; html: string } {
  const roleLabel: Record<string, string> = {
    company_admin: 'Quản trị doanh nghiệp',
    staff_input:   'Nhân viên nhập liệu',
    warehouse:     'Nhân viên kho',
    viewer:        'Chỉ xem',
  };
  const role = roleLabel[opts.vaiTroCty] || opts.vaiTroCty;
  const subject = `Lời mời gia nhập ${opts.dnTen} trên VNTrust`;
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Roboto, sans-serif; background: #f5f5f0; padding: 24px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #0B1623; color: #F6F1E8; border-radius: 16px; padding: 32px; border: 1px solid rgba(200,165,87,0.3);">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
      <div style="width: 36px; height: 36px; border-radius: 8px; border: 1px solid #C8A557; display: inline-flex; align-items: center; justify-content: center; color: #C8A557; font-weight: bold;">V</div>
      <span style="font-size: 18px; font-weight: bold;">VN<span style="color: #C8A557;">Trust</span></span>
    </div>

    <h1 style="font-size: 22px; margin: 0 0 8px;">Bạn được mời gia nhập</h1>
    <h2 style="color: #C8A557; font-size: 24px; margin: 0 0 16px;">${escapeHtml(opts.dnTen)}</h2>

    <p style="color: rgba(246,241,232,0.7); line-height: 1.6; margin: 0 0 20px;">
      <strong style="color: #fff;">${escapeHtml(opts.inviterName)}</strong> đã mời bạn tham gia
      hệ thống chống hàng giả VNTrust với vai trò:
    </p>

    <div style="background: rgba(200,165,87,0.1); border: 1px solid rgba(200,165,87,0.3); border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
      <span style="color: #C8A557; font-weight: bold; font-size: 16px;">${escapeHtml(role)}</span>
    </div>

    <a href="${escapeAttr(opts.inviteUrl)}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: linear-gradient(135deg, #E4D2A1, #C8A557); color: #0B1623; padding: 14px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
      Chấp nhận lời mời &amp; tạo tài khoản
    </a>

    <p style="color: rgba(246,241,232,0.5); font-size: 12px; text-align: center; margin: 20px 0 0;">
      Lời mời có hiệu lực trong <strong>${opts.daysValid} ngày</strong>.<br>
      Nếu bạn không yêu cầu lời mời này, vui lòng bỏ qua email.
    </p>

    <p style="color: rgba(246,241,232,0.3); font-size: 11px; text-align: center; margin: 16px 0 0; word-break: break-all;">
      Nếu nút trên không hoạt động, copy link sau vào trình duyệt:<br>
      <a href="${escapeAttr(opts.inviteUrl)}" style="color: #C8A557; text-decoration: none;">${escapeHtml(opts.inviteUrl)}</a>
    </p>
  </div>
</body></html>`;
  return { subject, html };
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function escapeAttr(s: string): string { return escapeHtml(s); }
