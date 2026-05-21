import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const resolvedParams = await params;
    const uid = resolvedParams.uid;
    let score = 100;

    // 1. Code/UID Validation (20%)
    const maDinhDanh = await prisma.maDinhDanh.findUnique({ where: { uid } }) 
      || await prisma.maDinhDanh.findUnique({ where: { serialNumber: uid } });
    
    if (!maDinhDanh) {
      score -= 80; // Invalid UID means completely fake, severe penalty
    } else {
      if (maDinhDanh.trangThai === 'fake') score -= 80;
    }

    // 2. Community Report Score (10%)
    const reports = await prisma.canhBao.count({ where: { uid, loai: 'NGUOI_DUNG_BAO_CAO' } });
    if (reports >= 3) score -= 10;
    else if (reports === 2) score -= 6;
    else if (reports === 1) score -= 3;

    // 3. Batch/Scan Anomaly Score (10%)
    if (maDinhDanh) {
       if (maDinhDanh.soLanQuet >= 10) score -= 10;
       else if (maDinhDanh.soLanQuet >= 5) score -= 5;
    }

    // 4. Image & OCR Matching (35% + 25% = 60%)
    // Dựa trên kết quả từ API verify-image
    const aiAlerts = await prisma.canhBao.count({ where: { uid, loai: 'AI_VISION_SUSPECT' } });
    if (aiAlerts > 0) {
       score -= 60; // Trừ toàn bộ điểm Image/OCR nếu AI phát hiện là hàng giả
    }

    // Đảm bảo điểm nằm trong khoảng 0-100
    score = Math.max(0, Math.min(100, score));

    // Phân loại màu sắc và trạng thái theo tài liệu
    let color = 'Green';
    let statusLabel = 'Chính hãng - Tin cậy cao';
    
    if (score < 30) { 
      color = 'DarkRed'; 
      statusLabel = 'Hàng giả - Không hợp lệ'; 
    } else if (score < 50) { 
      color = 'LightRed'; 
      statusLabel = 'Rủi ro cao - Có dấu hiệu hàng giả'; 
    } else if (score < 70) { 
      color = 'Orange'; 
      statusLabel = 'Nghi ngờ - Cần xác minh'; 
    } else if (score < 90) { 
      color = 'Yellow'; 
      statusLabel = 'Chính hãng - Cần theo dõi'; 
    }

    return NextResponse.json({
       uid,
       trustScore: score,
       color,
       statusLabel,
       details: {
          uidValid: !!maDinhDanh,
          communityReports: reports,
          scanCount: maDinhDanh?.soLanQuet || 0,
          aiAnomalies: aiAlerts > 0
       }
    });
  } catch (error: any) {
    console.error("Trust Score Error:", error);
    return NextResponse.json({ error: 'Lỗi tính toán Trust Score' }, { status: 500 });
  }
}
