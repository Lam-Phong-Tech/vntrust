// POST /api/ocr/extract — OCR cho chứng từ KYC bằng tesseract.js
// Lazy load Vietnamese model (~6-15MB) — first call sẽ chậm ~5-10s, sau cache.
// Hỗ trợ regex extract: MST (10 hoặc 13 số), tên DN, địa chỉ, ngày.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Tesseract.js worker cache (server-side singleton)
let workerPromise: Promise<any> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('vie', 1, {
          // Cache trong thư mục /tmp để Next.js không rebuild
          cachePath: '/tmp/tesseract-cache',
          gzip: true,
        });
        return worker;
      } catch (e) {
        workerPromise = null;
        throw e;
      }
    })();
  }
  return workerPromise;
}

// Regex helpers — extract dữ liệu KYC
function extractFields(text: string) {
  const mst = (text.match(/(?:M[ãa]\s*s[ốo]\s*thu[ếe]|MST)[\s:]+(\d{10,13})/i) || text.match(/\b(\d{10}|\d{13})\b/))?.[1];
  const sdt = text.match(/0[3-9]\d{8}/)?.[0];
  const ngayCap = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)?.[1];
  // Tên DN — dòng có "CÔNG TY" hoặc "TNHH" hoặc "CỔ PHẦN"
  const tenDN = text.match(/^[^\n]*(?:C[ÔO]NG TY|CÔNG TY|TNHH|CỔ PHẦN|CO PHAN)[^\n]*$/im)?.[0]?.trim();
  // Địa chỉ — dòng dài có chữ "Đ/c" hoặc tỉnh
  const diaChi = text.match(/(?:Đ[\.\/]?C[\.:]?|Địa chỉ[:\s]+)([^\n]+)/i)?.[1]?.trim();
  return { mst, sdt, ngayCap, tenDN, diaChi };
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    if (!['admin', 'manufacturer', 'importer'].includes(role || '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { imageUrl, imageBase64 } = body;
    if (!imageUrl && !imageBase64) {
      return NextResponse.json({ error: 'missing_image', hint: 'Gửi imageUrl HOẶC imageBase64' }, { status: 400 });
    }

    let worker;
    try {
      worker = await getWorker();
    } catch (e: any) {
      return NextResponse.json({
        error: 'ocr_unavailable',
        message: 'Tesseract worker không khởi tạo được. Có thể model tiếng Việt chưa cài. Vui lòng đảm bảo /tmp/tesseract-cache writable.',
        detail: e.message,
      }, { status: 503 });
    }

    const start = Date.now();
    const input = imageUrl || Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const result = await worker.recognize(input);
    const text = result?.data?.text || '';
    const confidence = result?.data?.confidence || 0;
    const elapsed = Date.now() - start;
    const fields = extractFields(text);

    return NextResponse.json({
      success: true,
      elapsedMs: elapsed,
      confidence,
      text,
      extracted: fields,
      autoFillSuggestion: {
        maSoThue: fields.mst,
        tenDN: fields.tenDN,
        diaChi: fields.diaChi,
        sdt: fields.sdt,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'ocr_failed', message: e.message }, { status: 500 });
  }
}
