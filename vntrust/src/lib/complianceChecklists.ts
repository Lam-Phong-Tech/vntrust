// §VI Sprint 8 — Checklist tuân thủ động theo ngành hàng
// Tài liệu nghiệp vụ §VI.3 — 2 ngành hàng cụ thể được liệt kê:
//   1. Mỹ phẩm nhập khẩu (Quy định 09/VBHN-BYT 2025)
//   2. Thực phẩm bảo vệ sức khỏe (Nghị định 15/2018/NĐ-CP)
// + GTIN checksum validation (§VI.2)

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface CheckItem {
  id: string;
  hangMuc: string;
  hangMucEn: string;
  yeuCau: string;
  yeuCauEn: string;
  // Check function: trả về { ok, evidence?, status: 'pass' | 'missing' | 'expired' }
  check: (ctx: CheckContext) => Promise<CheckResult> | CheckResult;
  priority: Priority;
  hanhDong: string;
  hanhDongEn: string;
  canCu: string;
}

export interface CheckContext {
  doanhNghiep: any;
  sanPham?: any;
  certs: any[]; // ChungNhan[]
  loHangs?: any[];
}

export interface CheckResult {
  ok: boolean;
  status: 'pass' | 'missing' | 'expired' | 'invalid';
  message?: string;
}

// ── GTIN checksum (Modulo-10) — Sprint 8 §VI.2 ────────────────────
// GTIN-13: 12 digits + 1 check digit; weighted alternating x1, x3
export function validateGTIN(gtin: string): { ok: boolean; reason?: string } {
  if (!gtin) return { ok: false, reason: 'GTIN trống' };
  const cleaned = gtin.replace(/\D/g, '');
  if (cleaned.length !== 8 && cleaned.length !== 12 && cleaned.length !== 13 && cleaned.length !== 14) {
    return { ok: false, reason: `Độ dài không hợp lệ (${cleaned.length}, expected 8/12/13/14)` };
  }
  const digits = cleaned.split('').map(Number);
  const checkDigit = digits.pop()!;
  // Reverse + weighted sum: từ phải sang trái, alternate 3x/1x
  let sum = 0;
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) {
    sum += digits[i] * w;
  }
  const expected = (10 - (sum % 10)) % 10;
  if (expected !== checkDigit) {
    return { ok: false, reason: `GTIN checksum lỗi (expected ${expected}, got ${checkDigit})` };
  }
  // Optional: check GS1 VN prefix (893 = Vietnam, 880-899)
  // Skip strict check, just warn
  return { ok: true };
}

// ── Checklist Mỹ phẩm nhập khẩu (Quy định 09/VBHN-BYT 2025) ────
export const CHECKLIST_MYPHAM_NHAPKHAU: CheckItem[] = [
  {
    id: 'C01',
    hangMuc: 'Phiếu công bố sản phẩm mỹ phẩm',
    hangMucEn: 'Cosmetic Product Notification',
    yeuCau: 'Bắt buộc có số tiếp nhận từ Bộ Y tế',
    yeuCauEn: 'Must have receiving number from MoH',
    canCu: 'Quy định 09/VBHN-BYT 2025',
    priority: 'critical',
    hanhDong: 'Yêu cầu DN nộp phiếu công bố ngay — không thể lưu hành nếu thiếu',
    hanhDongEn: 'Require submission immediately — cannot distribute without it',
    check: (ctx) => {
      // Check certs có loại = "PHIEU_CONG_BO_MP" hoặc "BYT" hoặc "PCBMP"
      const has = ctx.certs.some(c => /PHIẾU CÔNG BỐ|PCBMP|PHIEU_CONG_BO_MP|BYT.*công bố/i.test(`${c.loai} ${c.soChungNhan}`));
      return { ok: has, status: has ? 'pass' : 'missing' };
    },
  },
  {
    id: 'C02',
    hangMuc: 'Giấy ủy quyền của nhà sản xuất',
    hangMucEn: 'Manufacturer Authorization Letter',
    yeuCau: 'Bắt buộc với hàng nhập khẩu',
    yeuCauEn: 'Required for imported goods',
    canCu: 'Thông tư 06/2011/TT-BYT',
    priority: 'high',
    hanhDong: 'Yêu cầu bổ sung ngay để hoàn thiện hồ sơ',
    hanhDongEn: 'Request submission to complete the file',
    check: (ctx) => {
      const has = ctx.certs.some(c => /UỶ QUYỀN|UY QUYEN|AUTHORIZATION|GUQ/i.test(`${c.loai} ${c.soChungNhan}`));
      return { ok: has, status: has ? 'pass' : 'missing' };
    },
  },
  {
    id: 'C03',
    hangMuc: 'Giấy chứng nhận lưu hành tự do (CFS)',
    hangMucEn: 'Certificate of Free Sale (CFS)',
    yeuCau: 'Bắt buộc với hàng nhập khẩu, còn hiệu lực',
    yeuCauEn: 'Required for imports, must be valid',
    canCu: 'Quy định 09/VBHN-BYT 2025',
    priority: 'high',
    hanhDong: 'Liên hệ nhà SX xin gia hạn CFS mới nếu sắp hết hạn',
    hanhDongEn: 'Contact manufacturer to renew CFS if expiring',
    check: (ctx) => {
      const cfs = ctx.certs.find(c => /CFS/i.test(c.loai));
      if (!cfs) return { ok: false, status: 'missing' };
      if (cfs.ngayHetHan && new Date(cfs.ngayHetHan) < new Date()) return { ok: false, status: 'expired' };
      return { ok: true, status: 'pass' };
    },
  },
];

