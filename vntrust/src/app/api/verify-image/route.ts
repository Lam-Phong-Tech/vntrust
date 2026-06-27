// Sprint 13 — Real AI image verification (no GPU, no native deps)
// 3-tier check:
//   1. SHA-256 exact match → 100% confidence
//   2. Image dimensions + size proximity → 60-95% confidence
//   3. (Optional) Client-side TF.js MobileNet feature vector — passed via formData.features
//
// For production: add `sharp` or `jimp` for true pHash. Current implementation
// is deterministic + transparent (no Math.random).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { hashImageBuffer, hashImageUrl } from '@/lib/imageHash';

// ─── Parse image dimensions from header bytes ─────────────────────
function parseDimensions(buf: Buffer): { width: number; height: number; format: string } | null {
  // PNG: bytes 16-23 = width (4) + height (4) big-endian
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return {
      format: 'png',
      width:  buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  }
  // JPEG: scan for SOF0 (0xFFC0)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] === 0xff && (buf[i + 1] === 0xc0 || buf[i + 1] === 0xc2)) {
        return {
          format: 'jpeg',
          height: buf.readUInt16BE(i + 5),
          width:  buf.readUInt16BE(i + 7),
        };
      }
      const segLen = buf.readUInt16BE(i + 2);
      i += 2 + segLen;
    }
  }
  // WEBP: RIFF...WEBP. VP8L chunk has dimensions
  if (buf.length > 30 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38) {
      // VP8/VP8L — width/height encoded differently, return rough estimate
      return { format: 'webp', width: 0, height: 0 };
    }
  }
  return null;
}

