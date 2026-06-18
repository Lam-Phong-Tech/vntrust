// PATCH /api/investigation/[id]/conclude
// Cán bộ kết luận hồ sơ điều tra (nhân công xác nhận)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    const userName = cookieStore.get('userName')?.value;

    if (role !== 'admin' && role !== 'investigator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { trangThaiDieuTra, ketLuan, loaiGianLan } = await req.json();

    if (!id || !trangThaiDieuTra) {
      return NextResponse.json({ error: 'Thiếu id hoặc trạng thái' }, { status: 400 });
    }

    const existing = await prisma.canhBao.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Hồ sơ không tồn tại' }, { status: 404 });

    // Cập nhật trạng thái CanhBao
    let finalMoTa = existing.moTa || '';
    if (ketLuan) {
      finalMoTa += `\n\n--- KẾT LUẬN ĐIỀU TRA (${userName}) ---\n${ketLuan}`;
    }

    const updated = await prisma.canhBao.update({
      where: { id },
      data: {
        trangThaiDieuTra,
        trangThai: trangThaiDieuTra === 'dong' || trangThaiDieuTra === 'da_xu_ly' ? 'closed' : existing.trangThai,
        moTa: finalMoTa
      }
    });

    // Nếu kết luận là gian lận, lưu vào FraudHistory để AI học lại
    if (loaiGianLan && existing.uid) {
      // Tìm sản phẩm ID
      const ma = await prisma.maDinhDanh.findFirst({
        where: { uid: existing.uid },
        include: { loHang: true }
      });
      
      await prisma.fraudHistory.create({
        data: {
          uid: existing.uid,
          sanPhamId: ma?.loHang?.sanPhamId,
          loaiGianLan,
          nguonPhatHien: 'nhan_cong',
          diemRuiRo: existing.riskScore || 0,
          xacNhanBoi: userName,
          ghiChu: ketLuan,
          trainingLabel: 'fake' // Gắn nhãn fake cho model training
        }
      });
      
      // Update checklist tương ứng nếu có
      await prisma.verificationChecklist.updateMany({
        where: { canhBaoId: id, tuDong: true },
        data: {
          tuDong: false,
          nguoiXacNhan: userName,
          ketQua: 'gia_mao',
          mauHienThi: 'black'
        }
      });
    }

    return NextResponse.json({ success: true, report: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
