import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Accept role from query param (localStorage-based auth)
    const userRole = searchParams.get('role') || '';
    const doanhNghiepId = searchParams.get('doanhNghiepId') || '';

    if (!userRole || !['admin', 'manufacturer', 'importer'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin sees ALL companies, NSX/NNK sees only their own
    const where = userRole === 'admin'
      ? {}
      : { id: doanhNghiepId || 'none' };

    const doanhNghieps = await prisma.doanhNghiep.findMany({
      where,
      include: {
        sanPhams: {
          include: { chungNhans: true }
        }
      }
    });

    const complianceData = doanhNghieps.map(dn => {
      let missingItems: string[] = [];
      let totalChecks = 0;
      let passedChecks = 0;

      // 1. Pháp lý doanh nghiệp cơ bản
      totalChecks += 2; // Giấy phép KD + CMND
      if (dn.giayphep_url) passedChecks++; else missingItems.push('Thiếu Giấy phép KD');
      if (dn.cmnd_url) passedChecks++; else missingItems.push('Thiếu CMND/CCCD Người đại diện');

      // 2. Checklist tuân thủ động theo Nhóm Sản Phẩm
      dn.sanPhams.forEach(sp => {
        const certTypes = sp.chungNhans.map(c => c.loai.toUpperCase());
        const hasExpiredCert = sp.chungNhans.some(c => c.ngayHetHan.getTime() < Date.now());

        if (hasExpiredCert) {
          missingItems.push(`Sản phẩm ${sp.ten}: Có chứng nhận đã hết hạn`);
        }

        if (sp.nhomSanPham === 'Thực phẩm' || sp.nhomSanPham === 'Thực phẩm chức năng') {
          totalChecks += 1;
          if (certTypes.includes('HACCP') || certTypes.includes('GMP')) passedChecks++;
          else missingItems.push(`Sản phẩm ${sp.ten}: Thiếu chứng nhận HACCP/GMP`);
        } else if (sp.nhomSanPham === 'Mỹ phẩm') {
          totalChecks += 1;
          if (certTypes.includes('CFS')) passedChecks++;
          else missingItems.push(`Sản phẩm ${sp.ten}: Thiếu Giấy lưu hành tự do (CFS)`);
        }
      });

      // 3. Phân loại mức độ tuân thủ
      const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;
      let complianceStatus = 'Chưa đáp ứng';
      if (score === 100) complianceStatus = 'Đáp ứng đầy đủ';
      else if (score >= 50) complianceStatus = 'Đáp ứng một phần';

      return {
        id: dn.id,
        ten: dn.ten,
        loai: dn.loai,
        kycStatus: dn.trangThai,   // verified | pending | suspended | revoked
        score: Math.round(score),
        status: complianceStatus,
        missingCount: missingItems.length,
        details: missingItems
      };
    });

    // Thống kê tổng quan cho Dashboard
    const stats = {
      totalDoanhNghiep: doanhNghieps.length,
      fullCompliance: complianceData.filter(d => d.status === 'Đáp ứng đầy đủ').length,
      partialCompliance: complianceData.filter(d => d.status === 'Đáp ứng một phần').length,
      nonCompliance: complianceData.filter(d => d.status === 'Chưa đáp ứng').length,
    };

    return NextResponse.json({ success: true, stats, data: complianceData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
