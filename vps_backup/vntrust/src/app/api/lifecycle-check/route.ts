import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Bảo mật API cron bằng secret key (thực tế sẽ được gọi từ Vercel Cron hoặc Linux Crontab)
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== 'vntrust-cron-key') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let generatedAlerts = 0;

    // 1. LỚP 1: QUÉT CHỨNG NHẬN (ISO, HACCP, v.v.)
    const chungNhans = await prisma.chungNhan.findMany();
    for (const cn of chungNhans) {
      const daysLeft = Math.ceil((cn.ngayHetHan.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let mucDo = null;
      let moTa = '';
      
      if (daysLeft < 0) {
        mucDo = 'high';
        moTa = `Chứng nhận ${cn.loai} (${cn.soChungNhan}) đã HẾT HẠN từ ${Math.abs(daysLeft)} ngày trước. Đề nghị xử lý khẩn cấp!`;
      } else if (daysLeft <= 30) {
        mucDo = 'medium';
        moTa = `Chứng nhận ${cn.loai} (${cn.soChungNhan}) SẮP HẾT HẠN trong ${daysLeft} ngày tới. Cần gia hạn ngay.`;
      } else if (daysLeft <= 90) {
        mucDo = 'low';
        moTa = `Chứng nhận ${cn.loai} (${cn.soChungNhan}) sắp hết hạn trong vòng 90 ngày (${daysLeft} ngày).`;
      }

      if (mucDo) {
        const alertUid = `CN-${cn.id}`;
        // Kiểm tra tránh duplicate alert (nếu alert cùng mức độ đang open)
        const existing = await prisma.canhBao.findFirst({
          where: { uid: alertUid, trangThai: 'open', mucDo: mucDo }
        });

        if (!existing) {
          await prisma.canhBao.create({
            data: { loai: 'HET_HAN_CHUNG_NHAN', mucDo, moTa, uid: alertUid, trangThai: 'open' }
          });
          generatedAlerts++;
        }
      }
    }

    // 2. LỚP 2: QUÉT HẠN SỬ DỤNG LÔ HÀNG (EXP)
    const loHangs = await prisma.loHang.findMany({ where: { trangThai: { not: 'recalled' } } });
    for (const lo of loHangs) {
      const daysLeft = Math.ceil((lo.hanDung.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let mucDo = null;
      let moTa = '';
      let newTrangThai = lo.trangThai;

      if (daysLeft < 0) {
        mucDo = 'high';
        moTa = `Lô hàng ${lo.maLo} đã QUÁ HẠN SỬ DỤNG. Hệ thống tự động chặn xuất kho.`;
        newTrangThai = 'suspended'; // Chặn phân phối tự động
      } else if (daysLeft <= 7) {
        mucDo = 'high';
        moTa = `Lô hàng ${lo.maLo} SẮP HẾT HẠN trong ${daysLeft} ngày. Yêu cầu lên phương án thu hồi.`;
      } else if (daysLeft <= 30) {
        mucDo = 'medium';
        moTa = `Lô hàng ${lo.maLo} cận date (còn ${daysLeft} ngày). Đề xuất đẩy mạnh xả hàng.`;
      }

      if (mucDo) {
        const alertUid = `LO-${lo.id}`;
        const existing = await prisma.canhBao.findFirst({
          where: { uid: alertUid, trangThai: 'open', mucDo: mucDo }
        });

        if (!existing) {
          await prisma.canhBao.create({
            data: { loai: 'HET_HAN_LO_HANG', mucDo, moTa, uid: alertUid, trangThai: 'open' }
          });
          generatedAlerts++;
          
          // Khóa lô hàng nếu đã hết hạn
          if (newTrangThai !== lo.trangThai) {
             await prisma.loHang.update({ where: { id: lo.id }, data: { trangThai: newTrangThai } });
             await prisma.nhatKy.create({
               data: {
                 action: `Tự động chặn xuất kho Lô hàng ${lo.maLo} (Quá hạn sử dụng)`,
                 user: 'Hệ thống Cron', role: 'system', ip: '127.0.0.1', status: 'error'
               }
             });
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: `Lifecycle check complete. Generated ${generatedAlerts} new alerts.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
