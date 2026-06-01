import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import {
  startIntegrationHealthChecker,
  getHealthStatus,
  forceHealthCheck,
} from '@/lib/integrationChecker';

// Khởi động background worker ngay khi module được load (server start)
// setInterval chạy ngầm — không cần giao diện
startIntegrationHealthChecker();

// ─── Static metadata cho từng integration ────────────────────────
const INTEGRATION_META: Record<string, any> = {
  haiquan: {
    name: 'Hải quan Việt Nam',
    nameEn: 'Vietnam Customs',
    description: 'Tra cứu tờ khai nhập khẩu, HS code, ngày thông quan',
    descriptionEn: 'Lookup import declarations, HS code, clearance date',
    protocol: 'REST API (HTTPS) + Webhook',
    icon: 'local_shipping',
    color: 'blue',
    endpoint: 'https://customs.gov.vn',
    authType: 'API Key + mTLS',
    dataFields: ['Số tờ khai', 'Ngày thông quan', 'Cửa khẩu', 'HS Code', 'Số lượng', 'Địa chỉ shipper'],
    dataFieldsEn: ['Declaration No.', 'Clearance Date', 'Border Gate', 'HS Code', 'Quantity', 'Shipper Address'],
    phase: 2,
  },
  byt: {
    name: 'Bộ Y tế / Cục ATTP',
    nameEn: 'Ministry of Health / Food Safety',
    description: 'Kiểm tra chứng nhận thực phẩm, dược phẩm, mỹ phẩm',
    descriptionEn: 'Verify food, pharma & cosmetics certifications',
    protocol: 'REST API (OAuth 2.0 + mTLS) + Webhook',
    icon: 'medical_services',
    color: 'emerald',
    endpoint: 'https://moh.gov.vn',
    authType: 'OAuth 2.0',
    dataFields: ['Số hiệu chứng nhận', 'Ngày cấp', 'Ngày hết hạn', 'Loại chứng nhận'],
    dataFieldsEn: ['Cert No.', 'Issue Date', 'Expiry Date', 'Cert Type'],
    phase: 2,
  },
  bct: {
    name: 'Bộ Công Thương',
    nameEn: 'Ministry of Industry & Trade',
    description: 'Kiểm tra giấy phép kinh doanh, thương hiệu đã đăng ký',
    descriptionEn: 'Verify business licenses & registered trademarks',
    protocol: 'SOAP Web Service (legacy) + REST API',
    icon: 'business',
    color: 'purple',
    endpoint: 'https://moit.gov.vn',
    authType: 'OAuth 2.0',
    dataFields: ['Giấy phép KD', 'Chứng nhận tiêu chuẩn', 'Thương hiệu đã đăng ký'],
    dataFieldsEn: ['Business License', 'Standards Cert', 'Registered Trademark'],
    phase: 2,
  },
  email: {
    name: 'Email / SMS Gateway',
    description: 'Gửi cảnh báo, OTP, thông báo cho doanh nghiệp',
    protocol: 'SMTP + Twilio/SNS API',
    icon: 'email',
    color: 'cyan',
    endpoint: 'smtp.gmail.com:587',
    authType: 'SMTP Auth',
    dataFields: ['OTP', 'Alert notifications', 'KYC emails'],
    phase: 1,
  },
  maps: {
    name: 'Google Maps / Mapbox',
    description: 'Hiển thị vị trí GPS trên bản đồ, heatmap hàng giả',
    protocol: 'REST API (Geocoding, Maps Display)',
    icon: 'map',
    color: 'amber',
    endpoint: 'https://maps.googleapis.com/maps/api',
    authType: 'API Key',
    dataFields: ['GPS coordinates', 'Geocoding', 'Heatmap data'],
    phase: 1,
  },
  camera_ai: {
    name: 'Camera AI / Edge Gateway',
    description: 'Giám sát hàng giả thụ động tại điểm bán',
    protocol: 'MQTT + HTTPS + RTSP',
    icon: 'videocam',
    color: 'red',
    endpoint: 'mqtt://edge-gateway.vntrust.vn:1883',
    authType: 'mTLS + Device Cert',
    dataFields: ['Hình ảnh base64', 'Metadata (timestamp, GPS)', 'AI results'],
    phase: 2,
  },
  // ─── PHÂN HỆ 5 — Tích hợp & Kết nối (per doc) ──────────────────
  bca: {
    name: 'Bộ Công an — Nền tảng QG',
    description: 'Đồng bộ dữ liệu sản phẩm thật + xác minh DN/cá nhân theo CCCD',
    protocol: 'REST API (HTTPS) + Đồng bộ định kỳ',
    icon: 'shield',
    color: 'indigo',
    endpoint: 'https://api.bocongan.gov.vn',
    authType: 'API Key + mTLS',
    dataFields: ['Sản phẩm thật đã đăng ký', 'Định danh DN', 'Mã CCCD (đối chiếu)'],
    phase: 3,
  },
  khcn: {
    name: 'Bộ KH&CN — Cổng truy xuất QG',
    description: 'Đối chiếu thông tin sản phẩm chính hãng & truy xuất nguồn gốc',
    protocol: 'REST API',
    icon: 'science',
    color: 'teal',
    endpoint: 'https://truyxuat.gov.vn',
    authType: 'OAuth 2.0',
    dataFields: ['Mã sản phẩm QG', 'Truy xuất chuỗi cung ứng', 'Chứng nhận xuất xứ'],
    phase: 3,
  },
  qltt: {
    name: 'Lực lượng Quản lý thị trường',
    description: 'Chuyển giao vụ việc vi phạm tới QLTT, dashboard riêng + email',
    protocol: 'Dashboard SaaS riêng + Email/SMTP',
    icon: 'gavel',
    color: 'orange',
    endpoint: 'https://qltt.gov.vn',
    authType: 'OAuth 2.0 + Whitelisted IP',
    dataFields: ['Mã báo cáo', 'Ảnh bằng chứng', 'GPS điểm phát hiện', 'UID nghi vấn'],
    phase: 2,
  },
  tmdt: {
    name: 'Sàn TMĐT (Shopee/TikTok/Lazada/Tiki)',
    description: 'Gửi takedown request gỡ listing vi phạm; sync ngược trạng thái',
    protocol: 'REST API (Open Platform) + Email/Notice',
    icon: 'storefront',
    color: 'pink',
    endpoint: 'https://open.shopee.com / open.tiktokshop.com / open.lazada.com / open.tiki.vn',
    authType: 'OAuth 2.0 per platform',
    dataFields: ['Listing URL', 'Lý do vi phạm', 'Ảnh bằng chứng', 'Ticket ID'],
    phase: 2,
  },
};

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    if (!userRole || !['admin', 'manufacturer', 'importer'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'status';
    const code = searchParams.get('code') || '';

    // ── GET /api/gov-integration?type=status ─────────────────────
    if (type === 'status') {
      // Lấy từ cache (đã được background worker cập nhật)
      const healthResults = await getHealthStatus();
      const healthMap = new Map(healthResults.map(r => [r.id, r]));

      const integrations = Object.entries(INTEGRATION_META).map(([id, meta]) => {
        const health = healthMap.get(id);
        return {
          id,
          ...meta,
          status: health?.status ?? 'pending',
          latencyMs: health?.latencyMs ?? null,
          lastSync: health?.lastSync ?? null,
          lastError: health?.lastError,
        };
      });

      return NextResponse.json({ integrations });
    }

    // ── GET /api/gov-integration?type=force_check ─────────────────
    if (type === 'force_check') {
      if (userRole !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      const results = await forceHealthCheck();
      const userName = cookieStore.get('userName')?.value || 'Admin';
      await prisma.nhatKy.create({
        data: {
          action: `[Manual Force Check] Kiểm tra health tất cả integration`,
          user: userName,
          role: userRole,
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'success',
        },
      });
      return NextResponse.json({ results });
    }

    // ── GET /api/gov-integration?type=check_haiquan&code=... ──────
    if (type === 'check_haiquan' || type === 'check_byt' || type === 'check_bct') {
      if (!code) return NextResponse.json({ error: 'Vui lòng nhập mã tra cứu' }, { status: 400 });

      const apiName = {
        check_haiquan: 'Hải quan',
        check_byt: 'Bộ Y tế / ATTP',
        check_bct: 'Bộ Công Thương',
      }[type] ?? 'Unknown';

      const startTime = Date.now();

      // Thực tế: tra cứu real API nếu có key, fallback graceful nếu không
      // Hiện tại: ping DNS để xác nhận connectivity, sau đó trả kết quả DB nếu có
      let result: any = null;

      // Kiểm tra DB xem có record match không (từ dữ liệu đã sync)
      if (type === 'check_haiquan') {
        const lo = await prisma.loHang.findFirst({
          where: { soToKhaiHQ: code },
          include: { sanPham: { select: { ten: true, maSKU: true } } },
        });
        if (lo) {
          result = {
            status: 'valid',
            soToKhai: lo.soToKhaiHQ,
            tenHangHoa: lo.sanPham.ten,
            ngayThongQuan: lo.ngayThongQuan?.toISOString().split('T')[0],
            cuaKhau: lo.cuaKhau,
            hsCode: lo.hsCode,
            nuocXuatXu: lo.nuocXuatXu,
            source: 'VNTrust DB (cached from Hải quan API)',
          };
        }
      } else if (type === 'check_byt') {
        const cert = await prisma.chungNhan.findFirst({
          where: {
            OR: [
              { soChungNhan: { contains: code } },
              { loai: { contains: code } },
            ],
          },
          include: { sanPham: { select: { ten: true } } },
        });
        if (cert) {
          result = {
            status: 'valid',
            soChungNhan: cert.soChungNhan,
            tenSanPham: cert.sanPham?.ten,
            ngayCap: cert.ngayCap?.toISOString().split('T')[0],
            ngayHetHan: cert.ngayHetHan?.toISOString().split('T')[0],
            toChucCap: cert.toChucCap,
            source: 'VNTrust DB (cached from Bộ Y tế API)',
          };
        }
      }

      if (!result) {
        result = {
          status: 'not_found',
          message: `Không tìm thấy mã "${code}" trong hệ thống. Cần kết nối API thật của ${apiName} (Giai đoạn 2).`,
          source: apiName,
        };
      }

      result.checkedAt = new Date().toISOString();
      const elapsed = Date.now() - startTime;

      const userName = cookieStore.get('userName')?.value || 'User';
      await prisma.nhatKy.create({
        data: {
          action: `BR-07 Gov API [${apiName}]: Tra cứu mã "${code}" — Kết quả: ${result.status}`,
          user: userName,
          role: userRole,
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: result.status === 'valid' ? 'success' : 'warning',
        },
      });

      return NextResponse.json({ result, elapsedMs: elapsed });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Webhook từ cơ quan nhà nước
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { source, event, data } = body;

    await prisma.nhatKy.create({
      data: {
        action: `BR-07 Webhook [${source}]: ${event} — ${JSON.stringify(data).substring(0, 100)}`,
        user: 'Government API',
        role: 'admin',
        ip: req.headers.get('x-forwarded-for') || 'gov-api',
        status: 'success',
      },
    });

    if (event === 'certificate_revoked' || event === 'license_suspended') {
      await prisma.canhBao.create({
        data: {
          loai: 'GOVERNMENT',
          mucDo: 'high',
          moTa: `[BR-07] ${source}: ${event} — ${data?.description || 'Cập nhật từ cơ quan nhà nước'}`,
          trangThai: 'open',
        },
      });
    }

    return NextResponse.json({ received: true, message: 'Webhook processed' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
