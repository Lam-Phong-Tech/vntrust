// Seed yêu cầu tuân thủ chứng nhận theo ngành VSIC (mặc định)
// Dựa trên tài liệu nghiệp vụ §VI Compliance Checklist
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const SEED = [
  // Thực phẩm (A01, A02, C10)
  { nganhVSIC: 'A01', tenNganh: 'Nông nghiệp - trồng trọt', loaiChungNhan: 'VietGAP', batBuoc: true,  canCu: 'TT 28/2012/TT-BKHCN' },
  { nganhVSIC: 'A01', tenNganh: 'Nông nghiệp - trồng trọt', loaiChungNhan: 'GlobalGAP', batBuoc: false, canCu: 'GlobalG.A.P.' },
  { nganhVSIC: 'A02', tenNganh: 'Lâm nghiệp', loaiChungNhan: 'FSC', batBuoc: false, canCu: 'FSC' },
  { nganhVSIC: 'C10', tenNganh: 'Chế biến thực phẩm', loaiChungNhan: 'HACCP', batBuoc: true, canCu: 'Codex CAC/RCP 1-1969 Rev.5-2020' },
  { nganhVSIC: 'C10', tenNganh: 'Chế biến thực phẩm', loaiChungNhan: 'ISO 22000', batBuoc: false, canCu: 'ISO 22000:2018' },

  // Thực phẩm nhập khẩu (G46)
  { nganhVSIC: 'G46', tenNganh: 'Bán buôn (gồm hàng nhập khẩu)', loaiChungNhan: 'CFS', batBuoc: true, canCu: 'NĐ 69/2018/NĐ-CP' },
  { nganhVSIC: 'G46', tenNganh: 'Bán buôn (gồm hàng nhập khẩu)', loaiChungNhan: 'C/O', batBuoc: true, canCu: 'NĐ 31/2018/NĐ-CP' },

  // Dược phẩm (C21)
  { nganhVSIC: 'C21', tenNganh: 'Sản xuất dược phẩm', loaiChungNhan: 'GMP', batBuoc: true,  canCu: 'WHO TRS 986 Annex 2' },
  { nganhVSIC: 'C21', tenNganh: 'Sản xuất dược phẩm', loaiChungNhan: 'GDP', batBuoc: true,  canCu: 'WHO Good Distribution Practices' },

  // Mỹ phẩm (C20)
  { nganhVSIC: 'C20', tenNganh: 'Sản xuất hóa chất - mỹ phẩm', loaiChungNhan: 'CGMP', batBuoc: true, canCu: 'ASEAN Cosmetic Directive' },
  { nganhVSIC: 'C20', tenNganh: 'Sản xuất hóa chất - mỹ phẩm', loaiChungNhan: 'Phiếu công bố SP mỹ phẩm', batBuoc: true, canCu: 'Quy định 09/VBHN-BYT 2025' },

  // Hàng tiêu dùng — generic
  { nganhVSIC: 'C',   tenNganh: 'Sản xuất - chế biến (chung)', loaiChungNhan: 'ISO 9001', batBuoc: false, canCu: 'ISO 9001:2015' },
  { nganhVSIC: 'C',   tenNganh: 'Sản xuất - chế biến (chung)', loaiChungNhan: 'TCVN', batBuoc: false, canCu: 'Hệ thống TCVN' },

  // Generic fallback
  { nganhVSIC: 'GENERIC', tenNganh: 'Mọi ngành', loaiChungNhan: 'Giấy phép kinh doanh', batBuoc: true, canCu: 'Luật Doanh nghiệp 2020' },
  { nganhVSIC: 'GENERIC', tenNganh: 'Mọi ngành', loaiChungNhan: 'ISO 9001', batBuoc: false, canCu: 'ISO 9001:2015' },
];

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    if (role !== 'admin') return NextResponse.json({ error: 'admin_only' }, { status: 403 });

    const existing = await prisma.yeuCauTuanThuVSIC.count();
    if (existing > 0 && new URL(req.url).searchParams.get('force') !== '1') {
      return NextResponse.json({ skipped: true, existing, message: `Đã có ${existing} yêu cầu VSIC. Dùng ?force=1 để re-seed.` });
    }

    let created = 0, skipped = 0;
    for (const data of SEED) {
      const dup = await prisma.yeuCauTuanThuVSIC.findFirst({
        where: { nganhVSIC: data.nganhVSIC, loaiChungNhan: data.loaiChungNhan, trangThai: 'active' },
      });
      if (dup) { skipped++; continue; }
      await prisma.yeuCauTuanThuVSIC.create({ data });
      created++;
    }
    return NextResponse.json({ success: true, created, skipped, total: created + skipped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
