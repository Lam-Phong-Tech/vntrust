import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET: List companies (admin sees all, others see their own)
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const listDistributors = searchParams.get('list_distributors');

    // ── list_distributors: danh sách DN có thể nhận hàng ──
    // Sau khi gộp vai trò, mọi Doanh nghiệp đều có thể là bên nhận → trả về tất cả DN
    // (loại trừ DN của chính người gọi để không tự chuyển cho mình).
    if (listDistributors === 'true') {
      const list = await prisma.doanhNghiep.findMany({
        where: doanhNghiepId ? { id: { not: doanhNghiepId } } : {},
        select: { id: true, ten: true, maSoThue: true, diaChi: true, trangThai: true },
        orderBy: { ten: 'asc' },
      });
      // Map 'ten' -> 'tenDoanhNghiep' for frontend compatibility
      const mappedList = list.map(c => ({ ...c, tenDoanhNghiep: c.ten }));
      return NextResponse.json({ companies: mappedList });
    }

    // ── Admin: xem tất cả doanh nghiệp ──
    if (userRole === 'admin') {
      const list = await prisma.doanhNghiep.findMany({
        include: { _count: { select: { sanPhams: true, nguoiDungs: true } } },
        orderBy: { ngayDangKy: 'desc' },
      });
      return NextResponse.json({ role: 'admin', companies: list });
    }

    if (!doanhNghiepId) return NextResponse.json({ error: 'No enterprise assigned' }, { status: 403 });

    const company = await prisma.doanhNghiep.findUnique({
      where: { id: doanhNghiepId },
      include: { _count: { select: { sanPhams: true } } },
    });
    return NextResponse.json({ role: userRole, company });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: Admin approve/reject -OR- Company tự cập nhật thông tin KYC
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, action, trangThai, lyDo, ...kycFields } = body;

    // ── Admin: phê duyệt / từ chối ──────────────────────────────────────────
    if (action === 'admin_approval') {
      if (userRole !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      if (!id || !trangThai) return NextResponse.json({ error: 'Thiếu id hoặc trangThai' }, { status: 400 });
      if (!['verified', 'pending', 'suspended', 'revoked'].includes(trangThai)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
      }

      // P2 — Lấy trạng thái cũ để biết khi nào cần cascade
      const before = await prisma.doanhNghiep.findUnique({ where: { id }, select: { trangThai: true, ten: true, giayphep_url: true, cmnd_url: true } });

      // ── BẮT BUỘC giấy tờ: không cho phê duyệt (verified) nếu thiếu GPKD hoặc CMND/CCCD ──
      if (trangThai === 'verified' && (!before?.giayphep_url || !before?.cmnd_url)) {
        const missing = [!before?.giayphep_url ? 'Giấy phép KD' : null, !before?.cmnd_url ? 'CMND/CCCD' : null].filter(Boolean).join(', ');
        return NextResponse.json({ error: `Không thể phê duyệt: doanh nghiệp chưa nộp đủ giấy tờ (${missing})` }, { status: 400 });
      }

      // #24: lưu lý do khoá để admin xem lại khi cân nhắc mở khoá; mở khoá (verified) → xoá lý do
      const updateData: any = { trangThai };
      if (trangThai === 'suspended' || trangThai === 'revoked') updateData.lyDoKhoa = lyDo || null;
      else if (trangThai === 'verified') updateData.lyDoKhoa = null;
      const updated = await prisma.doanhNghiep.update({ where: { id }, data: updateData });

      // P2 CASCADE — DN bị suspended/revoked → vô hiệu hóa toàn bộ UID của DN
      const wasActive = before?.trangThai === 'verified';
      const nowInactive = trangThai === 'suspended' || trangThai === 'revoked';
      const nowReactive = trangThai === 'verified';
      let affectedUids = 0;
      let restoredUids = 0;

      if (wasActive && nowInactive) {
        // Khóa: set tất cả MaDinhDanh.trangThai='suspended' (chừa fake để admin theo dõi)
        const result = await prisma.maDinhDanh.updateMany({
          where: {
            loHang: { sanPham: { doanhNghiepId: id } },
            trangThai: 'active',
          },
          data: { trangThai: 'suspended' },
        });
        affectedUids = result.count;
        // Tạo cảnh báo cấp cao cho admin theo dõi
        await prisma.canhBao.create({
          data: {
            loai: 'DN_SUSPENDED_CASCADE',
            mucDo: 'critical',
            moTa: `DN "${updated.ten}" bị ${trangThai === 'revoked' ? 'thu hồi' : 'tạm khóa'}. ${affectedUids} mã UID đã bị vô hiệu hóa tạm thời.${lyDo ? ' Lý do: ' + lyDo : ''}`,
            trangThai: 'open',
          },
        });
      } else if (!wasActive && nowReactive) {
        // Mở khóa: revert UID suspended → active
        const result = await prisma.maDinhDanh.updateMany({
          where: {
            loHang: { sanPham: { doanhNghiepId: id } },
            trangThai: 'suspended',
          },
          data: { trangThai: 'active' },
        });
        restoredUids = result.count;
      }

      const actionLabel = trangThai === 'verified' ? 'Phê duyệt / Mở khóa'
        : trangThai === 'suspended' ? 'Từ chối / Tạm khóa'
        : trangThai === 'revoked' ? 'Thu hồi (Khóa tài khoản)'
        : 'Đặt lại';
      await prisma.nhatKy.create({
        data: {
          action: `KYC ${actionLabel}: ${updated.ten}${lyDo ? ' — ' + lyDo : ''}${affectedUids > 0 ? ` · cascade ${affectedUids} UIDs suspended` : ''}${restoredUids > 0 ? ` · restored ${restoredUids} UIDs` : ''}`,
          user: 'Admin', role: 'admin',
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: trangThai === 'revoked' ? 'warning' : 'success',
        }
      });
      return NextResponse.json({
        company: updated,
        cascade: { affectedUids, restoredUids },
      });
    }

    // ── Admin bổ sung / cập nhật giấy tờ + thông tin cho 1 DN bất kỳ (#25) ──
    // Cho phép admin nộp hộ Giấy phép KD / CMND-CCCD khi DN tự tạo chưa có giấy tờ,
    // để sau đó có thể phê duyệt (mở khoá) được.
    if (action === 'admin_update') {
      if (userRole !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      if (!id) return NextResponse.json({ error: 'Thiếu id doanh nghiệp' }, { status: 400 });
      const allowed = ['nganh_VSIC', 'email', 'hotline', 'nguoiDaiDien', 'giayphep_url', 'cmnd_url', 'diaChi'];
      const updateData: Record<string, any> = {};
      for (const key of allowed) {
        if (kycFields[key] !== undefined) updateData[key] = kycFields[key];
      }
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu cập nhật' }, { status: 400 });
      }
      const updated = await prisma.doanhNghiep.update({ where: { id }, data: updateData });
      await prisma.nhatKy.create({
        data: {
          action: `KYC Admin bổ sung giấy tờ/thông tin DN "${updated.ten}": ${Object.keys(updateData).join(', ')}`,
          user: cookieStore.get('userName')?.value || 'Admin',
          role: 'admin', ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'success',
        },
      }).catch(() => {});
      return NextResponse.json({ company: updated });
    }

    // ── Doanh nghiệp tự cập nhật thông tin KYC ──────────────────────────────
    if (action === 'update_info') {
      if (!doanhNghiepId) return NextResponse.json({ error: 'No enterprise assigned' }, { status: 403 });
      // Chỉ cho phép cập nhật các field KYC, không cho tự phê duyệt
      const allowed = ['nganh_VSIC', 'email', 'hotline', 'nguoiDaiDien', 'giayphep_url', 'cmnd_url', 'diaChi'];
      const updateData: Record<string, any> = {};
      for (const key of allowed) {
        if (kycFields[key] !== undefined) updateData[key] = kycFields[key];
      }
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu cập nhật' }, { status: 400 });
      }

      // Phase 3 — Nếu diaChi đổi, reset lat/lng để batch geocode sau (hoặc inline geocode)
      if (updateData.diaChi !== undefined) {
        const before = await prisma.doanhNghiep.findUnique({
          where: { id: doanhNghiepId }, select: { diaChi: true } as any,
        });
        if ((before as any)?.diaChi !== updateData.diaChi) {
          // Address đổi → clear coords để được re-geocode
          (updateData as any).lat = null;
          (updateData as any).lng = null;
          // Inline geocode (best effort, không chặn save nếu fail)
          try {
            const { geocodeAddress } = await import('@/lib/geocode');
            const geo = await geocodeAddress(updateData.diaChi);
            if (geo) {
              (updateData as any).lat = geo.lat;
              (updateData as any).lng = geo.lng;
            }
          } catch {}
        }
      }

      const updated = await prisma.doanhNghiep.update({
        where: { id: doanhNghiepId },
        data: updateData,
      });
      await prisma.nhatKy.create({
        data: {
          action: `KYC cập nhật thông tin: ${Object.keys(updateData).join(', ')}${(updateData as any).lat ? ' · geocoded' : ''}`,
          user: cookieStore.get('userName')?.value || 'User',
          role: userRole, ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'success',
        }
      });
      return NextResponse.json({ company: updated });
    }

    // Backward compat: old admin PATCH without action field
    if (userRole === 'admin' && trangThai) {
      if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
      const updated = await prisma.doanhNghiep.update({ where: { id }, data: { trangThai } });
      return NextResponse.json({ company: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


// POST: Register new company (from manufacturer/importer register flow)
export async function POST(req: NextRequest) {
  try {
    const { maSoThue, ten, diaChi, nganh_VSIC, loai } = await req.json();
    if (!maSoThue || !ten || !loai) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const existing = await prisma.doanhNghiep.findUnique({ where: { maSoThue } });
    if (existing) return NextResponse.json({ error: 'Mã số thuế đã tồn tại' }, { status: 409 });

    const company = await prisma.doanhNghiep.create({
      data: { maSoThue, ten, diaChi, nganh_VSIC, loai, trangThai: 'pending' },
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
