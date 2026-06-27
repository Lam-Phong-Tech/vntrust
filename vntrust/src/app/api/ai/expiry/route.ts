// POST /api/ai/expiry — Expiry AI: đọc NSX/HSD từ ảnh bằng Tesseract OCR
// Trả về: ngaySX, hanDung đã parse, cảnh báo nếu HSD < 30 ngày hoặc sai định dạng

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Regex patterns cho NSX/HSD trên bao bì Việt Nam + quốc tế
const DATE_PATTERNS = [
  // DD/MM/YYYY hoặc DD-MM-YYYY
  /(?:NSX|MFG|SX|SẢN XUẤT|Ngày SX|Manufactured)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  /(?:HSD|EXP|BB|HẠN DÙNG|HẠN SỬ DỤNG|Best Before|Expiry)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  // MM/YYYY (chỉ tháng năm)
  /(?:HSD|EXP|BB)[:\s]*(\d{2}[\/\-\.]\d{4})/i,
  /(?:NSX|MFG)[:\s]*(\d{2}[\/\-\.]\d{4})/i,
  // YYYYMMDD (ISO compact)
  /(?:NSX|MFG|HSD|EXP)[:\s]*(\d{8})/i,
];

function parseViDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    const d = new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // MM/YYYY
  if (/^\d{2}[\/\-\.]\d{4}$/.test(s)) {
    const [m, y] = s.split(/[\/\-\.]/);
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD/MM/YY
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [dd, mm, yyRaw] = parts.map(Number);
    let yy = yyRaw;
    if (yy < 100) yy += 2000;
    const d = new Date(yy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image     = formData.get('image') as File | null;
    const textInput = formData.get('ocrText') as string | null; // Nếu đã có text OCR sẵn

    let ocrText = textInput || '';

    // Nếu có ảnh, chạy Tesseract
    if (image && !ocrText) {
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('vie', 1, {
          cachePath: '/tmp/tesseract-cache',
          gzip: true,
        });
        const buf    = Buffer.from(await image.arrayBuffer());
        const result = await worker.recognize(buf);
        ocrText      = result?.data?.text || '';
        await worker.terminate();
      } catch (e: any) {
        return NextResponse.json({ error: 'OCR không khả dụng: ' + e.message }, { status: 503 });
      }
    }

    if (!ocrText) {
      return NextResponse.json({ error: 'Thiếu ảnh hoặc ocrText' }, { status: 400 });
    }

    // Extract NSX và HSD
    let ngaySXRaw: string | null = null;
    let hanDungRaw: string | null = null;

    // Chạy tuần tự từng pattern
    for (const pat of DATE_PATTERNS) {
      const m = ocrText.match(pat);
      if (!m) continue;
      const raw = m[1];
      const patStr = pat.toString().toLowerCase();
      if ((patStr.includes('nsx') || patStr.includes('mfg') || patStr.includes('sx')) && !ngaySXRaw) {
        ngaySXRaw = raw;
      }
      if ((patStr.includes('hsd') || patStr.includes('exp') || patStr.includes('bb')) && !hanDungRaw) {
        hanDungRaw = raw;
      }
    }

    const ngaySX  = ngaySXRaw  ? parseViDate(ngaySXRaw)  : null;
    const hanDung = hanDungRaw ? parseViDate(hanDungRaw) : null;
    const now     = new Date();

    // Cảnh báo
    const warnings: string[] = [];
    if (!hanDung) {
      warnings.push('Không đọc được ngày HSD — bao bì có thể bị xóa/mờ');
    } else {
      const daysLeft = Math.floor((hanDung.getTime() - now.getTime()) / 86400000);
      if (daysLeft < 0)        warnings.push(`⚠️ Sản phẩm đã HẾT HẠN ${Math.abs(daysLeft)} ngày`);
      else if (daysLeft < 30)  warnings.push(`⚠️ Sản phẩm sắp hết hạn: còn ${daysLeft} ngày`);
    }
    if (!ngaySX) {
      warnings.push('Không đọc được ngày NSX');
    }

    const riskScore = warnings.length === 0 ? 0 : warnings.some(w => w.includes('HẾT HẠN')) ? 80 : 40;

    return NextResponse.json({
      ngaySX:     ngaySX?.toISOString()  ?? null,
      hanDung:    hanDung?.toISOString() ?? null,
      ngaySXRaw,
      hanDungRaw,
      warnings,
      riskScore,
      ocrTextSnippet: ocrText.slice(0, 300),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
