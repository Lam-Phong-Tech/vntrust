import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/social-login/google
// Xử lý đăng nhập bằng Google OAuth2 (ID token verify)
// Tích hợp: client gửi Google idToken → server verify → tạo session cookie
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Thiếu Google ID Token' }, { status: 400 });
    }

    // Verify Google ID Token qua Google tokeninfo endpoint
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const verifyRes = await fetch(verifyUrl);

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Google token không hợp lệ hoặc đã hết hạn' }, { status: 401 });
    }

    const googlePayload = await verifyRes.json();
    const { email, name, picture, sub: googleId } = googlePayload;

    if (!email) {
      return NextResponse.json({ error: 'Không lấy được email từ Google' }, { status: 400 });
    }

    // Tìm hoặc tạo NguoiDung
    const { prisma } = await import('@/lib/prisma');
    let nguoiDung = await prisma.nguoiDung.findUnique({ where: { email } });

    if (!nguoiDung) {
      // Tạo tài khoản mới từ Google
      nguoiDung = await prisma.nguoiDung.create({
        data: {
          email,
          ten:      name || email.split('@')[0],
          matKhau:  `GOOGLE_SSO_${googleId}`, // placeholder — không dùng để đăng nhập thường
          vaiTro:   'consumer',
          avatar:   picture || null,
          trangThai: 'active',
        },
      });

      // Ghi nhật ký tài khoản mới
      await prisma.nhatKy.create({
        data: {
          action: `Tạo tài khoản mới qua Google SSO: ${email}`,
          user:   email,
          role:   'consumer',
          ip:     req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'success',
        },
      });
    }

    // Tạo session cookies (giống pattern hiện tại của hệ thống)
    const cookieStore = await cookies();
    const sessionId   = randomUUID();

    const cookieOpts = {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge:   60 * 60 * 24 * 7, // 7 ngày
      path:     '/',
    };

    cookieStore.set('userId',       nguoiDung.id,           cookieOpts);
    cookieStore.set('userRole',     nguoiDung.vaiTro,        cookieOpts);
    cookieStore.set('userName',     nguoiDung.email,         cookieOpts);
    cookieStore.set('sessionToken', sessionId,               cookieOpts);
    cookieStore.set('loginMethod',  'google',                cookieOpts);

    return NextResponse.json({
      success: true,
      user: {
        id:     nguoiDung.id,
        email:  nguoiDung.email,
        ten:    nguoiDung.ten,
        vaiTro: nguoiDung.vaiTro,
        avatar: nguoiDung.avatar,
      },
    });
  } catch (e: any) {
    console.error('[Google Login Error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
