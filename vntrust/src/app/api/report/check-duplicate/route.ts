// POST /api/report/check-duplicate — kiểm tra ảnh báo cáo có trùng spam không
// Body: { imageUrl } → hash → tra trong CanhBao
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashImageUrl } from '@/lib/imageHash';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl } = body;
    if (!imageUrl) return NextResponse.json({ error: 'missing_imageUrl' }, { status: 400 });

    const hash = await hashImageUrl(imageUrl);
    if (!hash) return NextResponse.json({ error: 'cannot_fetch_or_hash_image' }, { status: 400 });

    // Tra reports khác có cùng hash
    const duplicates = await prisma.canhBao.findMany({
      where: { hinhAnhHash: hash, loai: { startsWith: 'NGUOI_DUNG_BAO_CAO' } },
      take: 5,
      orderBy: { thoiGian: 'desc' },
      select: { id: true, thoiGian: true, uid: true, mucDo: true, trangThai: true },
    });

    return NextResponse.json({
      hash,
      isDuplicate: duplicates.length > 0,
      duplicates,
      message: duplicates.length > 0
        ? `Ảnh này đã xuất hiện trong ${duplicates.length} báo cáo trước đó — có thể là spam.`
        : 'Ảnh này chưa từng được báo cáo.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