// ── Checklist Thực phẩm bảo vệ sức khỏe (Nghị định 15/2018/NĐ-CP) ──
export const CHECKLIST_TPBVSK: CheckItem[] = [
  {
    id: 'F01',
    hangMuc: 'Giấy chứng nhận GMP',
    hangMucEn: 'GMP Certification',
    yeuCau: 'Bắt buộc theo Nghị định 15/2018',
    yeuCauEn: 'Required per Decree 15/2018',
    canCu: 'Nghị định 15/2018/NĐ-CP',
    priority: 'critical',
    hanhDong: 'Yêu cầu DN nộp GMP còn hiệu lực',
    hanhDongEn: 'Require valid GMP submission',
    check: (ctx) => {
      const gmp = ctx.certs.find(c => /GMP/i.test(c.loai));
      if (!gmp) return { ok: false, status: 'missing' };
      if (gmp.ngayHetHan && new Date(gmp.ngayHetHan) < new Date()) return { ok: false, status: 'expired' };
      return { ok: true, status: 'pass' };
    },
  },
  {
    id: 'F02',
    hangMuc: 'Kết quả kiểm nghiệm an toàn thực phẩm',
    hangMucEn: 'Food Safety Test Result',
    yeuCau: 'Còn hiệu lực 12 tháng',
    yeuCauEn: 'Must be valid (12 months)',
    canCu: 'Nghị định 15/2018/NĐ-CP, Điều 7',
    priority: 'critical',
    hanhDong: 'Không thể lưu hành. Yêu cầu bổ sung kết quả kiểm nghiệm',
    hanhDongEn: 'Cannot distribute. Require lab test results',
    check: (ctx) => {
      const kn = ctx.certs.find(c => /KIỂM NGHIỆM|KIEM NGHIEM|LAB.*TEST|ATTP/i.test(`${c.loai} ${c.soChungNhan}`));
      if (!kn) return { ok: false, status: 'missing' };
      if (kn.ngayCap) {
        const ageMonths = (Date.now() - new Date(kn.ngayCap).getTime()) / (30.44 * 24 * 3600_000);
        if (ageMonths > 12) return { ok: false, status: 'expired', message: `Hết hiệu lực ${Math.floor(ageMonths - 12)} tháng` };
      }
      return { ok: true, status: 'pass' };
    },
  },
  {
    id: 'F03',
    hangMuc: 'Nhãn phụ tiếng Việt',
    hangMucEn: 'Vietnamese Secondary Label',
    yeuCau: 'Bắt buộc với hàng nhập khẩu',
    yeuCauEn: 'Required for imported goods',
    canCu: 'Nghị định 43/2017/NĐ-CP',
    priority: 'medium',
    hanhDong: 'Yêu cầu DN bổ sung mẫu nhãn phụ tiếng Việt',
    hanhDongEn: 'Require Vietnamese secondary label sample',
    check: (ctx) => {
      // Check sanPham có hinhAnh nhãn phụ (proxy: has hinhAnhUrl)
      // Hoặc check cert loại = "NHAN_PHU"
      const has = ctx.certs.some(c => /NHÃN PHỤ|NHAN_PHU|LABEL/i.test(`${c.loai}`));
      return { ok: has, status: has ? 'pass' : 'missing' };
    },
  },
];

// ── Map ngành hàng → checklist phù hợp ────────────────────────
export function getChecklistByNganhHang(nhomSanPham: string, doanhNghiepLoai?: string): CheckItem[] {
  const checklists: CheckItem[] = [];
  const nhom = (nhomSanPham || '').toLowerCase();
  const isImporter = doanhNghiepLoai === 'NNK' || doanhNghiepLoai === 'importer';

  if (nhom.includes('mỹ phẩm') || nhom.includes('my pham')) {
    // Mỹ phẩm: full checklist (CFS chỉ áp dụng cho hàng NK)
    if (isImporter) {
      checklists.push(...CHECKLIST_MYPHAM_NHAPKHAU);
    } else {
      // Mỹ phẩm trong nước: bỏ C02, C03 (chỉ áp dụng NK)
      checklists.push(CHECKLIST_MYPHAM_NHAPKHAU[0]); // C01 only
    }
  }
  if (nhom.includes('thực phẩm') || nhom.includes('thuc pham') || nhom.includes('dược phẩm') || nhom.includes('duoc pham')) {
    checklists.push(...CHECKLIST_TPBVSK);
    // F03 chỉ áp dụng cho NK
    if (!isImporter) {
      return checklists.filter(c => c.id !== 'F03');
    }
  }
  return checklists;
}

export const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low'];
