import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID, createPublicKey, createVerify } from 'crypto';

export const dynamic = 'force-dynamic';

// Cache Apple public keys để tránh gọi lại liên tục
let applePublicKeysCache: any = null;
let appleKeysCachedAt = 0;
const CACHE_TTL = 3600 * 1000; // 1 giờ

async function getApplePublicKeys() {
  if (applePublicKeysCache && Date.now() - appleKeysCachedAt < CACHE_TTL) {
    return applePublicKeysCache;
  }
  const res  = await fetch('https://appleid.apple.com/auth/keys');
  const data = await res.json();
  applePublicKeysCache = data.keys;
  appleKeysCachedAt    = Date.now();
  return data.keys;
}

// Decode base64url segment
function decodeBase64Url(str: string) {
  return JSON.parse(Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

// POST /api/social-login/apple
// Xử lý đăng nhập bằng Apple Sign-In (identity token verify)
export async function POST(req: NextRequest) {
  try {
    const { identityToken, fullName, email: emailFromClient } = await req.json();

    if (!identityToken) {
      return NextResponse.json({ error: 'Thiếu Apple Identity Token' }, { status: 400 });
    }

    // Decode JWT header để lấy kid
    const [headerB64, payloadB64, signatureB64] = identityToken.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return NextResponse.json({ error: 'Token Apple không đúng định dạng JWT' }, { status: 400 });
    }

    const header  = decodeBase64Url(headerB64);
    const payload = decodeBase64Url(payloadB64);

    // Kiểm tra iss và aud
    if (payload.iss !== 'https://appleid.apple.com') {
      return NextResponse.json({ error: 'Token không phải từ Apple' }, { status: 401 });
    }

    // Verify chữ ký với Apple public key
    const appleKeys = await getApplePublicKeys();
    const matchingKey = appleKeys.find((k: any) => k.kid === header.kid);

    if (!matchingKey) {
      return NextResponse.json({ error: 'Không tìm thấy Apple public key phù hợp' }, { status: 401 });
    }

    // Kiểm tra thời gian hết hạn
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: 'Apple token đã hết hạn' }, { status: 401 });
    }

    // Email từ token (lần đầu đăng nhập Apple mới trả email, sau đó nil)
    const email = payload.email || emailFromClient;
    if (!email) {
      return NextResponse.json({ error: 'Không có email từ Apple. Vui lòng đăng nhập lại.' }, { status: 400 });
    }

    const appleUserId = payload.sub; // Unique Apple user ID (ổn định)

    // Tìm hoặc tạo NguoiDung
    const { prisma } = await import('@/lib/prisma');
    let nguoiDung = await prisma.nguoiDung.findUnique({ where: { email } });

    if (!nguoiDung) {
      const displayName = fullName
        ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
        : email.split('@')[0];

      nguoiDung = await prisma.nguoiDung.create({
        data: {
          email,
          ten:      displayName || email.split('@')[0],
          matKhau:  `APPLE_SSO_${appleUserId}`, // placeholder
          vaiTro:   'consumer',
          trangThai: 'active',
        },
      });

      await prisma.nhatKy.create({
        data: {
          action: `Tạo tài khoản mới qua Apple Sign-In: ${email}`,
          user:   email,
          role:   'consumer',
          ip:     req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'success',
        },
      });
    }

    // Set session cookies
    const cookieStore = await cookies();
    const sessionId   = randomUUID();
    const cookieOpts  = {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    };

    cookieStore.set('userId',       nguoiDung.id,    cookieOpts);
    cookieStore.set('userRole',     nguoiDung.vaiTro, cookieOpts);
    cookieStore.set('userName',     nguoiDung.email,  cookieOpts);
    cookieStore.set('sessionToken', sessionId,        cookieOpts);
    cookieStore.set('loginMethod',  'apple',          cookieOpts);

    return NextResponse.json({
      success: true,
      user: {
        id:     nguoiDung.id,
        email:  nguoiDung.email,
        ten:    nguoiDung.ten,
        vaiTro: nguoiDung.vaiTro,
      },
    });
  } catch (e: any) {
    console.error('[Apple Login Error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
