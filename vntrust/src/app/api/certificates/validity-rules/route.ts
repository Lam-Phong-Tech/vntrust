// §V Sprint 7 — Public endpoint expose cert validity reference table
// Frontend dùng để:
//   1. Auto-fill ngayHetHan khi user chọn "Loại chứng nhận"
//   2. Hiển thị warning nếu user nhập ngayHetHan vượt quá quy định
//   3. Show căn cứ pháp lý + ghi chú
import { NextRequest, NextResponse } from 'next/server';
import { CERT_VALIDITY_RULES, findValidityRule, suggestExpiryDate } from '@/lib/certValidityRules';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const loai = searchParams.get('loai');
  const ngayCap = searchParams.get('ngayCap');

  // Specific lookup
  if (loai) {
    const rule = findValidityRule(loai);
    if (!rule) {
      return NextResponse.json({
        loai, found: false,
        message: 'Không tìm thấy quy tắc thời hạn cho loại này — phải nhập ngayHetHan thủ công',
      });
    }
    const suggested = ngayCap ? suggestExpiryDate(loai, new Date(ngayCap)) : null;
    return NextResponse.json({
      loai, found: true, rule,
      suggestedExpiry: suggested ? suggested.toISOString() : null,
    });
  }

  // Full table
  return NextResponse.json({
    source: 'Tài liệu nghiệp vụ §V.1',
    count: CERT_VALIDITY_RULES.length,
    rules: CERT_VALIDITY_RULES,
  });
}