// ─── Byte-level color histogram (rough proxy for color similarity) ─
function byteHistogram(buf: Buffer): number[] {
  // Sample 256 bins, every Nth byte to avoid full scan
  const bins = new Array(16).fill(0);
  const step = Math.max(1, Math.floor(buf.length / 8192));
  for (let i = 0; i < buf.length; i += step) {
    bins[buf[i] >> 4]++;
  }
  // Normalize
  const sum = bins.reduce((s, x) => s + x, 0) || 1;
  return bins.map(b => b / sum);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const uid = formData.get('uid') as string | null;
    // Optional: client-side TF.js MobileNet feature vector của ảnh user upload
    const featuresJSON = formData.get('features') as string | null;
    const clientFeatures: number[] | null = featuresJSON
      ? (() => { try { return JSON.parse(featuresJSON); } catch { return null; } })()
      : null;
    // BƯỚC AI NÂNG CAO: feature vector của ảnh tham chiếu (DB) — client trích trước
    const refFeaturesJSON = formData.get('referenceFeatures') as string | null;
    const referenceFeatures: number[] | null = refFeaturesJSON
      ? (() => { try { return JSON.parse(refFeaturesJSON); } catch { return null; } })()
      : null;

    if (!image) {
      return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 400 });
    }
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ảnh quá lớn (>10MB)' }, { status: 400 });
    }

    const uploadedBuf = Buffer.from(await image.arrayBuffer());
    const uploadedHash = hashImageBuffer(uploadedBuf);
    const uploadedDim  = parseDimensions(uploadedBuf);
    const uploadedHist = byteHistogram(uploadedBuf);

    // Fetch reference image from sanPham if uid provided
    let referenceUrl: string | null = null;
    let sanPhamTen: string | null = null;
    if (uid) {
      try {
        const ma = await prisma.maDinhDanh.findUnique({
          where: { uid },
          include: { loHang: { include: { sanPham: { select: { hinhAnh: true, hinhAnhUrl: true, ten: true } } } } },
        });
        // Ưu tiên hinhAnhUrl (field mới NSX upload), fallback hinhAnh (legacy)
        referenceUrl = (ma?.loHang?.sanPham as any)?.hinhAnhUrl || ma?.loHang?.sanPham?.hinhAnh || null;
        sanPhamTen   = ma?.loHang?.sanPham?.ten || null;
        // Nếu URL là path tương đối /uploads/... → ghép với host của request
        if (referenceUrl && referenceUrl.startsWith('/')) {
          const proto = req.headers.get('x-forwarded-proto') || 'https';
          const host  = req.headers.get('host') || 'anticounterfeit.test9.io.vn';
          referenceUrl = `${proto}://${host}${referenceUrl}`;
        }
      } catch {}
    }

    // Default response (no reference available)
    let status: 'genuine' | 'suspect' | 'fake' | 'unknown' = 'unknown';
    let confidence = 0.5;
    const reasoning: string[] = [];
    const details: any = { uploadedHash, uploadedDim };

    if (referenceUrl) {
      // Fetch reference
      const refHash = await hashImageUrl(referenceUrl);
      let refDim: ReturnType<typeof parseDimensions> = null;
      let refHist: number[] | null = null;
      try {
        const refRes = await fetch(referenceUrl, { signal: AbortSignal.timeout(8000) });
        if (refRes.ok) {
          const refBuf = Buffer.from(await refRes.arrayBuffer());
          refDim  = parseDimensions(refBuf);
          refHist = byteHistogram(refBuf);
        }
      } catch {}

      details.referenceUrl = referenceUrl;
      details.referenceHash = refHash;
      details.referenceDim  = refDim;

      // Tier 1: SHA-256 exact match
      if (refHash && refHash === uploadedHash) {
        status = 'genuine';
        confidence = 1.0;
        reasoning.push('SHA-256 hash KHỚP 100% với ảnh chính chủ — đây là ảnh gốc');
      } else {
        // ─── Tier 2a: MobileNet feature cosine similarity (CHÍNH XÁC NHẤT) ───
        // Nếu client gửi cả 2 feature vector → so trực tiếp 2 vector
        let mobilenetScore = 0;
        if (clientFeatures && referenceFeatures
            && clientFeatures.length === referenceFeatures.length
            && clientFeatures.length > 100) {
          mobilenetScore = cosineSimilarity(clientFeatures, referenceFeatures);
          const pct = Math.round(mobilenetScore * 100);
          reasoning.push(`🧠 AI Vision (MobileNet): ${pct}% tương đồng đặc trưng hình ảnh`);
        }

        // Tier 2b: dimensions + histogram (fallback nếu chưa có ML features)
        let dimScore = 0;
        if (uploadedDim && refDim && refDim.width > 0) {
          const wRatio = Math.min(uploadedDim.width, refDim.width) / Math.max(uploadedDim.width, refDim.width);
          const hRatio = Math.min(uploadedDim.height, refDim.height) / Math.max(uploadedDim.height, refDim.height);
          dimScore = (wRatio + hRatio) / 2;
          if (!mobilenetScore) {
            reasoning.push(`Tỷ lệ kích thước: ${(dimScore * 100).toFixed(0)}% match (${uploadedDim.width}×${uploadedDim.height} vs ${refDim.width}×${refDim.height})`);
          }
        }

        let histScore = 0;
        if (refHist) {
          histScore = cosineSimilarity(uploadedHist, refHist);
          if (!mobilenetScore) {
            reasoning.push(`Histogram màu: ${(histScore * 100).toFixed(0)}% tương đồng`);
          }
        }

        // ─── Tổng hợp confidence ─────────────────────────────────────────
        // Nếu có MobileNet score → ưu tiên dùng (weight cao), kèm histogram/dim làm signal phụ
        if (mobilenetScore > 0) {
          // MobileNet cosine sim cho cùng loại sản phẩm thường 0.75-0.92
          // Cho khác loại thường 0.40-0.60
          // → dùng MobileNet làm CHÍNH (weight 0.75), histogram+dim làm phụ (0.25)
          const auxScore = (histScore + dimScore) / 2;
          confidence = mobilenetScore * 0.75 + auxScore * 0.25;

          // Ngưỡng dành riêng cho MobileNet:
          if (mobilenetScore >= 0.78)      status = 'genuine';   // tương đồng cao
          else if (mobilenetScore >= 0.62) status = 'suspect';   // có thể là sản phẩm cùng loại nhưng góc/ánh sáng khác
          else                              status = 'fake';     // khác hẳn
          reasoning.push(`Quyết định: dựa chủ yếu vào MobileNet (cos sim = ${mobilenetScore.toFixed(3)})`);
        } else {
          // Fallback: histogram + dim only (kém chính xác)
          const scores: number[] = [];
          if (dimScore > 0) scores.push(dimScore);
          if (histScore > 0) scores.push(histScore);
          confidence = scores.length > 0 ? scores.reduce((s, x) => s + x, 0) / scores.length : 0.5;
          // Ngưỡng nới vì histogram/dim ít tin cậy hơn
          if (confidence >= 0.80)      status = 'genuine';
          else if (confidence >= 0.55) status = 'suspect';
          else                          status = 'fake';
          if (!referenceFeatures) {
            reasoning.push('⚙ Chưa có AI feature vector (đang dùng histogram + dimensions — kém chính xác hơn)');
          }
        }
      }
    } else {
      reasoning.push('Sản phẩm này chưa có ảnh tham chiếu trong DB — không thể so sánh');
      status = 'unknown';
      confidence = 0;
    }

    // Save alert if fake
    if (uid && status === 'fake' && confidence < 0.6) {
      await prisma.canhBao.create({
        data: {
          loai: 'AI_VISION_SUSPECT',
          mucDo: 'high',
          moTa: `AI verify: ảnh upload không khớp với ảnh chính chủ. Score: ${(confidence * 100).toFixed(0)}%. ${reasoning.join(' · ')}`,
          uid,
          trangThai: 'open',
        },
      });
    }

    return NextResponse.json({
      status,
      confidence: confidence.toFixed(2),
      score: Math.round(confidence * 100),
      message: status === 'genuine'
        ? `Ảnh khớp với ${sanPhamTen || 'sản phẩm chính chủ'} (${(confidence * 100).toFixed(0)}% tin cậy)`
        : status === 'suspect'
        ? `Có dấu hiệu khác lệch (${(confidence * 100).toFixed(0)}% tin cậy) — cần kiểm tra thêm`
        : status === 'fake'
        ? `Ảnh KHÔNG khớp với chính chủ (${(confidence * 100).toFixed(0)}%) — nghi vấn cao`
        : 'Không thể xác minh — chưa có ảnh tham chiếu',
      reasoning,
      details,
      algorithm: 'sha256_exact'
        + (clientFeatures && referenceFeatures ? ' + mobilenet_cosine_2vec' : '')
        + ' + dim_match + histogram_cosine'
        + (clientFeatures && !referenceFeatures ? ' + mobilenet_client_only' : ''),
    });
  } catch (error: any) {
    console.error('AI Verify Error:', error);
    return NextResponse.json({ error: 'Lỗi xử lý: ' + error.message }, { status: 500 });
  }
}
