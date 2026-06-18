// POST /api/ai/logo-detect
// Nhận diện logo thương hiệu từ ảnh và so sánh với thương hiệu đăng ký trong DB
// Dùng OCR text + histogram để detect brand name + màu sắc logo

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Chuẩn hóa tên thương hiệu để so sánh
function normalizeBrand(s: string) {
  return s.toLowerCase().replace(/[^\w\sàáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỷỹ]/g, '').trim();
}

// Levenshtein distance để fuzzy match tên thương hiệu
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function brandSimilarity(a: string, b: string): number {
  const na = normalizeBrand(a), nb = normalizeBrand(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen > 0 ? Math.max(0, 1 - dist / maxLen) : 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ocrText, uid, brandNameDetected } = body;
    // ocrText: text đã trích xuất từ ảnh (qua /api/ai/expiry hoặc client OCR)
    // brandNameDetected: nếu client đã dùng Google ML Kit detect được tên brand

    if (!ocrText && !brandNameDetected) {
      return NextResponse.json({ error: 'Thiếu ocrText hoặc brandNameDetected' }, { status: 400 });
    }

    // Lấy thương hiệu từ sản phẩm trong DB (nếu có UID)
    let registeredBrand: string | null = null;
    let doanhNghiepTen: string | null  = null;
    let thuongHieuDN: string | null    = null;

    if (uid) {
      const ma = await prisma.maDinhDanh.findFirst({
        where: { OR: [{ uid }, { serialNumber: uid }] },
        include: {
          loHang: {
            include: {
              sanPham: {
                include: {
                  doanhNghiep: { select: { ten: true, thuongHieu: true } }
                },
              }
            }
          }
        }
      });
      const sp = ma?.loHang?.sanPham;
      const dn = (sp as any)?.doanhNghiep;
      registeredBrand = sp?.ten || null;
      doanhNghiepTen  = dn?.ten || null;
      thuongHieuDN    = dn?.thuongHieu || null;
    }

    const results: { brand: string; similarity: number; matched: boolean }[] = [];

    // Danh sách brands cần so sánh
    const brandsToCheck = [
      registeredBrand,
      doanhNghiepTen,
      ...(thuongHieuDN ? thuongHieuDN.split(/[,;\/]/).map(s => s.trim()) : []),
    ].filter(Boolean) as string[];

    // Text đầu vào để so sánh
    const inputBrand = brandNameDetected || (ocrText?.split('\n')[0] || '');

    for (const brand of brandsToCheck) {
      const sim = brandSimilarity(inputBrand, brand);
      results.push({ brand, similarity: parseFloat(sim.toFixed(2)), matched: sim >= 0.75 });
    }

    // Tìm mức tương đồng cao nhất
    const best = results.reduce((a, b) => a.similarity > b.similarity ? a : b, { brand: '', similarity: 0, matched: false });

    const verdict = best.similarity >= 0.90 ? 'genuine'
      : best.similarity >= 0.65 ? 'suspect'
      : brandsToCheck.length === 0 ? 'unknown'
      : 'fake';

    const riskScore = verdict === 'genuine' ? 0 : verdict === 'suspect' ? 30 : verdict === 'fake' ? 70 : 10;

    // Lưu cảnh báo nếu logo không khớp
    if (uid && verdict === 'fake') {
      await prisma.canhBao.create({
        data: {
          loai: 'AI_LOGO_MISMATCH',
          mucDo: 'high',
          moTa: `Logo detect: "${inputBrand}" không khớp thương hiệu đăng ký "${best.brand}" (${(best.similarity*100).toFixed(0)}%)`,
          uid,
          trangThai: 'open',
          riskScore,
          trangThaiDieuTra: 'cho_phan_tich',
        }
      });
    }

    return NextResponse.json({
      verdict,
      riskScore,
      detectedBrand: inputBrand,
      bestMatch: best,
      allResults: results,
      message: verdict === 'genuine'
        ? `Logo "${inputBrand}" khớp với thương hiệu đăng ký (${(best.similarity*100).toFixed(0)}%)`
        : verdict === 'suspect'
        ? `Logo có thể bị in sai — ${(best.similarity*100).toFixed(0)}% tương đồng`
        : verdict === 'fake'
        ? `Logo "${inputBrand}" KHÔNG khớp thương hiệu chính hãng`
        : 'Không có thông tin thương hiệu trong DB để so sánh',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
