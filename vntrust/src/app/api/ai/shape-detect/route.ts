// POST /api/ai/shape-detect
// Nhận diện hình dạng sản phẩm bất thường (Segmentation Placeholder)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const uid = formData.get('uid') as string | null;

    if (!image) return NextResponse.json({ error: 'Thiếu ảnh' }, { status: 400 });

    // TODO (Giai đoạn 2): Tích hợp Image Segmentation Model để nhận diện hình dáng chai lọ, hộp...
    
    // Giả lập kết quả
    const mockShapeMatch = 0.92; // 92%
    const verdict = mockShapeMatch >= 0.85 ? 'dat' : mockShapeMatch >= 0.65 ? 'nghi_van' : 'vi_pham';
    const riskScore = verdict === 'dat' ? 0 : verdict === 'nghi_van' ? 30 : 60;

    if (uid) {
      await prisma.verificationChecklist.create({
        data: {
          uid,
          hangMuc: 'Shape Detection — Nhận diện hình dạng',
          tangKiemTra: 'tang3_ai_vision',
          ketQua: verdict,
          mauHienThi: verdict === 'dat' ? 'green' : verdict === 'nghi_van' ? 'yellow' : 'red',
          diemRuiRo: riskScore,
          chiTiet: JSON.stringify({ shapeMatch: mockShapeMatch, model: 'placeholder_segmentation_model' }),
          aiModel: 'shape_detect',
          tuDong: true,
        }
      });
    }

    return NextResponse.json({
      shapeMatch: mockShapeMatch,
      score: Math.round(mockShapeMatch * 100),
      verdict,
      riskScore,
      message: verdict === 'dat' ? 'Hình dáng sản phẩm chuẩn' : 'Hình dáng sản phẩm có điểm bất thường',
      note: 'Tính năng đang sử dụng placeholder model (Giai đoạn 2)'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
