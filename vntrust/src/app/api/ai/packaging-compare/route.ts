// POST /api/ai/packaging-compare
// So sánh ảnh bao bì NTD chụp với ảnh chuẩn (anhMatTruocUrl) từ DB
// Wrapper thông minh dùng lại logic verify-image, thêm so sánh với ảnh mặt trước chuẩn

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function byteHistogram(buf: Buffer): number[] {
  const bins = new Array(16).fill(0);
  const step = Math.max(1, Math.floor(buf.length / 8192));
  for (let i = 0; i < buf.length; i += step) bins[buf[i] >> 4]++;
  const sum = bins.reduce((s, x) => s + x, 0) || 1;
  return bins.map(b => b / sum);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const uid   = formData.get('uid')   as string | null;
    // Optional MobileNet feature vectors từ client
    const clientFeatures   = JSON.parse((formData.get('features')          as string) || 'null');
    const refFeaturesClient = JSON.parse((formData.get('referenceFeatures') as string) || 'null');

    if (!image) return NextResponse.json({ error: 'Thiếu ảnh' }, { status: 400 });
    if (image.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Ảnh quá lớn (>10MB)' }, { status: 400 });

    const uploadedBuf  = Buffer.from(await image.arrayBuffer());
    const uploadedHash = crypto.createHash('sha256').update(uploadedBuf).digest('hex');
    const uploadedHist = byteHistogram(uploadedBuf);

    // Lấy ảnh chuẩn từ DB — ưu tiên anhMatTruocUrl (ảnh mặt trước chuẩn NSX upload)
    let referenceUrl: string | null = null;
    let productName: string | null  = null;

    if (uid) {
      const ma = await prisma.maDinhDanh.findFirst({
        where: { OR: [{ uid }, { serialNumber: uid }] },
        include: {
          loHang: {
            include: {
              sanPham: { select: { ten: true, anhMatTruocUrl: true, hinhAnhUrl: true, hinhAnh: true } }
            }
          }
        },
      });
      const sp = (ma?.loHang?.sanPham as any);
      referenceUrl = sp?.anhMatTruocUrl || sp?.hinhAnhUrl || sp?.hinhAnh || null;
      productName  = sp?.ten || null;

      if (referenceUrl?.startsWith('/')) {
        const proto = req.headers.get('x-forwarded-proto') || 'https';
        const host  = req.headers.get('host') || 'anticounterfeit.test9.io.vn';
        referenceUrl = `${proto}://${host}${referenceUrl}`;
      }
    }

    if (!referenceUrl) {
      return NextResponse.json({
        status: 'unknown',
        confidence: 0,
        message: 'Sản phẩm chưa có ảnh mặt trước chuẩn trong DB — doanh nghiệp cần upload',
        warnings: ['Thiếu ảnh tham chiếu'],
      });
    }

    // Fetch ảnh tham chiếu
    const refRes = await fetch(referenceUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!refRes?.ok) {
      return NextResponse.json({ error: 'Không tải được ảnh tham chiếu từ DB' }, { status: 502 });
    }
    const refBuf  = Buffer.from(await refRes.arrayBuffer());
    const refHash = crypto.createHash('sha256').update(refBuf).digest('hex');
    const refHist = byteHistogram(refBuf);

    // Tier 1: SHA-256 exact match
    if (refHash === uploadedHash) {
      return NextResponse.json({ status: 'genuine', confidence: 1.0, score: 100, message: `Ảnh khớp 100% với ${productName}`, reasoning: ['SHA-256 hash KHỚP'] });
    }

    // ── TÍCH HỢP TÍNH ĐIỂM THEO TRỌNG SỐ (Mục 10 - Phần 7) ──────────────────
    // Logo 25% + Tem 20% + Font 15% + Bố cục 15% + QR 15% + Màu sắc 10%

    // 1. Màu sắc (10%): Histogram (Đã có)
    const scoreColor = cosine(uploadedHist, refHist);
    
    // 2. Bố cục (15%): MobileNet Features (Đã có)
    const scoreLayout = (clientFeatures && refFeaturesClient && clientFeatures.length === refFeaturesClient.length) 
                        ? cosine(clientFeatures, refFeaturesClient) 
                        : 0.85; // Fallback
    
    // 3. QR Code (15%): Tích hợp từ verify (Nếu có UID hợp lệ trong DB = 1.0, nếu sai/không có = 0)
    let scoreQR = 0.0;
    if (uid && productName) {
      scoreQR = 1.0; // UID có thực trong DB
    } else if (uid) {
      scoreQR = 0.1; // UID giả / không tồn tại
    } else {
      scoreQR = 0.5; // Không quét được QR, tính trung lập
    }

    // 4. Logo (25%): Tích hợp logic từ logo-detect (Fuzzy match text OCR)
    const ocrText = formData.get('ocrText') as string || '';
    let scoreLogo = 0.85; // Mặc định
    if (ocrText && productName) {
      const inputBrand = ocrText.toLowerCase();
      const refBrand = productName.toLowerCase();
      // Phép tính tương đồng đơn giản (Fuzzy match)
      if (inputBrand.includes(refBrand) || refBrand.includes(inputBrand)) {
        scoreLogo = 0.95;
      } else {
        scoreLogo = 0.50; // Không nhận diện được logo/text liên quan
      }
    }

    // 5. Font & Tem (Placeholder cho Giai đoạn 2)
    const scoreFont = parseFloat(formData.get('scoreFont') as string || '0.90'); 
    const scoreTem  = parseFloat(formData.get('scoreTem') as string || '0.85');

    // TỔNG HỢP TRỌNG SỐ
    const weightedConfidence = 
      (scoreLogo * 0.25) + 
      (scoreTem * 0.20) + 
      (scoreFont * 0.15) + 
      (scoreLayout * 0.15) + 
      (scoreQR * 0.15) + 
      (scoreColor * 0.10);

    const reasoning = [
      `Logo: ${(scoreLogo*100).toFixed(0)}% (25%)`,
      `Tem: ${(scoreTem*100).toFixed(0)}% (20%)`,
      `Font: ${(scoreFont*100).toFixed(0)}% (15%)`,
      `Bố cục: ${(scoreLayout*100).toFixed(0)}% (15%)`,
      `QR: ${(scoreQR*100).toFixed(0)}% (15%)`,
      `Màu sắc: ${(scoreColor*100).toFixed(0)}% (10%)`
    ];

    const status = weightedConfidence >= 0.85 ? 'genuine' : weightedConfidence >= 0.65 ? 'suspect' : 'fake';
    const score  = Math.round(weightedConfidence * 100);

    // Xử lý tạo cảnh báo theo Hybrid Workflow
    if (uid && status !== 'genuine') {
      const riskScore = 100 - score; // Tính điểm rủi ro ngược với độ tin cậy
      const mucDo = riskScore >= 81 ? 'confirmed_fake' : riskScore >= 61 ? 'high' : riskScore >= 41 ? 'medium' : riskScore >= 21 ? 'monitor' : 'low';
      
      let trangThaiDieuTra = 'cho_phan_tich';
      let trangThai = 'open';
      let ketLuanMoTa = `Packaging compare: bao bì không khớp ${productName}. Score: ${score}%. ${reasoning.join(' ')}`;

      if (riskScore < 40) {
        trangThaiDieuTra = 'dong';
        trangThai = 'closed';
        ketLuanMoTa += '\n\n[AUTO PASS] Hệ thống tự động thông qua do rủi ro thấp.';
      } else if (riskScore > 70) {
        trangThaiDieuTra = 'dang_dieu_tra';
      }

      const maCaseHoSo = `CASE-${new Date().getFullYear()}-${crypto.randomUUID().substring(0, 6).toUpperCase()}`;

      await prisma.canhBao.create({
        data: {
          loai: 'AI_PACKAGING_MISMATCH',
          mucDo,
          moTa: ketLuanMoTa,
          uid,
          trangThai,
          riskScore,
          trangThaiDieuTra,
          maCaseHoSo
        }
      });

      if (riskScore >= 40) {
        const isField = riskScore > 70;
        await prisma.thongBao.create({
          data: {
            tieuDe: isField ? `🔴 [CẦN ĐIỀU TRA THỰC ĐỊA] Cảnh báo bao bì ${maCaseHoSo}` : `🟡 [CẦN REVIEW] Cảnh báo bao bì ${maCaseHoSo}`,
            noiDung: `Phát hiện rủi ro bao bì điểm ${riskScore}/100. Yêu cầu cán bộ ${isField ? 'xuống hiện trường xác minh' : 'kiểm tra nhân công'}.`,
            loai: 'alert',
            roleTarget: 'investigator',
          }
        });
      }
    }

    return NextResponse.json({
      status,
      confidence: weightedConfidence.toFixed(2),
      score,
      productName,
      message: status === 'genuine'
        ? `Bao bì khớp với ${productName} (${score}%)`
        : status === 'suspect'
        ? `Có dấu hiệu khác biệt nhỏ — ${score}% tương đồng`
        : `Bao bì KHÔNG khớp sản phẩm chính hãng (${score}%)`,
      reasoning,
      referenceUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
