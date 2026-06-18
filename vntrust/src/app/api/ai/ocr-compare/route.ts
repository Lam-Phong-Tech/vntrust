// POST /api/ai/ocr-compare
// So sánh text OCR từ ảnh với text chuẩn trong DB (Tầng 3 OCR Compare)
// Dùng Similarity Engine: Levenshtein + Cosine để phát hiện sai khác ký tự trên nhãn mác

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function normalize(s: string) { return s.replace(/\s+/g, ' ').trim().toLowerCase(); }

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length, 1);
}

// Highlight các đoạn khác biệt (word-level diff)
function wordDiff(a: string, b: string): { type: 'match'|'add'|'remove'; text: string }[] {
  const wa = normalize(a).split(' '), wb = normalize(b).split(' ');
  const setA = new Set(wa), setB = new Set(wb);
  const result: { type: 'match'|'add'|'remove'; text: string }[] = [];
  for (const w of wa) result.push({ type: setB.has(w) ? 'match' : 'remove', text: w });
  for (const w of wb) if (!setA.has(w)) result.push({ type: 'add', text: w });
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { ocrText, uid, referenceText } = await req.json();
    if (!ocrText) return NextResponse.json({ error: 'Thiếu ocrText từ ảnh' }, { status: 400 });

    // Lấy text chuẩn từ DB nếu không truyền vào
    let refText = referenceText ?? '';
    let productName = '';

    if (!refText && uid) {
      const ma = await prisma.maDinhDanh.findFirst({
        where: { OR: [{ uid }, { serialNumber: uid }] },
        include: {
          loHang: {
            include: {
              sanPham: { select: { ten: true, moTa: true, thanhPhan: true } }
            }
          }
        }
      });
      const sp = ma?.loHang?.sanPham;
      productName = sp?.ten ?? '';
      refText = [sp?.ten, sp?.moTa, sp?.thanhPhan].filter(Boolean).join(' ');
    }

    if (!refText) {
      return NextResponse.json({
        similarity: null,
        verdict: 'unknown',
        message: 'Không có text tham chiếu trong DB — doanh nghiệp cần nhập mô tả sản phẩm',
      });
    }

    const sim  = parseFloat(similarity(ocrText, refText).toFixed(3));
    const diff = wordDiff(ocrText, refText);

    const mismatches   = diff.filter(d => d.type !== 'match').length;
    const totalWords   = diff.length;
    const mismatchRate = mismatches / Math.max(totalWords, 1);

    const verdict = sim >= 0.90 ? 'dat'
      : sim >= 0.70 ? 'nghi_van'
      : sim >= 0.50 ? 'rui_ro_cao'
      : 'vi_pham';

    const riskScore = verdict === 'dat' ? 0 : verdict === 'nghi_van' ? 20 : verdict === 'rui_ro_cao' ? 40 : 70;

    // Lưu vào VerificationChecklist
    if (uid) {
      await prisma.verificationChecklist.create({
        data: {
          uid,
          hangMuc: 'OCR — So sánh text nhãn mác',
          tangKiemTra: 'tang3_ai_vision',
          ketQua: verdict,
          mauHienThi: verdict==='dat'?'green':verdict==='nghi_van'?'yellow':verdict==='rui_ro_cao'?'orange':'red',
          diemRuiRo: riskScore,
          chiTiet: JSON.stringify({ similarity: sim, mismatchRate: mismatchRate.toFixed(2), mismatches, totalWords }),
          aiModel: 'levenshtein+ocr',
          tuDong: true,
        }
      });
    }

    return NextResponse.json({
      similarity: sim,
      score: Math.round(sim * 100),
      verdict,
      riskScore,
      productName,
      mismatches,
      mismatchRate: parseFloat(mismatchRate.toFixed(2)),
      diff: diff.slice(0, 50),
      message: verdict === 'dat'
        ? `Text nhãn mác khớp ${(sim*100).toFixed(0)}% với sản phẩm chính hãng`
        : `Phát hiện ${mismatches} từ khác biệt (${(sim*100).toFixed(0)}% tương đồng)`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
