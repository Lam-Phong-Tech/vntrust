import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET: List alerts (PHÂN HỆ 5 public API)
// Tài liệu nghiệp vụ §II — Public API:
//   GET /api/alerts?category={cat}&location={loc}&status={st}&mucDo={lv}
// Để cơ quan quản lý (QLTT, Bộ Công an) lấy danh sách cảnh báo lọc theo ngành hàng + địa bàn
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const mucDo  = searchParams.get('mucDo');
    // PHÂN HỆ 5 — Public filters
    const category = searchParams.get('category'); // ngành hàng — match loaiPhanAnh hoặc moTa.loaiSanPham
    const location = searchParams.get('location'); // địa bàn — match moTa.viTri (substring)

    const where: Record<string, any> = {
      loai: 'NGUOI_DUNG_BAO_CAO', // default: show user reports
    };
    // Admin / manufacturer / importer can see all types
    const roleParam = searchParams.get('role');
    if (roleParam === 'admin' || roleParam === 'manufacturer' || roleParam === 'importer') {
      delete where.loai; // show all
    }
    if (status && status !== 'all') where.trangThai = status;
    if (mucDo && mucDo !== 'all') where.mucDo = mucDo;

    // category filter — đối chiếu loaiPhanAnh (4 nhóm PH2) hoặc loại sản phẩm trong metadata
    if (category && category !== 'all') {
      const CATEGORY_MAP: Record<string, string> = {
        san_pham: 'san_pham', shop_gian_lan: 'shop_gian_lan',
        quang_cao_sai: 'quang_cao_sai', phan_hoi: 'phan_hoi',
      };
      const ph = CATEGORY_MAP[category];
      if (ph) {
        where.loaiPhanAnh = ph;
      } else {
        // free-text → tìm trong moTa JSON loaiSanPham field
        where.moTa = { contains: category };
      }
    }
    // location filter — tìm chuỗi trong moTa (vì viTri là field JSON)
    if (location) {
      where.moTa = { ...(where.moTa || {}), contains: location };
    }

    const alerts = await prisma.canhBao.findMany({
      where,
      orderBy: { thoiGian: 'desc' },
      take: 100,
    });

    // Strip encrypted contact info from moTa
    const formattedAlerts = alerts.map(a => {
      let moTa = a.moTa;
      const secureMatch = moTa.match(/\n\[SECURE_CONTACT:(.+?)\]/);
      if (secureMatch) {
        moTa = moTa.replace(secureMatch[0], '');
      }
      return { ...a, moTa };
    });

    // Stats
    const stats = {
      total: await prisma.canhBao.count(),
      open: await prisma.canhBao.count({ where: { trangThai: 'open' } }),
      high: await prisma.canhBao.count({ where: { mucDo: 'high' } }),
      closed: await prisma.canhBao.count({ where: { trangThai: 'closed' } }),
    };

    return NextResponse.json({ alerts: formattedAlerts, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Create a new alert (system or admin)
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { loai, mucDo, moTa, uid } = await req.json();
    if (!loai || !mucDo || !moTa) return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });

    const alert = await prisma.canhBao.create({
      data: { loai, mucDo, moTa, uid: uid || null, trangThai: 'open' },
    });

    await prisma.nhatKy.create({
      data: {
        action: `Tạo cảnh báo [${mucDo.toUpperCase()}]: ${moTa.substring(0, 80)}`,
        user: 'Admin',
        role: 'admin',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: mucDo === 'high' ? 'error' : 'warning',
      }
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: Update alert status + ghi phản hồi
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    if (!userRole || !['admin', 'manufacturer', 'importer'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, trangThai, ghiChu } = await req.json();
    if (!id || !trangThai) return NextResponse.json({ error: 'Thiếu id hoặc trạng thái' }, { status: 400 });

    const existing = await prisma.canhBao.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let finalMoTa = existing.moTa;
    if (ghiChu && trangThai === 'reviewing') {
       finalMoTa += '\n\n--- GHI CHÚ ĐIỀU TRA (Admin) ---\n' + ghiChu;
    } else if (ghiChu && trangThai === 'closed') {
       finalMoTa += '\n\n--- KẾT QUẢ ĐÓNG CẢNH BÁO ---\n' + ghiChu;
    }

    const updated = await prisma.canhBao.update({
      where: { id },
      data: { trangThai, moTa: finalMoTa },
    });

    return NextResponse.json({ alert: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
