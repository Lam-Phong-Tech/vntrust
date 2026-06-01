// Trust Score 0-100 theo công thức tài liệu nghiệp vụ §IV.6
// Trọng số (weights):
//   - Image matching:     35% (Siamese Network — placeholder: dùng cảnh báo AI_VISION_SUSPECT)
//   - Text/OCR matching:  25% (PaddleOCR — placeholder: OCR_MISMATCH alert)
//   - Code/UID validation: 20%
//   - Community report:   10%
//   - Batch anomaly:      10%
// Bonus: trừ 15 điểm nếu lô hàng có hậu kiểm vượt ngưỡng đã verified.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const WEIGHTS = { image: 35, ocr: 25, uid: 20, community: 10, anomaly: 10 } as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    const maDinhDanh = await prisma.maDinhDanh.findUnique({ where: { uid } })
      || await prisma.maDinhDanh.findUnique({ where: { serialNumber: uid } });

    // 1. UID validation (20%)
    let uidRatio = 0;
    if (maDinhDanh) {
      if (maDinhDanh.trangThai === 'fake')          uidRatio = 0;
      else if (maDinhDanh.trangThai === 'flagged')  uidRatio = 0.3;
      else if (maDinhDanh.trangThai === 'expired')  uidRatio = 0.5;
      else                                          uidRatio = 1.0;
    }

    // 2. Community report (10%)
    const reportsCount = await prisma.canhBao.count({
      where: { uid, loai: { startsWith: 'NGUOI_DUNG_BAO_CAO' } },
    });
    const communityRatio = Math.max(0, 1 - reportsCount * 0.25);

    // 3. Batch/scan anomaly (10%)
    let anomalyRatio = 1.0;
    if (maDinhDanh) {
      if (maDinhDanh.soLanQuet >= 10)      anomalyRatio = 0;
      else if (maDinhDanh.soLanQuet >= 5)  anomalyRatio = 0.5;
      else if (maDinhDanh.soLanQuet >= 3)  anomalyRatio = 0.8;
    }

    // 4. Image matching (35%)
    const aiVisionAlerts = await prisma.canhBao.count({
      where: { uid, loai: 'AI_VISION_SUSPECT', trangThai: { not: 'closed' } },
    });
    const imageRatio = aiVisionAlerts > 0 ? 0 : 1.0;

    // 5. OCR/text matching (25%)
    const ocrAlerts = await prisma.canhBao.count({
      where: { uid, loai: 'OCR_MISMATCH', trangThai: { not: 'closed' } },
    });
    const ocrRatio = ocrAlerts > 0 ? 0.3 : 1.0;

    // Penalty: hậu kiểm vượt ngưỡng đã verified
    let hauKiemPenalty = 0;
    if (maDinhDanh?.loHangId) {
      const violations = await prisma.ketQuaHauKiem.count({
        where: { loHangId: maDinhDanh.loHangId, ketQua: 'khongdambao', trangThaiXacMinh: 'verified' },
      });
      if (violations > 0) hauKiemPenalty = 15;
    }

    const components = {
      image:     Math.round(imageRatio     * WEIGHTS.image),
      ocr:       Math.round(ocrRatio       * WEIGHTS.ocr),
      uid:       Math.round(uidRatio       * WEIGHTS.uid),
      community: Math.round(communityRatio * WEIGHTS.community),
      anomaly:   Math.round(anomalyRatio   * WEIGHTS.anomaly),
    };
    let trustScore = components.image + components.ocr + components.uid + components.community + components.anomaly;
    trustScore = Math.max(0, trustScore - hauKiemPenalty);

    let color: string, statusLabel: string;
    if (trustScore >= 90)      { color = 'Green';    statusLabel = 'Chính hãng — Tin cậy cao'; }
    else if (trustScore >= 70) { color = 'Yellow';   statusLabel = 'Chính hãng — Cần theo dõi'; }
    else if (trustScore >= 50) { color = 'Orange';   statusLabel = 'Nghi ngờ — Cần xác minh'; }
    else if (trustScore >= 30) { color = 'LightRed'; statusLabel = 'Rủi ro cao — Có dấu hiệu hàng giả'; }
    else                       { color = 'DarkRed';  statusLabel = 'Hàng giả — Không hợp lệ'; }

    return NextResponse.json({
      uid,
      trustScore,
      color,
      statusLabel,
      weights: WEIGHTS,
      components,
      hauKiemPenalty,
      details: {
        uidValid:          !!maDinhDanh,
        uidStatus:         maDinhDanh?.trangThai || 'not_found',
        communityReports:  reportsCount,
        scanCount:         maDinhDanh?.soLanQuet || 0,
        aiVisionAnomalies: aiVisionAlerts,
        ocrMismatches:     ocrAlerts,
      },
    });
  } catch (error: any) {
    console.error('Trust Score Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
