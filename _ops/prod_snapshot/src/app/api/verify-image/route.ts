import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const uid = formData.get('uid') as string | null;

    if (!image) {
      return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 400 });
    }

    // Mô phỏng thời gian xử lý AI phân tích ảnh (1.5 giây)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Thuật toán AI giả lập (30% xác suất phát hiện hàng giả)
    const isSuspicious = Math.random() > 0.7; 
    const confidence = (Math.random() * (0.98 - 0.75) + 0.75).toFixed(2);
    
    let result = {
      status: 'genuine',
      confidence: confidence,
      message: 'Hình ảnh logo và bao bì khớp với dữ liệu gốc của nhà sản xuất.',
      details: {
        logoMatch: true,
        fontMatch: true,
        colorProfile: 'matched'
      }
    };

    if (isSuspicious) {
      result = {
        status: 'fake',
        confidence: confidence,
        message: 'Cảnh báo: Phát hiện sai lệch về font chữ và màu sắc so với bao bì chuẩn.',
        details: {
          logoMatch: false,
          fontMatch: false,
          colorProfile: 'mismatched'
        }
      };

      // Tự động tạo cảnh báo vào Database nếu phát hiện bất thường
      if (uid) {
        await prisma.canhBao.create({
          data: {
            loai: 'AI_VISION_SUSPECT',
            mucDo: 'high',
            moTa: `AI nhận diện bao bì/logo có dấu hiệu làm giả từ ảnh upload (Mã: ${uid}). Độ tin cậy: ${confidence}`,
            uid: uid,
            trangThai: 'open'
          }
        });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Verify Error:", error);
    return NextResponse.json({ error: 'Lỗi trong quá trình xử lý hình ảnh AI' }, { status: 500 });
  }
}
