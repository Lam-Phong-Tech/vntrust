// FR-HK-RULE: Rule engine cho hậu kiểm
// Input: chỉ tiêu phân tích từ kết quả mẫu + nhóm sản phẩm
// Output: { ketQua, chiTieuVuotNguong, viPham[] }

import { prisma } from '@/lib/prisma';

export const RULE_ENGINE_VERSION = '1.0.0';

export interface ChiTieuPhanTich {
  tenChiTieu: string;
  giaTri: number | string;
  donVi?: string;
}

export interface ViPham {
  tenChiTieu: string;
  giaTri: number | string;
  donVi?: string;
  loaiViPham: 'vuot_max' | 'duoi_min' | 'ngoai_range' | 'sai_qualitative' | 'khong_co_chuan';
  nguongDuocPhep?: string; // human-readable
  canCu?: string;
}

export interface RuleResult {
  ketQua: 'dambao' | 'khongdambao';
  chiTieuVuotNguong: string | null;  // text summary
  viPham: ViPham[];
  daSoSanh: number;
  khongCoChuan: number;
}

export async function evaluateHauKiem(
  chiTieuPhanTich: ChiTieuPhanTich[],
  nhomSanPham: string | null | undefined
): Promise<RuleResult> {
  if (!chiTieuPhanTich || chiTieuPhanTich.length === 0) {
    return {
      ketQua: 'dambao',
      chiTieuVuotNguong: null,
      viPham: [],
      daSoSanh: 0,
      khongCoChuan: 0,
    };
  }

  // Load all active standards for the group (or all if no group)
  const whereGroup = nhomSanPham
    ? { trangThai: 'active', nhomSanPham }
    : { trangThai: 'active' };
  const standards = await prisma.tieuChuanKiemNghiem.findMany({ where: whereGroup });

  // Build lookup: lowercased tenChiTieu → standard
  const standardMap = new Map<string, typeof standards[0]>();
  for (const s of standards) {
    standardMap.set(s.tenChiTieu.trim().toLowerCase(), s);
  }

  const viPham: ViPham[] = [];
  let daSoSanh = 0;
  let khongCoChuan = 0;

  for (const ct of chiTieuPhanTich) {
    const key = (ct.tenChiTieu || '').trim().toLowerCase();
    const std = standardMap.get(key);
    if (!std) {
      khongCoChuan++;
      continue;
    }
    daSoSanh++;

    const nguongStr = (() => {
      switch (std.loaiNguong) {
        case 'max':         return `≤ ${std.nguongMax}${std.donVi ? ' ' + std.donVi : ''}`;
        case 'min':         return `≥ ${std.nguongMin}${std.donVi ? ' ' + std.donVi : ''}`;
        case 'range':       return `${std.nguongMin} – ${std.nguongMax}${std.donVi ? ' ' + std.donVi : ''}`;
        case 'qualitative': return `phải = "${std.giaTriBatBuoc}"`;
        default:            return '';
      }
    })();

    if (std.loaiNguong === 'qualitative') {
      const expected = (std.giaTriBatBuoc || '').toString().trim().toLowerCase();
      const actual = String(ct.giaTri || '').trim().toLowerCase();
      if (expected && actual !== expected) {
        viPham.push({
          tenChiTieu: ct.tenChiTieu,
          giaTri: ct.giaTri,
          donVi: ct.donVi,
          loaiViPham: 'sai_qualitative',
          nguongDuocPhep: nguongStr,
          canCu: std.canCu || undefined,
        });
      }
      continue;
    }

    // Numeric checks
    const gt = typeof ct.giaTri === 'number' ? ct.giaTri : parseFloat(String(ct.giaTri));
    if (isNaN(gt)) continue;

    if (std.loaiNguong === 'max' && std.nguongMax != null && gt > std.nguongMax) {
      viPham.push({ tenChiTieu: ct.tenChiTieu, giaTri: gt, donVi: ct.donVi, loaiViPham: 'vuot_max', nguongDuocPhep: nguongStr, canCu: std.canCu || undefined });
    } else if (std.loaiNguong === 'min' && std.nguongMin != null && gt < std.nguongMin) {
      viPham.push({ tenChiTieu: ct.tenChiTieu, giaTri: gt, donVi: ct.donVi, loaiViPham: 'duoi_min', nguongDuocPhep: nguongStr, canCu: std.canCu || undefined });
    } else if (std.loaiNguong === 'range') {
      const tooLow  = std.nguongMin != null && gt < std.nguongMin;
      const tooHigh = std.nguongMax != null && gt > std.nguongMax;
      if (tooLow || tooHigh) {
        viPham.push({ tenChiTieu: ct.tenChiTieu, giaTri: gt, donVi: ct.donVi, loaiViPham: 'ngoai_range', nguongDuocPhep: nguongStr, canCu: std.canCu || undefined });
      }
    }
  }

  const chiTieuVuotNguong = viPham.length === 0
    ? null
    : viPham.map(v => `${v.tenChiTieu} = ${v.giaTri}${v.donVi ? ' ' + v.donVi : ''} (ngưỡng: ${v.nguongDuocPhep})${v.canCu ? ' [' + v.canCu + ']' : ''}`).join('; ');

  return {
    ketQua: viPham.length > 0 ? 'khongdambao' : 'dambao',
    chiTieuVuotNguong,
    viPham,
    daSoSanh,
    khongCoChuan,
  };
}
