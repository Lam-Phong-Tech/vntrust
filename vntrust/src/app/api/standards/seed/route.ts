// POST /api/standards/seed — seed dữ liệu tiêu chuẩn ban đầu (idempotent, admin only)
// Dùng để khởi tạo bộ tiêu chuẩn mẫu lần đầu hoặc sau migration.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const SEED_DATA = [
  // Rau củ quả — kim loại nặng (QCVN 8-2:2011/BYT)
  { nhomSanPham: 'Rau củ', tenChiTieu: 'Chì (Pb)',    donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 0.1, canCu: 'QCVN 8-2:2011/BYT' },
  { nhomSanPham: 'Rau củ', tenChiTieu: 'Cadimi (Cd)', donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 0.05, canCu: 'QCVN 8-2:2011/BYT' },
  { nhomSanPham: 'Rau củ', tenChiTieu: 'Thủy ngân (Hg)', donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 0.05, canCu: 'QCVN 8-2:2011/BYT' },
  { nhomSanPham: 'Rau củ', tenChiTieu: 'Dư lượng thuốc BVTV (tổng)', donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 0.5, canCu: 'TT 50/2016/TT-BYT' },
  { nhomSanPham: 'Rau củ', tenChiTieu: 'Nitrat (NO3)', donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 500, canCu: 'QCVN 8-2:2011/BYT' },
  { nhomSanPham: 'Rau củ', tenChiTieu: 'E. coli',       donVi: 'CFU/g', loaiNguong: 'max', nguongMax: 100, canCu: 'QCVN 8-3:2012/BYT' },
  { nhomSanPham: 'Rau củ', tenChiTieu: 'Salmonella',    loaiNguong: 'qualitative', giaTriBatBuoc: 'negative', canCu: 'QCVN 8-3:2012/BYT' },

  // Thịt và sản phẩm thịt — vi sinh + hóa học (QCVN 8-3:2012/BYT)
  { nhomSanPham: 'Thịt', tenChiTieu: 'Tổng số vi khuẩn hiếu khí', donVi: 'CFU/g', loaiNguong: 'max', nguongMax: 1_000_000, canCu: 'QCVN 8-3:2012/BYT' },
  { nhomSanPham: 'Thịt', tenChiTieu: 'E. coli',     donVi: 'CFU/g', loaiNguong: 'max', nguongMax: 100, canCu: 'QCVN 8-3:2012/BYT' },
  { nhomSanPham: 'Thịt', tenChiTieu: 'Salmonella',  loaiNguong: 'qualitative', giaTriBatBuoc: 'negative', canCu: 'QCVN 8-3:2012/BYT' },
  { nhomSanPham: 'Thịt', tenChiTieu: 'Listeria monocytogenes', loaiNguong: 'qualitative', giaTriBatBuoc: 'negative', canCu: 'QCVN 8-3:2012/BYT' },
  { nhomSanPham: 'Thịt', tenChiTieu: 'Chì (Pb)',    donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 0.1, canCu: 'QCVN 8-2:2011/BYT' },
  { nhomSanPham: 'Thịt', tenChiTieu: 'Dư lượng Clenbuterol', donVi: 'µg/kg', loaiNguong: 'max', nguongMax: 0.2, canCu: 'TT 24/2013/TT-BYT' },
  { nhomSanPham: 'Thịt', tenChiTieu: 'Dư lượng Salbutamol', donVi: 'µg/kg', loaiNguong: 'max', nguongMax: 0.1, canCu: 'TT 24/2013/TT-BYT' },
  { nhomSanPham: 'Thịt', tenChiTieu: 'Dư lượng kháng sinh (tổng)', donVi: 'µg/kg', loaiNguong: 'max', nguongMax: 100, canCu: 'TT 24/2013/TT-BYT' },

  // Thực phẩm — chung
  { nhomSanPham: 'Thực phẩm', tenChiTieu: 'Aflatoxin B1', donVi: 'µg/kg', loaiNguong: 'max', nguongMax: 5, canCu: 'QCVN 8-1:2011/BYT' },
  { nhomSanPham: 'Thực phẩm', tenChiTieu: 'Asen (As)', donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 1, canCu: 'QCVN 8-2:2011/BYT' },
  { nhomSanPham: 'Thực phẩm', tenChiTieu: 'Chất bảo quản nhân tạo (tổng)', donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 1000, canCu: 'TT 27/2012/TT-BYT' },

  // Dược phẩm
  { nhomSanPham: 'Dược phẩm', tenChiTieu: 'Hàm lượng hoạt chất (so với nhãn)', donVi: '%', loaiNguong: 'range', nguongMin: 95, nguongMax: 105, canCu: 'Dược điển VN V' },
  { nhomSanPham: 'Dược phẩm', tenChiTieu: 'Tạp chất hữu cơ',       donVi: '%',     loaiNguong: 'max', nguongMax: 0.5, canCu: 'Dược điển VN V' },
  { nhomSanPham: 'Dược phẩm', tenChiTieu: 'Vi sinh tổng (TAMC)',   donVi: 'CFU/g', loaiNguong: 'max', nguongMax: 1000, canCu: 'Dược điển VN V' },

  // Mỹ phẩm — kim loại nặng (Hiệp định ASEAN cosmetic)
  { nhomSanPham: 'Mỹ phẩm', tenChiTieu: 'Chì (Pb)',     donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 20, canCu: 'ASEAN Cosmetic Directive' },
  { nhomSanPham: 'Mỹ phẩm', tenChiTieu: 'Thủy ngân (Hg)', donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 1, canCu: 'ASEAN Cosmetic Directive' },
  { nhomSanPham: 'Mỹ phẩm', tenChiTieu: 'Asen (As)',     donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 5, canCu: 'ASEAN Cosmetic Directive' },
  { nhomSanPham: 'Mỹ phẩm', tenChiTieu: 'Cadimi (Cd)',   donVi: 'mg/kg', loaiNguong: 'max', nguongMax: 5, canCu: 'ASEAN Cosmetic Directive' },
];

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin được seed tiêu chuẩn' }, { status: 403 });
    }

    const existing = await prisma.tieuChuanKiemNghiem.count();
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === '1';

    if (existing > 0 && !force) {
      return NextResponse.json({
        skipped: true,
        message: `Đã có ${existing} tiêu chuẩn. Gọi POST /api/standards/seed?force=1 để seed thêm (skip duplicate).`,
        existing,
      });
    }

    let created = 0;
    let skipped = 0;
    for (const data of SEED_DATA) {
      // Skip duplicate by (nhomSanPham, tenChiTieu)
      const dup = await prisma.tieuChuanKiemNghiem.findFirst({
        where: { nhomSanPham: data.nhomSanPham, tenChiTieu: data.tenChiTieu, trangThai: 'active' },
      });
      if (dup) { skipped++; continue; }
      await prisma.tieuChuanKiemNghiem.create({ data: data as any });
      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: created + skipped,
      message: `Đã seed ${created} tiêu chuẩn mới (${skipped} đã tồn tại).`,
    });
  } catch (e: any) {
    console.error('POST /api/standards/seed:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
