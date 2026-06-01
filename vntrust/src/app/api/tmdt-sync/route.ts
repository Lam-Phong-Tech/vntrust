import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { platform, listingUrl, uid, reason } = await req.json();

    if (!platform || !listingUrl) {
      return NextResponse.json({ error: 'Thiếu thông tin nền tảng TMĐT hoặc đường dẫn sản phẩm' }, { status: 400 });
    }

    // 1. Ghi log lịch sử hệ thống
    await prisma.nhatKy.create({
      data: {
        action: `Gửi lệnh gỡ listing vi phạm trên ${platform} (Mã: ${uid || 'N/A'})`,
        user: 'System Bot',
        role: 'admin',
        ip: '127.0.0.1',
        status: 'warning'
      }
    });

    // 2. Mô phỏng call API tới Shopee / TikTok Shop Open API
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({
      success: true,
      platform,
      ticketId: `TICKET-${Math.floor(Math.random() * 1000000)}`,
      message: `Đã tự động gửi báo cáo gỡ bỏ (Takedown Request) tới bộ phận kiểm duyệt của ${platform} thành công.`
    });

  } catch (error: any) {
    console.error("TMDT Sync Error:", error);
    return NextResponse.json({ error: 'Lỗi kết nối tới sàn TMĐT' }, { status: 500 });
  }
}
