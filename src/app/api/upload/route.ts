import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireActiveSession } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for KYC docs
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_KYC   = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole     = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    const formData  = await req.formData();
    const file      = formData.get('file') as File | null;
    const uploadType = formData.get('type') as string; // 'product' | 'certificate' | 'report' | 'kyc'
    const kycField  = formData.get('kycField') as string | null; // 'giayphep_url' | 'cmnd_url'

    const isPendingKyc = uploadType === 'kyc' && kycField === '__pending__';
    const isReport = uploadType === 'report';
    const isKyc = uploadType === 'kyc';

    // ── Auth gate ─────────────────────────────────────────────────────────────
    // Allow: pre-login KYC uploads (during registration) and public report uploads
    // Block: suspended/revoked accounts for all other uploads
    if (!isPendingKyc && !isReport) {
      const guard = await requireActiveSession();
      if (guard.error) return guard.error;

      const userRole = guard.userRole;
      if (!['admin', 'manufacturer', 'importer'].includes(userRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file trong request' }, { status: 400 });
    }

    // ── Validation ──────────────────────────────────────────────────────────
    const allowedTypes = isKyc ? ALLOWED_KYC : ALLOWED_IMAGE;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: isKyc ? 'Chỉ chấp nhận PDF, JPG, PNG, WebP' : 'Chỉ chấp nhận JPG, PNG, WebP'
      }, { status: 400 });
    }

    const maxSize = isKyc ? MAX_FILE_SIZE : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File quá lớn. Tối đa ${isKyc ? '10' : '5'}MB` }, { status: 400 });
    }

    // ── Save file ───────────────────────────────────────────────────────────
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1].replace('jpeg', 'jpg');
    const safeName = `${randomUUID()}.${ext}`;

    let folder = 'products';
    if (uploadType === 'certificate') folder = 'certificates';
    if (uploadType === 'report')      folder = 'reports';
    if (uploadType === 'kyc')         folder = 'kyc';

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeName);
    const bytes    = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const publicUrl = `/uploads/${folder}/${safeName}`;

    // ── KYC: auto-save url to DoanhNghiep ───────────────────────────────────
    if (isKyc && kycField && doanhNghiepId) {
      const allowed = ['giayphep_url', 'cmnd_url'];
      if (allowed.includes(kycField)) {
        await prisma.doanhNghiep.update({
          where: { id: doanhNghiepId },
          data: { [kycField]: publicUrl },
        });
      }
    }

    return NextResponse.json({ url: publicUrl, fileName: safeName }, { status: 201 });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi upload file' }, { status: 500 });
  }
}
