// UC19: Kiểm tra tính hợp lệ GTIN
// 1) Validate checksum theo chuẩn GS1 (EAN-8/EAN-13/UPC-A/GTIN-14)
// 2) Tra cứu trong CSDL nội bộ — xem GTIN có thuộc DN nào
// 3) (Tương lai) Tích hợp GS1 Vietnam API — để placeholder

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Validate GTIN checksum theo công thức GS1:
 * - Đọc từ phải sang trái (bỏ check digit), nhân alternate ×3 và ×1
 * - Tổng cộng, lấy phần dư /10, lấy (10 - rem) % 10 → check digit
 */
function validateGtinChecksum(code: string): { valid: boolean; expected?: string; got?: string; length: number } {
  const clean = code.replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(clean.length)) {
    return { valid: false, length: clean.length };
  }
  const digits = clean.split('').map(Number);
  const checkDigit = digits.pop()!;
  let sum = 0;
  // GS1: từ phải sang trái, vị trí lẻ ×3, chẵn ×1
  for (let i = digits.length - 1, pos = 0; i >= 0; i--, pos++) {
    sum += digits[i] * (pos % 2 === 0 ? 3 : 1);
  }
  const expected = (10 - (sum % 10)) % 10;
  return { valid: expected === checkDigit, expected: String(expected), got: String(checkDigit), length: clean.length };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gtin = (searchParams.get('gtin') || '').trim();
    const doanhNghiepIdFilter = searchParams.get('doanhNghiepId') || '';

    if (!gtin) {
      return NextResponse.json({ error: 'missing_gtin', hint: 'GET /api/gtin/validate?gtin=8931234567893' }, { status: 400 });
    }

    // 1) Checksum
    const checksum = validateGtinChecksum(gtin);
    if (!checksum.valid) {
      return NextResponse.json({
        gtin,
        valid: false,
        reason: 'checksum_invalid',
        message: `Check digit không đúng theo chuẩn GS1. Cần ${checksum.expected}, mã nhập ${checksum.got}. Độ dài ${checksum.length} chữ số.`,
        checksum,
      });
    }

    // 2) Tra cứu CSDL nội bộ
    const sp = await prisma.sanPham.findFirst({
      where: { GTIN: gtin.replace(/\D/g, '') },
      include: { doanhNghiep: { select: { id: true, ten: true, maSoThue: true, trangThai: true } } },
    });

    if (!sp) {
      return NextResponse.json({
        gtin,
        valid: true,
        registered: false,
        reason: 'not_registered_in_vntrust',
        message: 'Checksum hợp lệ nhưng GTIN chưa đăng ký trên hệ thống VNTrust. Có thể là sản phẩm nước ngoài hoặc chưa onboard.',
        checksum,
      });
    }

    // 3) Đối chiếu DN — nếu có filter
    if (doanhNghiepIdFilter && sp.doanhNghiep && sp.doanhNghiep.id !== doanhNghiepIdFilter) {
      return NextResponse.json({
        gtin,
        valid: true,
        registered: true,
        ownership_mismatch: true,
        reason: 'belongs_to_other_company',
        message: 'GTIN này đã đăng ký bởi doanh nghiệp khác (không khớp với doanh nghiệp đang tra cứu).',
        product: { maSKU: sp.maSKU, ten: sp.ten },
        manufacturer: sp.doanhNghiep ? { id: sp.doanhNghiep.id, ten: sp.doanhNghiep.ten, trangThai: sp.doanhNghiep.trangThai } : null,
        checksum,
      });
    }

    return NextResponse.json({
      gtin,
      valid: true,
      registered: true,
      ownership_mismatch: false,
      message: 'GTIN hợp lệ và đã đăng ký trên VNTrust.',
      product: { maSKU: sp.maSKU, ten: sp.ten, nhomSanPham: sp.nhomSanPham },
      manufacturer: sp.doanhNghiep ? { id: sp.doanhNghiep.id, ten: sp.doanhNghiep.ten, maSoThue: sp.doanhNghiep.maSoThue, trangThai: sp.doanhNghiep.trangThai } : null,
      checksum,
    });
  } catch (e: any) {
    console.error('GET /api/gtin/validate:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
