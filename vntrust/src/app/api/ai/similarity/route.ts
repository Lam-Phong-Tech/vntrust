// POST /api/ai/similarity
// API tổng hợp Similarity Engine: Levenshtein + Cosine + Fuzzy + Soundex
// Dùng để so sánh tên DN, thương hiệu, nhãn hiệu — phát hiện nhái tên

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Levenshtein distance ──────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ── Cosine Similarity (bag-of-chars trigram) ──────────────────────────────────
function trigrams(s: string): Map<string, number> {
  const map = new Map<string, number>();
  const padded = `  ${s}  `;
  for (let i = 0; i < padded.length - 2; i++) {
    const t = padded.slice(i, i + 3);
    map.set(t, (map.get(t) ?? 0) + 1);
  }
  return map;
}

function cosineSim(a: string, b: string): number {
  const ta = trigrams(a), tb = trigrams(b);
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of ta) { dot += v * (tb.get(k) ?? 0); na += v * v; }
  for (const v of tb.values()) nb += v * v;
  return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// ── Fuzzy Match (partial substring ratio) ─────────────────────────────────────
function fuzzyRatio(a: string, b: string): number {
  if (a.includes(b) || b.includes(a)) return 0.95;
  const shorter = a.length < b.length ? a : b;
  const longer  = a.length < b.length ? b : a;
  // Sliding window match
  let best = 0;
  for (let i = 0; i <= longer.length - shorter.length; i++) {
    const slice = longer.slice(i, i + shorter.length);
    const dist  = levenshtein(shorter, slice);
    const ratio = 1 - dist / shorter.length;
    if (ratio > best) best = ratio;
  }
  return best;
}

// ── Soundex (English-ish, works for Latin script brand names) ────────────────
function soundex(s: string): string {
  const MAP: Record<string, string> = {
    b:'1',f:'1',p:'1',v:'1',
    c:'2',g:'2',j:'2',k:'2',q:'2',s:'2',x:'2',z:'2',
    d:'3',t:'3', l:'4', m:'5',n:'5', r:'6',
  };
  const upper = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!upper) return '0000';
  let code = upper[0];
  let prev = MAP[upper[0].toLowerCase()] ?? '0';
  for (let i = 1; i < upper.length && code.length < 4; i++) {
    const c = MAP[upper[i].toLowerCase()] ?? '0';
    if (c !== '0' && c !== prev) code += c;
    prev = c;
  }
  return code.padEnd(4, '0');
}

// ── Normalize ─────────────────────────────────────────────────────────────────
function norm(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // bỏ dấu
    .replace(/[^a-z0-9\s]/g, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { textA, textB, context } = await req.json();
    if (!textA || !textB) return NextResponse.json({ error: 'Thiếu textA hoặc textB' }, { status: 400 });

    const na = norm(textA), nb = norm(textB);

    const lev    = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length) || 1;
    const levSim = parseFloat((1 - lev / maxLen).toFixed(3));
    const cosSim = parseFloat(cosineSim(na, nb).toFixed(3));
    const fuzSim = parseFloat(fuzzyRatio(na, nb).toFixed(3));
    const sdxA   = soundex(na), sdxB = soundex(nb);
    const sdxSim = sdxA === sdxB ? 1.0 : 0.0;

    // Tổng hợp — trọng số: Cosine 35% + Fuzzy 30% + Levenshtein 25% + Soundex 10%
    const combined = parseFloat((cosSim * 0.35 + fuzSim * 0.30 + levSim * 0.25 + sdxSim * 0.10).toFixed(3));

    const verdict = combined >= 0.90 ? 'IDENTICAL'
      : combined >= 0.75 ? 'VERY_SIMILAR'    // nghi nhái tên
      : combined >= 0.55 ? 'SIMILAR'          // cần xem xét
      : combined >= 0.35 ? 'PARTIAL'
      : 'DIFFERENT';

    const riskScore = verdict === 'IDENTICAL' || verdict === 'VERY_SIMILAR' ? 60
      : verdict === 'SIMILAR' ? 30 : 0;

    return NextResponse.json({
      textA, textB,
      normalized: { a: na, b: nb },
      scores: { levenshtein: levSim, cosine: cosSim, fuzzy: fuzSim, soundex: sdxSim, combined },
      soundexCodes: { a: sdxA, b: sdxB },
      verdict,
      riskScore,
      context: context ?? null,
      interpretation: verdict === 'VERY_SIMILAR'
        ? `"${textA}" và "${textB}" rất giống nhau (${(combined*100).toFixed(0)}%) — nghi vấn nhái tên thương hiệu`
        : verdict === 'SIMILAR'
        ? `Hai tên có ${(combined*100).toFixed(0)}% tương đồng — cần xem xét`
        : `Hai tên khác nhau rõ ràng (${(combined*100).toFixed(0)}%)`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
