import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
    const {
      serial, moTa, viTri, loaiSanPham, mucDo, thongTinLienHe, loaiBaoCao, metadata, anhBangChung,
      // Phase 7: 4 loại phản ánh + nơi mua + giá
      loaiPhanAnh, noiMua, giaMua,
    } = body;
    // Whitelist values
    const ALLOWED_LOAI    = ['san_pham', 'shop_gian_lan', 'quang_cao_sai', 'phan_hoi'];
    const ALLOWED_NOI_MUA = ['cho', 'shopee', 'tiktok', 'facebook', 'lazada', 'tiki', 'khac'];
    const safeLoaiPhanAnh = ALLOWED_LOAI.includes(loaiPhanAnh) ? loaiPhanAnh : 'san_pham';
    const safeNoiMua      = ALLOWED_NOI_MUA.includes(noiMua) ? noiMua : null;
    const safeGiaMua      = typeof giaMua === 'number' && giaMua > 0 ? giaMua : null;
    const safeCheDo       = loaiBaoCao === 'cong_khai' ? 'cong_khai' : (loaiBaoCao === 'lien_he' ? 'co_lien_he' : 'an_danh');

    if (!moTa && !metadata) {
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

    let finalMoTa = moTa;
    if (metadata) {
      // Lưu toàn bộ vào JSON string để bóc tách ở dashboard
      metadata.loaiSanPham = loaiSanPham;
      metadata.contactInfo = contactInfo;
      metadata.encryptedContact = encryptedContact;
      if (anhBangChung) metadata.anhBangChung = anhBangChung;
      finalMoTa = JSON.stringify(metadata);
    } else {
      // Báo cáo mới qua form có thể chứa ảnh -> lưu dạng JSON để parse dễ dàng
      const reportData = {
        serial,
        viTri,
        loaiSanPham,
        lyDo: moTa,
        contactInfo,
        encryptedContact,
        anhBangChung: anhBangChung || [],
      };
      finalMoTa = JSON.stringify(reportData);
    }

    // Lấy userName từ cookie nếu người dùng đã đăng nhập
    const cookieStore = await cookies();
    const userName = cookieStore.get('userName')?.value || null;

    // Log the report as a CanhBao
    await prisma.canhBao.create({
      data: {
        loai: 'NGUOI_DUNG_BAO_CAO',
        mucDo: mucDo || 'medium',
        moTa: finalMoTa,
        uid: serial || null,
        trangThai: 'open',
        nguoiBaoCao: userName,
        loaiPhanAnh: safeLoaiPhanAnh,
        noiMua:      safeNoiMua,
        giaMua:      safeGiaMua,
        cheDoAnDanh: safeCheDo,
      }
    });

    // UC11: Auto-aggregate — nếu ≥3 báo cáo cùng UID còn open → tạo cảnh báo mức Cao
    // (theo tài liệu nghiệp vụ §IV-V: ngưỡng `consumer_report_threshold` = 3)
    let escalated = false;
    if (serial) {
      const sameUidReports = await prisma.canhBao.count({
        where: {
          uid: serial,
          loai: 'NGUOI_DUNG_BAO_CAO',
          trangThai: 'open',
        }
      });
      if (sameUidReports >= 3) {
        // Kiểm tra đã có cảnh báo escalated cho UID này chưa
        const existingEscalated = await prisma.canhBao.findFirst({
          where: { uid: serial, loai: 'NGUOI_DUNG_BAO_CAO_ESCALATED', trangThai: 'open' }
        });
        if (!existingEscalated) {
          await prisma.canhBao.create({
            data: {
              loai: 'NGUOI_DUNG_BAO_CAO_ESCALATED',
              mucDo: 'high',
              moTa: `[ESCALATE] UID ${serial} đã nhận ${sameUidReports} báo cáo nghi ngờ từ người tiêu dùng. Đề xuất kiểm tra khẩn cấp + cân nhắc thu hồi lô hàng.`,
              uid: serial,
              trangThai: 'open',
            }
          });
          escalated = true;
        }
      }
    }

    // Also log to NhatKy
    await prisma.nhatKy.create({
      data: {
        action: `Báo cáo hàng giả (${loaiBaoCao || 'ẩn danh'}): Serial ${serial || 'N/A'} tại ${viTri || 'N/A'}${escalated ? ' [ESCALATED ≥3]' : ''}`,
        user: loaiBaoCao === 'cong_khai' ? thongTinLienHe : `Anonymous [${ip.substring(0, 8)}***]`,
        role: 'consumer',
        ip,
        status: escalated ? 'error' : 'warning',
      }
    });

    return NextResponse.json({ success: true, reportId: randomUUID().substring(0, 8).toUpperCase(), escalated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: Admin list reports
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userName = cookieStore.get('userName')?.value;
    if (!userRole || !userName) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'open';
    
    const where: any = status === 'all' ? {} : { trangThai: status };
    if (userRole !== 'admin') {
      where.nguoiBaoCao = userName;
    }

    const reports = await prisma.canhBao.findMany({
      where,
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
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    if (userRole !== 'admin') {
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

    return NextResponse.json({ report: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
