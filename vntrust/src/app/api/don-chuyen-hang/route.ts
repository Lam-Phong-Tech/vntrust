import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// P0.1 — RBAC matrix:
//   POST   : NSX/NNK (sub-role staff_input | company_admin) tạo đơn cho DN mình
//   PATCH  : admin = approve/reject; manufacturer/importer = confirm/delivered
const POST_ROLES = ['manufacturer', 'importer'] as const;
const POST_SUBROLES = ['company_admin', 'staff_input'] as const;
const ADMIN_ACTIONS = ['approve', 'reject'] as const;
const DN_ACTIONS    = ['confirm_shipment', 'confirm_receipt', 'delivered', 'reject_distributor'] as const;

// GET: List all DonChuyenHang (filtered by role)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || '';
    const doanhNghiepId = searchParams.get('doanhNghiepId') || '';

    const where: any = {};
    if (role === 'admin') {
      // Admin sees all
    } else if (role === 'manufacturer' && doanhNghiepId) {
      // Doanh nghiệp (gộp NSX + NK): thấy đơn MÌNH GỬI (nsx) HOẶC đơn GỬI ĐẾN MÌNH (nsd)
      where.OR = [
        { nsxDoanhNghiepId: doanhNghiepId },
        { nsdDoanhNghiepId: doanhNghiepId, trangThai: { not: 'pending_review' } },
      ];
    } else if (role === 'importer' && doanhNghiepId) {
      // (Tương thích ngược) Bên nhận thấy đơn gán cho mình, loại pending_review
      where.nsdDoanhNghiepId = doanhNghiepId;
      where.trangThai = { not: 'pending_review' };
    } else if (role === 'importer') {
      where.trangThai = { in: ['pending_distributor', 'confirmed', 'distributed'] };
    } else {
      return NextResponse.json({ orders: [] });
    }

    const orders = await prisma.donChuyenHang.findMany({
      where,
      include: {
        loHang: {
          include: {
            sanPham: { include: { doanhNghiep: true } },
          },
        },
      },
      orderBy: { thoiGian: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: NSX tạo đơn chuyển hàng (manual transfer from distribution page)
export async function POST(req: NextRequest) {
  try {
    // P0.1 — RBAC: chỉ NSX/NNK (sub-role staff_input | company_admin) được tạo
    const ck = await cookies();
    const userRole = ck.get('userRole')?.value;
    const userDN   = ck.get('doanhNghiepId')?.value;
    const subRole  = ck.get('vaiTroCty')?.value;
    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (userRole !== 'admin' && !POST_ROLES.includes(userRole as any)) {
      return NextResponse.json({ error: 'Forbidden — chỉ NSX/NNK' }, { status: 403 });
    }
    if (userRole !== 'admin' && subRole && !POST_SUBROLES.includes(subRole as any)) {
      return NextResponse.json({ error: `Forbidden — vai trò nội bộ "${subRole}" không có quyền tạo đơn` }, { status: 403 });
    }

    const body = await req.json();
    const { loHangId, nsxDoanhNghiepId, nsdDoanhNghiepId, ghiChu, hinhAnhUrls, khuVucPhanPhoi } = body;

    if (!loHangId || !nsxDoanhNghiepId) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // P0.1 — Tenant isolation: NSX không thể tạo đơn cho DN khác
    if (userRole !== 'admin' && userDN && nsxDoanhNghiepId !== userDN) {
      return NextResponse.json({ error: 'Forbidden — không thể tạo đơn cho DN khác' }, { status: 403 });
    }

    // Check lô hàng tồn tại và đang active
    const loHang = await prisma.loHang.findUnique({ where: { id: loHangId } });
    if (!loHang) return NextResponse.json({ error: 'Lô hàng không tồn tại' }, { status: 404 });
    if (loHang.trangThai !== 'active') {
      return NextResponse.json({ error: 'Lô hàng không ở trạng thái sẵn sàng' }, { status: 400 });
    }

    // Tạo đơn chuyển
    const order = await prisma.donChuyenHang.create({
      data: {
        loHangId,
        nsxDoanhNghiepId,
        nsdDoanhNghiepId: nsdDoanhNghiepId || null,
        ghiChu: ghiChu || null,
        hinhAnhUrls: hinhAnhUrls ? JSON.stringify(hinhAnhUrls) : null,
        trangThai: 'pending_review',
      },
    });

    // Cập nhật trạng thái lô hàng -> pending_review
    const updateData: any = { trangThai: 'pending_review' };
    if (khuVucPhanPhoi) updateData.khuVucPhanPhoi = khuVucPhanPhoi;
    
    await prisma.loHang.update({
      where: { id: loHangId },
      data: updateData,
    });

    // Gửi thông báo cho Admin
    await prisma.thongBao.create({
      data: {
        tieuDe: '📦 Đơn chuyển hàng mới cần duyệt',
        noiDung: `Lô hàng ${loHang.maLo} đang chờ Admin kiểm duyệt trước khi chuyển sang nhà phân phối.`,
        loai: 'shipment',
        roleTarget: 'admin',
        daDoc: false,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: Admin duyệt/từ chối; NSD xác nhận/đã giao
export async function PATCH(req: NextRequest) {
  try {
    // P0.1 — RBAC: admin actions (approve/reject) vs NSX/NNK actions (confirm/delivered)
    const ck = await cookies();
    const userRole = ck.get('userRole')?.value;
    const userDN   = ck.get('doanhNghiepId')?.value;
    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, action, adminNote, assignNsdId, nsdDoanhNghiepId } = body;

    if (ADMIN_ACTIONS.includes(action) && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — chỉ admin được duyệt/từ chối' }, { status: 403 });
    }
    if (DN_ACTIONS.includes(action) && userRole !== 'admin' && !['manufacturer', 'importer'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden — chỉ NSX/NNK được xác nhận' }, { status: 403 });
    }

    const order = await prisma.donChuyenHang.findUnique({
      where: { id },
      include: { loHang: { include: { sanPham: true } } },
    });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 });

    // P0.1 — Tenant isolation cho NSX/NNK actions: chỉ confirm đơn của DN mình
    if (userRole !== 'admin' && DN_ACTIONS.includes(action) && userDN) {
      const ownsAsNsd = order.nsdDoanhNghiepId === userDN;
      const ownsAsNsx = order.nsxDoanhNghiepId === userDN;
      if (!ownsAsNsd && !ownsAsNsx) {
        return NextResponse.json({ error: 'Forbidden — đơn không thuộc DN của bạn' }, { status: 403 });
      }
    }

    if (action === 'approve') {
      // Admin duyệt → chuyển sang NSD (nếu có assignNsdId thì gán vào)
      const finalNsdId = assignNsdId || order.nsdDoanhNghiepId;
      if (!finalNsdId) return NextResponse.json({ error: 'Chưa có Nhà phân phối tiếp nhận' }, { status: 400 });

      await prisma.donChuyenHang.update({
        where: { id },
        data: { trangThai: 'pending_distributor', adminNote: adminNote || null, nsdDoanhNghiepId: finalNsdId },
      });
      await prisma.loHang.update({
        where: { id: order.loHangId },
        data: { trangThai: 'pending_distributor' },
      });
      await prisma.ketQuaHauKiem.updateMany({
        where: { loHangId: order.loHangId, trangThaiXacMinh: 'pending' },
        data: { trangThaiXacMinh: 'verified' },
      });
      await prisma.thongBao.create({
        data: {
          tieuDe: '✅ Đơn chuyển hàng đã được duyệt',
          noiDung: `Lô hàng ${order.loHang.maLo} đã được Admin duyệt và đang chờ nhà phân phối tiếp nhận.`,
          loai: 'shipment',
          doanhNghiepId: order.nsxDoanhNghiepId,
          daDoc: false,
        },
      });
      if (order.nsdDoanhNghiepId) {
        await prisma.thongBao.create({
          data: {
            tieuDe: '📬 Bạn có lô hàng mới cần tiếp nhận',
            noiDung: `Lô hàng ${order.loHang.maLo} đã được Admin duyệt, sẵn sàng để bạn tiếp nhận.`,
            loai: 'shipment',
            doanhNghiepId: order.nsdDoanhNghiepId,
            daDoc: false,
          },
        });
      }

    } else if (action === 'reject') {
      await prisma.donChuyenHang.update({
        where: { id },
        data: { trangThai: 'rejected', adminNote: adminNote || 'Không đạt yêu cầu' },
      });
      await prisma.loHang.update({
        where: { id: order.loHangId },
        data: { trangThai: 'active' },
      });
      await prisma.thongBao.create({
        data: {
          tieuDe: '❌ Đơn chuyển hàng bị từ chối',
          noiDung: `Lô hàng ${order.loHang.maLo} đã bị Admin từ chối. Lý do: ${adminNote || 'Không đạt yêu cầu'}. Lô hàng đã được trả về.`,
          loai: 'shipment',
          doanhNghiepId: order.nsxDoanhNghiepId,
          daDoc: false,
        },
      });

    } else if (action === 'reject_distributor') {
      // ── NSD từ chối tiếp nhận ──
      const reason = adminNote || 'Lý do không xác định';
      await prisma.donChuyenHang.update({
        where: { id },
        data: { trangThai: 'rejected', adminNote: `Nhà phân phối từ chối: ${reason}` },
      });
      await prisma.loHang.update({
        where: { id: order.loHangId },
        data: { trangThai: 'active' },
      });
      // Thông báo NSX
      await prisma.thongBao.create({
        data: {
          tieuDe: '❌ Đơn chuyển hàng bị từ chối bởi Nhà phân phối',
          noiDung: `Nhà phân phối đã từ chối lô hàng ${order.loHang.maLo}. Lý do: ${reason}. Lô hàng đã được trả về trạng thái sẵn sàng.`,
          loai: 'shipment',
          doanhNghiepId: order.nsxDoanhNghiepId,
          daDoc: false,
        },
      });
      // Thông báo Admin
      await prisma.thongBao.create({
        data: {
          tieuDe: '⚠️ NPP từ chối đơn — cần chỉ định NPP mới',
          noiDung: `Nhà phân phối đã từ chối lô hàng ${order.loHang.maLo}. Lý do: ${reason}. Vui lòng chỉ định Nhà phân phối khác.`,
          loai: 'shipment',
          roleTarget: 'admin',
          daDoc: false,
        },
      });

    } else if (action === 'confirm_shipment') {
      // ── NSD/Importer xác nhận đơn vận chuyển (pending_distributor → confirmed) ──
      await prisma.donChuyenHang.update({
        where: { id },
        data: {
          trangThai: 'confirmed',
          nsdDoanhNghiepId: nsdDoanhNghiepId || order.nsdDoanhNghiepId,
        },
      });
      // Thông báo NSX
      await prisma.thongBao.create({
        data: {
          tieuDe: '✅ Nhà phân phối đã xác nhận đơn vận chuyển',
          noiDung: `Nhà phân phối xác nhận đã tiếp nhận lô hàng ${order.loHang.maLo} và sẽ tiến hành vận chuyển.`,
          loai: 'shipment',
          doanhNghiepId: order.nsxDoanhNghiepId,
          daDoc: false,
        },
      });

    } else if (action === 'confirm_receipt') {
      // NSD xác nhận tiếp nhận (old flow) → ready
      await prisma.donChuyenHang.update({
        where: { id },
        data: { trangThai: 'ready', nsdDoanhNghiepId: nsdDoanhNghiepId || order.nsdDoanhNghiepId },
      });
      await prisma.loHang.update({
        where: { id: order.loHangId },
        data: { trangThai: 'active' },
      });

    } else if (action === 'delivered') {
      // NSD hoàn thành vận chuyển (works from both confirmed and ready states)
      await prisma.donChuyenHang.update({
        where: { id },
        data: { trangThai: 'distributed' },
      });
      await prisma.loHang.update({
        where: { id: order.loHangId },
        data: { trangThai: 'distributed' },
      });
      // Thông báo NSX
      await prisma.thongBao.create({
        data: {
          tieuDe: '🚚 Lô hàng đã được giao thành công',
          noiDung: `Nhà phân phối xác nhận đã giao lô hàng ${order.loHang.maLo}. Số lượng xuất kho đã được cập nhật.`,
          loai: 'shipment',
          doanhNghiepId: order.nsxDoanhNghiepId,
          daDoc: false,
        },
      });

    } else {
      return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
