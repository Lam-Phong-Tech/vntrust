import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Basic auth check
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Lấy dữ liệu thực tế từ Database (giới hạn 1000 records gần nhất để tối ưu)
    const alerts = await prisma.canhBao.findMany({
      orderBy: { thoiGian: 'desc' },
      take: 1000
    });

    // Tạo Header cho file CSV (chuẩn RFC 4180)
    let csvData = 'ID Báo cáo,Thời gian,Loại cảnh báo,Mức độ,Trạng thái xử lý,UID Sản phẩm,Mô tả chi tiết\n';
    
    alerts.forEach(a => {
      // Làm sạch dữ liệu mô tả (xóa ký tự xuống dòng và escape dấu ngoặc kép)
      let moTa = a.moTa.replace(/\n/g, ' ').replace(/"/g, '""');
      
      // Kiểm tra xem có chứa thông tin liên hệ được mã hóa Identity Vault không
      // Nếu có, thay thế bằng ***SECURE_DATA*** để không làm lộ trên file xuất ra
      const secureMatch = moTa.match(/\[SECURE_CONTACT:(.+?)\]/);
      if (secureMatch) {
         moTa = moTa.replace(secureMatch[0], '***SECURE_DATA***');
      }

      // Nối dữ liệu vào CSV
      csvData += `"${a.id}","${a.thoiGian.toISOString()}","${a.loai}","${a.mucDo}","${a.trangThai}","${a.uid || ''}","${moTa}"\n`;
    });

    // Trả về file CSV (Có BOM \uFEFF để Excel hiển thị đúng tiếng Việt)
    return new NextResponse(Buffer.from('\uFEFF' + csvData, 'utf-8'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="VNTrust_Report_${new Date().toISOString().slice(0,10)}.csv"`
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
