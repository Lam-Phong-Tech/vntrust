// §V Sprint 7 — Reference table: thời hạn điển hình của 9 loại chứng nhận
// Tài liệu nghiệp vụ §V.1 "Cơ sở dữ liệu về thời hạn của các chứng nhận & sản phẩm"
//
// Dùng cho:
//   1. UI tạo chứng nhận: tự động đề xuất ngayHetHan dựa trên loại + ngayCap
//   2. Lifecycle-check: warning nếu ngayHetHan vượt quá max validity (suspect)
//   3. Compliance audit: kiểm tra tuân thủ Thông tư 28/2012/TT-BKHCN

export interface CertValidityRule {
  loai: string;
  loaiKeysVi: string[];     // VN keywords để match loại chứng nhận
  loaiKeysEn: string[];     // EN keywords
  defaultYears: number;     // thời hạn điển hình (năm)
  minYears?: number;        // tối thiểu (nếu range)
  maxYears?: number;        // tối đa (nếu range)
  fixedValidity: boolean;   // false = không có thời hạn cố định
  canCu: string;            // căn cứ pháp lý
  ghiChu: string;
}

export const CERT_VALIDITY_RULES: CertValidityRule[] = [
  {
    loai: 'HACCP',
    loaiKeysVi: ['HACCP'],
    loaiKeysEn: ['HACCP'],
    defaultYears: 3,
    fixedValidity: true,
    canCu: 'Codex Alimentarius CAC/RCP 1-1969 Rev.5-2020',
    ghiChu: 'Có hiệu lực 3 năm, kèm đánh giá giám sát định kỳ hàng năm',
  },
  {
    loai: 'ISO',
    loaiKeysVi: ['ISO 9001', 'ISO 14001', 'ISO 22000', 'ISO 45001', 'ISO 13485', 'ISO 27001', 'ISO'],
    loaiKeysEn: ['ISO'],
    defaultYears: 3,
    fixedValidity: true,
    canCu: 'IAF MD 5:2019',
    ghiChu: 'Yêu cầu đánh giá giám sát hàng năm và tái chứng nhận sau 3 năm',
  },
  {
    loai: 'VietGAP',
    loaiKeysVi: ['VietGAP', 'GAP'],
    loaiKeysEn: ['VietGAP'],
    defaultYears: 3,
    maxYears: 3,
    fixedValidity: true,
    canCu: 'Thông tư 28/2012/TT-BKHCN',
    ghiChu: 'Tối đa 3 năm',
  },
  {
    loai: 'Organic',
    loaiKeysVi: ['Organic', 'Hữu cơ', 'USDA', 'EU Organic'],
    loaiKeysEn: ['Organic', 'USDA', 'EU Organic'],
    defaultYears: 1,
    minYears: 1,
    maxYears: 3,
    fixedValidity: true,
    canCu: 'TCVN 11041:2017',
    ghiChu: '1-3 năm tùy theo tổ chức chứng nhận và quốc gia',
  },
  {
    loai: 'Halal',
    loaiKeysVi: ['Halal'],
    loaiKeysEn: ['Halal'],
    defaultYears: 1,
    minYears: 1,
    maxYears: 3,
    fixedValidity: true,
    canCu: 'JAKIM Malaysia / MUI Indonesia / HFCE',
    ghiChu: '1-3 năm phụ thuộc vào tổ chức chứng nhận Halal từng quốc gia',
  },
  {
    loai: 'RoHS',
    loaiKeysVi: ['RoHS'],
    loaiKeysEn: ['RoHS'],
    defaultYears: 0,
    fixedValidity: false,
    canCu: 'EU Directive 2015/863 (RoHS 3.0)',
    ghiChu: 'Không có thời hạn cố định — là chứng nhận tuân thủ cho từng lô sản phẩm',
  },
  {
    loai: 'CE',
    loaiKeysVi: ['CE Marking', 'CE'],
    loaiKeysEn: ['CE'],
    defaultYears: 0,
    fixedValidity: false,
    canCu: 'EU Regulation 765/2008',
    ghiChu: 'Không có thời hạn cố định — có hiệu lực khi SP còn được SX theo tiêu chuẩn đó',
  },
  {
    loai: 'GMP',
    loaiKeysVi: ['GMP'],
    loaiKeysEn: ['GMP'],
    defaultYears: 3,
    fixedValidity: true,
    canCu: 'WHO TRS 986 Annex 2',
    ghiChu: 'Có hiệu lực 3 năm theo WHO 2018, kèm đánh giá giám sát',
  },
  {
    loai: 'GlobalGAP',
    loaiKeysVi: ['GlobalGAP', 'Global GAP'],
    loaiKeysEn: ['GlobalGAP'],
    defaultYears: 1,
    maxYears: 1,
    fixedValidity: true,
    canCu: 'GlobalG.A.P. IFA v5.4',
    ghiChu: 'Đánh giá tái chứng nhận hàng năm',
  },
];

// Match loại chứng nhận → rule
export function findValidityRule(loai: string, lang: 'vi' | 'en' = 'vi'): CertValidityRule | null {
  if (!loai) return null;
  const upper = loai.toUpperCase();
  for (const rule of CERT_VALIDITY_RULES) {
    const keys = lang === 'en' ? rule.loaiKeysEn : rule.loaiKeysVi;
    if (keys.some(k => upper.includes(k.toUpperCase()))) return rule;
  }
  return null;
}

// Tính ngayHetHan đề xuất từ ngayCap + loại chứng nhận
export function suggestExpiryDate(loai: string, ngayCap: Date): Date | null {
  const rule = findValidityRule(loai);
  if (!rule || !rule.fixedValidity) return null;
  const exp = new Date(ngayCap);
  exp.setFullYear(exp.getFullYear() + rule.defaultYears);
  return exp;
}

// Validate: ngayHetHan không vượt quá max validity quy định
export function validateExpiryWithinRule(loai: string, ngayCap: Date, ngayHetHan: Date): { ok: true } | { ok: false; reason: string } {
  const rule = findValidityRule(loai);
  if (!rule) return { ok: true }; // unknown cert type, can't validate
  if (!rule.fixedValidity) return { ok: true }; // no fixed validity, anything goes
  const diffYears = (ngayHetHan.getTime() - ngayCap.getTime()) / (365.25 * 24 * 3600 * 1000);
  const maxYears = rule.maxYears || rule.defaultYears;
  if (diffYears > maxYears + 0.01) {
    return {
      ok: false,
      reason: `${rule.loai} có thời hạn tối đa ${maxYears} năm (${rule.canCu}). Ngày hết hạn đang đề xuất ${diffYears.toFixed(1)} năm.`,
    };
  }
  return { ok: true };
}
