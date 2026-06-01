import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// §VI Sprint 8: extended checklists + GTIN + priority
import {
  getChecklistByNganhHang,
  validateGTIN,
  PRIORITY_ORDER,
  type Priority,
} from '@/lib/complianceChecklists';

export const dynamic = 'force-dynamic';

// Extract tỉnh/thành from địa chỉ (simple heuristic)
function extractRegion(diaChi: string): string | null {
  if (!diaChi) return null;
  const REGIONS = [
    'TP.HCM', 'TP. Hồ Chí Minh', 'Hồ Chí Minh', 'HCM',
    'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
    'Bình Dương', 'Đồng Nai', 'Bình Định', 'Nghệ An', 'Thanh Hóa',
    'Khánh Hòa', 'Huế', 'Quảng Nam', 'Bắc Ninh', 'Quảng Ninh',
    'Lâm Đồng', 'Vũng Tàu', 'Bà Rịa', 'Tiền Giang', 'Long An',
  ];
  const norm = diaChi.toLowerCase();
  for (const r of REGIONS) {
    if (norm.includes(r.toLowerCase())) {
      // Normalize HCM variants
      if (/hồ chí minh|hcm|tp\.hcm/i.test(r)) return 'TP.HCM';
      if (/bà rịa|vũng tàu/i.test(r)) return 'Bà Rịa - Vũng Tàu';
      return r;
    }
  }
  return null;
}

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

    // §VI Sprint 8: enriched compliance check với priority + checklist động
    interface MissingDetail {
      id: string;
      message: string;
      priority: Priority;
      canCu?: string;
      hanhDong?: string;
    }

    const complianceData = doanhNghieps.map(dn => {
      const missingDetails: MissingDetail[] = [];
      let totalChecks = 0;
      let passedChecks = 0;

      // 1. Pháp lý doanh nghiệp cơ bản
      totalChecks += 2;
      if (dn.giayphep_url) passedChecks++;
      else missingDetails.push({ id: 'GPKD', message: 'Thiếu Giấy phép Kinh doanh', priority: 'critical', canCu: 'Luật Doanh nghiệp 2020' });
      if (dn.cmnd_url) passedChecks++;
      else missingDetails.push({ id: 'CCCD', message: 'Thiếu CMND/CCCD Người đại diện', priority: 'high' });

      // 2. Checklist tuân thủ động theo §VI per sản phẩm
      dn.sanPhams.forEach((sp: any) => {
        const hasExpiredCert = sp.chungNhans.some((c: any) => c.ngayHetHan.getTime() < Date.now());
        if (hasExpiredCert) {
          missingDetails.push({
            id: `CERT-EXP-${sp.id}`,
            message: `Sản phẩm "${sp.ten}": Có chứng nhận đã hết hạn`,
            priority: 'critical',
            hanhDong: 'Gia hạn hoặc thu hồi sản phẩm khỏi lưu thông',
          });
        }

        // GTIN validation §VI.2
        if (sp.GTIN) {
          const gtinCheck = validateGTIN(sp.GTIN);
          if (!gtinCheck.ok) {
            missingDetails.push({
              id: `GTIN-${sp.id}`,
              message: `Sản phẩm "${sp.ten}": GTIN không hợp lệ — ${gtinCheck.reason}`,
              priority: 'medium',
              canCu: 'Tiêu chuẩn GS1',
              hanhDong: 'Đăng ký lại GTIN tại GS1 Vietnam',
            });
          }
          totalChecks += 1;
          if (gtinCheck.ok) passedChecks++;
        }

        // Apply ngành-specific checklist
        const items = getChecklistByNganhHang(sp.nhomSanPham || '', dn.loai);
        for (const item of items) {
          totalChecks += 1;
          const result = item.check({ doanhNghiep: dn, sanPham: sp, certs: sp.chungNhans });
          if (typeof (result as any).then === 'function') continue; // skip async for now
          const r = result as { ok: boolean; status: string; message?: string };
          if (r.ok) {
            passedChecks++;
          } else {
            missingDetails.push({
              id: `${item.id}-${sp.id}`,
              message: `Sản phẩm "${sp.ten}" [${item.id}]: ${item.hangMuc} — ${r.status === 'expired' ? 'ĐÃ HẾT HẠN' : 'THIẾU'}${r.message ? ' (' + r.message + ')' : ''}`,
              priority: item.priority,
              canCu: item.canCu,
              hanhDong: item.hanhDong,
            });
          }
        }
      });

      // 3. Phân loại mức độ tuân thủ
      const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;
      let complianceStatus = 'Chưa đáp ứng';
      if (score === 100) complianceStatus = 'Đáp ứng đầy đủ';
      else if (score >= 50) complianceStatus = 'Đáp ứng một phần';

      // Sort missing items by priority
      missingDetails.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));

      return {
        id: dn.id,
        ten: dn.ten,
        loai: dn.loai,
        diaChi: dn.diaChi || '',
        kycStatus: dn.trangThai,
        score: Math.round(score),
        status: complianceStatus,
        missingCount: missingDetails.length,
        priorityBreakdown: {
          critical: missingDetails.filter(m => m.priority === 'critical').length,
          high:     missingDetails.filter(m => m.priority === 'high').length,
          medium:   missingDetails.filter(m => m.priority === 'medium').length,
          low:      missingDetails.filter(m => m.priority === 'low').length,
        },
        details:        missingDetails.map(m => m.message),
        detailedItems:  missingDetails, // full structured per §VI.4
      };
    });

    // Thống kê tổng quan cho Dashboard (§VI.4.1)
    const stats = {
      totalDoanhNghiep: doanhNghieps.length,
      fullCompliance: complianceData.filter(d => d.status === 'Đáp ứng đầy đủ').length,
      partialCompliance: complianceData.filter(d => d.status === 'Đáp ứng một phần').length,
      nonCompliance: complianceData.filter(d => d.status === 'Chưa đáp ứng').length,
      // §VI.4.2 Priority breakdown tổng
      priorityTotals: complianceData.reduce((acc, d) => ({
        critical: acc.critical + d.priorityBreakdown.critical,
        high:     acc.high + d.priorityBreakdown.high,
        medium:   acc.medium + d.priorityBreakdown.medium,
        low:      acc.low + d.priorityBreakdown.low,
      }), { critical: 0, high: 0, medium: 0, low: 0 }),
    };

    // §VI.4.4 Heatmap khu vực — group by tỉnh/thành (extract từ diaChi)
    const regionMap = new Map<string, { count: number; nonCompliant: number; sumScore: number }>();
    for (const d of complianceData) {
      const region = extractRegion(d.diaChi) || 'Khác';
      const entry = regionMap.get(region) || { count: 0, nonCompliant: 0, sumScore: 0 };
      entry.count++;
      entry.sumScore += d.score;
      if (d.status === 'Chưa đáp ứng') entry.nonCompliant++;
      regionMap.set(region, entry);
    }
    const heatmap = Array.from(regionMap.entries()).map(([region, v]) => ({
      region,
      count: v.count,
      nonCompliant: v.nonCompliant,
      avgScore: Math.round(v.sumScore / v.count),
      riskLevel: v.nonCompliant / v.count >= 0.5 ? 'high' : (v.nonCompliant / v.count >= 0.25 ? 'medium' : 'low'),
    })).sort((a, b) => b.nonCompliant - a.nonCompliant);

    return NextResponse.json({ success: true, stats, heatmap, data: complianceData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
