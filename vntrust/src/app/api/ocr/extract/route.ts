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

// dd/mm/yyyy | dd-mm-yyyy → yyyy-mm-dd (cho <input type=date>)
function toISODate(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return undefined;
  let [, d, mo, y] = m;
  if (y.length === 2) y = '20' + y;
  const dd = d.padStart(2, '0'), mm = mo.padStart(2, '0');
  if (+mm > 12 || +dd > 31) return undefined;
  return `${y}-${mm}-${dd}`;
}

// Trích xuất dữ liệu CHỨNG NHẬN từ ảnh scan
function extractCertFields(text: string) {
  const t = text.replace(/\r/g, '');
  // Loại chứng nhận — map về options của form
  let loai: string | undefined;
  if (/ISO\s*\d{4,5}/i.test(t) || /\bISO\b/i.test(t)) loai = 'ISO';
  else if (/HACCP/i.test(t)) loai = 'HACCP';
  else if (/HALAL/i.test(t)) loai = 'HALAL';
  else if (/GLOBAL\s*G\.?A\.?P/i.test(t)) loai = 'GLOBALGAP';
  else if (/VIET\s*G\.?A\.?P|VIETGAP/i.test(t)) loai = 'VIETGAP';
  else if (/\bFDA\b/i.test(t)) loai = 'FDA';
  else loai = 'OTHER';

  // Số chứng nhận: "Số: ...", "No. ...", "Certificate No ...", "Registration No ..."
  const soChungNhan = (
    t.match(/(?:S[ốo]\s*(?:ch[ứu]ng\s*nh[ậa]n|GCN|hi[ệe]u\s*l[ự]c)?|Certificate\s*(?:No|Number)|Registration\s*No|No)\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-.:]{3,})/i)?.[1]
    || t.match(/\b([A-Z]{2,}[-\/]?\d{3,}[A-Z0-9\-\/]*)\b/)?.[1]
  )?.trim();

  // Ngày: tìm các ngày dd/mm/yyyy; ngày cấp = ngày đầu; ngày hết hạn = ngày gần từ "hết hạn/valid until/expiry/đến"
  const allDates = [...t.matchAll(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/g)].map(m => m[1]);
  const expCtx = t.match(/(?:h[ếe]t\s*h[ạa]n|valid\s*(?:un)?til|expir[a-z]*|đ[ếe]n\s*ng[àa]y|hi[ệe]u\s*l[ự]c\s*đ[ếe]n)[^\d]{0,20}(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)?.[1];
  const issueCtx = t.match(/(?:ng[àa]y\s*c[ấa]p|c[ấa]p\s*ng[àa]y|issued?\s*(?:on|date)?|date\s*of\s*issue)[^\d]{0,20}(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)?.[1];
  const ngayCap = toISODate(issueCtx || allDates[0]);
  const ngayHetHan = toISODate(expCtx || allDates.find(d => d !== (issueCtx || allDates[0])) || allDates[1]);

  // Tổ chức cấp: dòng có "cấp bởi/Issued by" hoặc tên tổ chức quen
  const toChucCap = (
    t.match(/(?:c[ấa]p\s*b[ởo]i|issued\s*by|c[ơo]\s*quan\s*c[ấa]p|t[ổo]\s*ch[ứu]c\s*c[ấa]p)[:\s]+([^\n]{3,60})/i)?.[1]
    || t.match(/\b(BSI|Bureau\s*Veritas|SGS|TÜV|TUV|Intertek|DNV|QUACERT|Vinacontrol)[^\n]{0,30}/i)?.[0]
  )?.trim();

  return { loai, soChungNhan, ngayCap, ngayHetHan, toChucCap };
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    if (!['admin', 'manufacturer', 'importer'].includes(role || '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { imageUrl, imageBase64, mode } = body;
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

    // mode='cert' → trích dữ liệu chứng nhận; mặc định → KYC
    if (mode === 'cert') {
      const cert = extractCertFields(text);
      return NextResponse.json({
        success: true, elapsedMs: elapsed, confidence, text,
        extracted: cert,
        autoFillSuggestion: cert,
      });
    }

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
