import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

// FR-PRD-07: Bulk upload CSV for products
// POST body: { csvData: "ten,GTIN,nuocSanXuat,nhomSanPham,khoiLuong\nSP1,893...,Việt Nam,Thực phẩm,500g" }
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || !['admin', 'manufacturer'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Chỉ Nhà sản xuất hoặc Admin mới có thể import hàng loạt' }, { status: 403 });
    }
    // P1a — Sub-role: chỉ company_admin + staff_input được bulk import
    const vaiTroCty = cookieStore.get('vaiTroCty')?.value;
    if (userRole !== 'admin' && vaiTroCty && !['company_admin', 'staff_input'].includes(vaiTroCty)) {
      return NextResponse.json({ error: `Forbidden — vai trò nội bộ "${vaiTroCty}" không có quyền bulk import` }, { status: 403 });
    }

    const { csvData } = await req.json();
    if (!csvData) return NextResponse.json({ error: 'Thiếu dữ liệu CSV' }, { status: 400 });

    let targetDoanhNghiepId = doanhNghiepId;
    if (userRole === 'admin' && !targetDoanhNghiepId) {
      const d = await prisma.doanhNghiep.findFirst();
      if (d) targetDoanhNghiepId = d.id;
    }
    if (!targetDoanhNghiepId) return NextResponse.json({ error: 'Không tìm thấy doanh nghiệp' }, { status: 404 });

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return NextResponse.json({ error: 'CSV cần ít nhất 1 dòng dữ liệu sau header' }, { status: 400 });

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const results: { row: number; success: boolean; ten?: string; error?: string }[] = [];

    for (let i = 1; i < Math.min(lines.length, 101); i++) { // Max 100 rows
      const values = lines[i].split(',').map((v: string) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { row[h] = values[idx] || ''; });

      const ten = row['ten'] || row['name'] || row['tên'] || row['ten_san_pham'];
      if (!ten) {
        results.push({ row: i, success: false, error: 'Thiếu tên sản phẩm' });
        continue;
      }

      try {
        await prisma.sanPham.create({
          data: {
            maSKU: `SKU-${randomUUID().substring(0, 8).toUpperCase()}`,
            ten,
            moTa: row['mo_ta'] || row['mota'] || row['description'] || null,
            GTIN: row['gtin'] || row['ean'] || row['upc'] || null,
            nuocSanXuat: row['nuoc_san_xuat'] || row['nuocsanxuat'] || row['country'] || null,
            nhomSanPham: row['nhom_san_pham'] || row['nhom'] || row['category'] || null,
            khoiLuong: row['khoi_luong'] || row['khoiluong'] || row['weight'] || null,
            quyCach: row['quy_cach'] || row['quycach'] || null,
            thanhPhan: row['thanh_phan'] || row['thanhphan'] || row['ingredients'] || null,
            phamCap: row['pham_cap'] || row['phamcap'] || null,
            doanhNghiepId: targetDoanhNghiepId!,
          }
        });
        results.push({ row: i, success: true, ten });
      } catch (err: any) {
        results.push({ row: i, success: false, ten, error: err.message });
      }
    }

    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    await prisma.nhatKy.create({
      data: {
        action: `Bulk import CSV: ${success} sản phẩm thành công, ${failed} thất bại`,
        user: doanhNghiepId || 'Admin',
        role: userRole,
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: failed === 0 ? 'success' : 'warning',
      }
    });

    return NextResponse.json({
      total: results.length,
      success,
      failed,
      results,
      message: `Đã import ${success}/${results.length} sản phẩm thành công`,
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: Download CSV template
export async function GET() {
  const csvTemplate = `ten,gtin,nuoc_san_xuat,nhom_san_pham,khoi_luong,quy_cach,mo_ta,thanh_phan,pham_cap
Sữa tươi TH True Milk,8938506200017,Việt Nam,Thực phẩm,1L,12 hộp/thùng,Sữa tươi tiệt trùng không đường,,standard
Panadol Extra 500mg,4801232005527,Việt Nam,Dược phẩm,500mg/viên,24 viên/hộp,Thuốc giảm đau hạ sốt,Paracetamol 500mg + Caffeine 65mg,standard
Kem dưỡng da Pond's,8710908907401,Thái Lan,Mỹ phẩm,50g,1 hũ,Kem dưỡng ẩm ban đêm,Niacinamide\,Glycerin\,Shea Butter,premium`;

  return new NextResponse(csvTemplate, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="template_import_san_pham.csv"',
    }
  });
}
