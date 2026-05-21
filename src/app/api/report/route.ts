import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Cấu hình mã hóa AES-256-GCM (Zero Trust - Identity Vault giả lập)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encryptData(text: string) {
  if (!text) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// POST: Submit anonymous fake report
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const body = await req.json();
    const { serial, moTa, viTri, loaiSanPham, mucDo, thongTinLienHe, loaiBaoCao } = body;

    if (!moTa) {
      return NextResponse.json({ error: 'Vui lòng mô tả vấn đề' }, { status: 400 });
    }

    // Cơ chế Pseudonymisation (Giả danh hóa) & Anonymisation (Ẩn danh hóa)
    let contactInfo = 'Ẩn danh';
    let encryptedContact = null;

    if (loaiBaoCao === 'lien_he' && thongTinLienHe) {
      encryptedContact = encryptData(thongTinLienHe);
      contactInfo = 'Đã cung cấp liên hệ (Mã hóa bảo mật Identity Vault)';
    } else if (loaiBaoCao === 'cong_khai' && thongTinLienHe) {
      contactInfo = thongTinLienHe; // Người dùng đồng ý công khai
    }

    // Gắn SECURE_CONTACT vào cuối moTa để lưu trữ (không đổi schema DB)
    const baseMoTa = `[${loaiSanPham || 'Sản phẩm'}] Serial: ${serial || 'N/A'} | Vị trí: ${viTri || 'N/A'}\nNgười báo cáo: ${contactInfo}\nMô tả: ${moTa}`;
    const finalMoTa = encryptedContact ? `${baseMoTa}\n[SECURE_CONTACT:${encryptedContact}]` : baseMoTa;

    // Log the report as a CanhBao
    await prisma.canhBao.create({
      data: {
        loai: 'NGUOI_DUNG_BAO_CAO',
        mucDo: mucDo || 'medium',
        moTa: finalMoTa,
        uid: serial || null,
        trangThai: 'open',
      }
    });

    // Also log to NhatKy
    await prisma.nhatKy.create({
      data: {
        action: `Báo cáo hàng giả (${loaiBaoCao || 'ẩn danh'}): Serial ${serial || 'N/A'} tại ${viTri || 'N/A'}`,
        user: loaiBaoCao === 'cong_khai' ? thongTinLienHe : `Anonymous [${ip.substring(0, 8)}***]`,
        role: 'consumer',
        ip,
        status: 'warning',
      }
    });

    return NextResponse.json({ success: true, reportId: randomUUID().substring(0, 8).toUpperCase() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: Admin list reports
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'open';
    
    const reports = await prisma.canhBao.findMany({
      where: status === 'all' ? {} : { trangThai: status },
      orderBy: { thoiGian: 'desc' },
      take: 50,
    });

    // Đồng bộ dữ liệu hiển thị (Bóc tách chuỗi SECURE_CONTACT ra khỏi moTa)
    const formattedReports = reports.map(r => {
      let moTa = r.moTa;
      let isSecure = false;
      const secureMatch = moTa.match(/\n\[SECURE_CONTACT:(.+?)\]/);
      if (secureMatch) {
         isSecure = true;
         moTa = moTa.replace(secureMatch[0], ''); // Ẩn phần mã hóa khỏi UI
      }
      return { ...r, moTa, isSecureContact: isSecure };
    });

    return NextResponse.json({ reports: formattedReports });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: Admin update report status
export async function PATCH(req: NextRequest) {
  try {
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

    return NextResponse.json({ report: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
