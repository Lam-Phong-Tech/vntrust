// UC18: Kiểm tra tuân thủ chứng nhận theo ngành VSIC
// Input: doanhNghiepId → trả về checklist các chứng nhận bắt buộc theo nganh_VSIC,
//        đánh dấu Đạt (có cert còn hạn) / Sắp hết hạn / Thiếu

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    const userDnId = cookieStore.get('doanhNghiepId')?.value;
    const { searchParams } = new URL(req.url);
    const doanhNghiepId = searchParams.get('doanhNghiepId') || userDnId;

    if (!doanhNghiepId) return NextResponse.json({ error: 'missing_doanhNghiepId' }, { status: 400 });
    // Auth: admin xem tất cả, role khác chỉ xem của chính mình
    if (role !== 'admin' && doanhNghiepId !== userDnId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const dn = await prisma.doanhNghiep.findUnique({
      where: { id: doanhNghiepId },
      include: { sanPhams: { include: { chungNhans: true } } },
    });
    if (!dn) return NextResponse.json({ error: 'doanh_nghiep_not_found' }, { status: 404 });

    const nganhVSIC = dn.nganh_VSIC || '';

    // Lấy yêu cầu cert cho ngành này
    let requirements = await prisma.yeuCauTuanThuVSIC.findMany({
      where: { trangThai: 'active', nganhVSIC: { startsWith: nganhVSIC.substring(0, 1) } }, // match by first letter (A/C/G/...)
    });
    // Fallback: nếu DN không có nganh_VSIC, vẫn show generic requirements
    if (requirements.length === 0) {
      requirements = await prisma.yeuCauTuanThuVSIC.findMany({ where: { trangThai: 'active', nganhVSIC: 'GENERIC' } });
    }

    // Gom tất cả chứng nhận của DN (qua các sản phẩm)
    const allCerts = dn.sanPhams.flatMap(sp => sp.chungNhans);
    const now = new Date();

    const checklist = requirements.map(req => {
      const matches = allCerts.filter(cn => cn.loai.toUpperCase().includes(req.loaiChungNhan.toUpperCase()));
      const validCerts = matches.filter(cn => new Date(cn.ngayHetHan) > now);
      const expiringSoon = validCerts.filter(cn => {
        const daysLeft = Math.ceil((new Date(cn.ngayHetHan).getTime() - now.getTime()) / 86400_000);
        return daysLeft <= 30;
      });

      let status: 'dat' | 'sap_het_han' | 'thieu';
      if (validCerts.length === 0) status = 'thieu';
      else if (expiringSoon.length === validCerts.length) status = 'sap_het_han';
      else status = 'dat';

      return {
        loaiChungNhan: req.loaiChungNhan,
        batBuoc: req.batBuoc,
        canCu: req.canCu,
        status,
        soChungNhanHopLe: validCerts.length,
        soChungNhanSapHetHan: expiringSoon.length,
        deXuat: status === 'thieu' && req.batBuoc
          ? `Bổ sung ngay ${req.loaiChungNhan} — bắt buộc với ngành này`
          : status === 'sap_het_han'
            ? `Liên hệ tổ chức cấp để gia hạn ${req.loaiChungNhan}`
            : 'Tuân thủ tốt',
      };
    });

    const total = checklist.length;
    const dat = checklist.filter(c => c.status === 'dat').length;
    const sapHetHan = checklist.filter(c => c.status === 'sap_het_han').length;
    const thieu = checklist.filter(c => c.status === 'thieu').length;
    const thieuBatBuoc = checklist.filter(c => c.status === 'thieu' && c.batBuoc).length;

    // Chấm điểm 0-100
    const score = total === 0 ? 100 : Math.round(((dat * 1.0 + sapHetHan * 0.5) / total) * 100);
    let phanLoai: 'day_du' | 'mot_phan' | 'chua_dap_ung';
    if (thieuBatBuoc === 0 && score >= 90) phanLoai = 'day_du';
    else if (thieuBatBuoc <= 1 || score >= 50) phanLoai = 'mot_phan';
    else phanLoai = 'chua_dap_ung';

    return NextResponse.json({
      doanhNghiep: { id: dn.id, ten: dn.ten, maSoThue: dn.maSoThue, nganh_VSIC: dn.nganh_VSIC, trangThai: dn.trangThai },
      tongQuat: { total, dat, sapHetHan, thieu, thieuBatBuoc, score, phanLoai },
      checklist,
    });
  } catch (e: any) {
    console.error('GET /api/compliance/vsic:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
