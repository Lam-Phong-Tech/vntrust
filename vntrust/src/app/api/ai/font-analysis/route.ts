// POST /api/ai/font-analysis
// Phân tích kiểu chữ trên bao bì (Placeholder cho AI Vision Model trong Giai đoạn sau)
// Nhận diện sự bất thường của font chữ in trên bao bì so với chuẩn

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const uid = formData.get('uid') as string | null;

    if (!image) return NextResponse.json({ error: 'Thiếu ảnh' }, { status: 400 });

    // TODO (Giai đoạn 2): Tích hợp model Computer Vision phân tích font chữ
    // Hiện tại là mô phỏng rule-based dựa trên image metadata hoặc AI placeholder
    
    // Giả lập kết quả trả về
    const mockSimilarity = 0.85; // 85%
    const verdict = mockSimilarity >= 0.90 ? 'dat' : mockSimilarity >= 0.70 ? 'nghi_van' : 'vi_pham';
    const riskScore = verdict === 'dat' ? 0 : verdict === 'nghi_van' ? 20 : 50;

    if (uid) {
      await prisma.verificationChecklist.create({
        data: {
          uid,
          hangMuc: 'Font Analysis — Phân tích kiểu chữ',
          tangKiemTra: 'tang3_ai_vision',
          ketQua: verdict,
          mauHienThi: verdict === 'dat' ? 'green' : verdict === 'nghi_van' ? 'yellow' : 'red',
          diemRuiRo: riskScore,
          chiTiet: JSON.stringify({ similarity: mockSimilarity, model: 'placeholder_font_model' }),
          aiModel: 'font_analysis',
          tuDong: true,
        }
      });
    }

    return NextResponse.json({
      similarity: mockSimilarity,
      score: Math.round(mockSimilarity * 100),
      verdict,
      riskScore,
      message: verdict === 'dat' ? 'Kiểu chữ khớp với thiết kế chuẩn' : 'Phát hiện kiểu chữ in bất thường',
      note: 'Tính năng đang sử dụng placeholder model (Giai đoạn 2)'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
