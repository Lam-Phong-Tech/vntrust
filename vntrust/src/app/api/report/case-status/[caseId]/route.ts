import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/report/case-status/[caseId]
// Trả về trạng thái xử lý hồ sơ theo mã CASE cho người tiêu dùng tra cứu
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    if (!caseId || !caseId.startsWith('CASE-')) {
      return NextResponse.json({ error: 'Mã hồ sơ không hợp lệ. Định dạng: CASE-YYYY-XXXXXX' }, { status: 400 });
    }

    const canhBao = await prisma.canhBao.findFirst({
      where: { maCaseHoSo: caseId },
      select: {
        id:               true,
        maCaseHoSo:       true,
        loai:             true,
        mucDo:            true,
        trangThai:        true,
        trangThaiDieuTra: true,
        thoiGian:         true,
        uid:              true,
        riskScore:        true,
        tinhTrangSP:      true,
        // KHÔNG trả về moTa (có thể chứa thông tin mã hóa) và ảnh cụ thể — bảo mật
      },
    });

    if (!canhBao) {
      return NextResponse.json(
        { error: `Không tìm thấy hồ sơ có mã "${caseId}". Vui lòng kiểm tra lại.` },
        { status: 404 }
      );
    }

    // Map trạng thái sang thông điệp thân thiện với NTD
    const STATUS_LABEL: Record<string, { label: string; mota: string; color: string }> = {
      cho_phan_tich:  { label: 'Đề nghị kiểm tra',   mota: 'Hồ sơ đã được tiếp nhận và đang chờ AI phân tích',      color: 'blue'   },
      dang_dieu_tra:  { label: 'Đang điều tra',       mota: 'Cơ quan chức năng đang xác minh thông tin sản phẩm',    color: 'orange' },
      da_xu_ly:       { label: 'Đã xử lý',            mota: 'Hồ sơ đã được xử lý. Cảm ơn bạn đã đóng góp!',         color: 'green'  },
      dong:           { label: 'Đã đóng',             mota: 'Hồ sơ đã được đóng sau khi xác minh',                   color: 'gray'   },
    };

    const trangThaiInfo = STATUS_LABEL[canhBao.trangThaiDieuTra ?? 'cho_phan_tich']
      ?? { label: 'Đang xử lý', mota: 'Hồ sơ đang được xử lý', color: 'blue' };

    return NextResponse.json({
      maCaseHoSo:       canhBao.maCaseHoSo,
      trangThai:        trangThaiInfo,
      mucDo:            canhBao.mucDo,
      riskScore:        canhBao.riskScore,
      uid:              canhBao.uid,
      ngayTiepNhan:     canhBao.thoiGian,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
