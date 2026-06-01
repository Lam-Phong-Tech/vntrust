// UC14: Cấu hình hệ thống — admin điều chỉnh ngưỡng cảnh báo, retention, ...
// Key-value store, namespace để gom nhóm.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// Default values (theo doc §IV.UC14)
const DEFAULTS = {
  alert: {
    scan_threshold_per_day:    { value: '3',   moTa: 'Số lần quét/ngày/UID trước khi cảnh báo Vàng' },
    scan_threshold_fake:       { value: '10',  moTa: 'Số lần quét trước khi cảnh báo Đỏ tự động' },
    geo_distance_km:           { value: '500', moTa: 'Khoảng cách tối đa so với vùng phân phối khai báo (km)' },
    consumer_report_threshold: { value: '3',   moTa: 'Số báo cáo người dùng để kích hoạt cảnh báo Cao' },
    cert_expiry_warning_days:  { value: '[30,15,7]', moTa: 'Số ngày trước hết hạn để cảnh báo (mức 1,2,3)' },
  },
  notification: {
    email_enabled:  { value: 'false', moTa: 'Bật/tắt gửi email cảnh báo định kỳ' },
    sms_enabled:    { value: 'false', moTa: 'Bật/tắt gửi SMS khẩn cấp' },
    daily_digest_hour: { value: '8',  moTa: 'Giờ gửi email digest hàng ngày (0-23)' },
  },
  retention: {
    audit_log_days:    { value: '365', moTa: 'Số ngày giữ NhatKy' },
    scan_log_days:     { value: '730', moTa: 'Số ngày giữ LuotQuet' },
    closed_alert_days: { value: '180', moTa: 'Số ngày giữ cảnh báo đã đóng' },
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const namespace = searchParams.get('namespace');
    const key = searchParams.get('key');

    if (key) {
      const c = await prisma.cauHinhHeThong.findUnique({ where: { key } });
      if (!c) {
        // Tra trong defaults
        for (const ns of Object.values(DEFAULTS) as any[]) {
          if (ns[key]) return NextResponse.json({ key, value: ns[key].value, moTa: ns[key].moTa, source: 'default' });
        }
        return NextResponse.json({ error: 'config_not_found' }, { status: 404 });
      }
      return NextResponse.json({ ...c, source: 'db' });
    }

    const where = namespace ? { namespace } : {};
    const dbConfigs = await prisma.cauHinhHeThong.findMany({ where, orderBy: [{ namespace: 'asc' }, { key: 'asc' }] });
    const dbKeys = new Set(dbConfigs.map(c => c.key));

    // Compose defaults + db (db overrides)
    const result: any = {};
    for (const [ns, items] of Object.entries(DEFAULTS)) {
      if (namespace && namespace !== ns) continue;
      result[ns] = result[ns] || {};
      for (const [k, def] of Object.entries(items as Record<string, any>)) {
        if (dbKeys.has(k)) {
          const dbVal = dbConfigs.find(c => c.key === k)!;
          result[ns][k] = { value: dbVal.value, moTa: dbVal.moTa || def.moTa, source: 'db', ngayCapNhat: dbVal.ngayCapNhat, capNhatBoi: dbVal.capNhatBoi };
        } else {
          result[ns][k] = { ...def, source: 'default' };
        }
      }
    }

    // Custom keys (in DB nhưng không có trong defaults)
    for (const c of dbConfigs) {
      const ns = c.namespace;
      result[ns] = result[ns] || {};
      if (!result[ns][c.key]) {
        result[ns][c.key] = { value: c.value, moTa: c.moTa, source: 'db', ngayCapNhat: c.ngayCapNhat };
      }
    }

    return NextResponse.json({ config: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    const userName = cookieStore.get('userName')?.value || 'admin';
    if (role !== 'admin') return NextResponse.json({ error: 'Chỉ admin được sửa cấu hình' }, { status: 403 });

    const body = await req.json();
    const { key, value, namespace, moTa } = body;
    if (!key || value === undefined) return NextResponse.json({ error: 'missing_key_or_value' }, { status: 400 });

    const ns = namespace || (() => {
      for (const [nsName, items] of Object.entries(DEFAULTS)) if ((items as any)[key]) return nsName;
      return 'misc';
    })();

    const upserted = await prisma.cauHinhHeThong.upsert({
      where: { key },
      create: { key, value: String(value), namespace: ns, moTa: moTa || null, capNhatBoi: userName },
      update: { value: String(value), namespace: ns, moTa: moTa !== undefined ? moTa : undefined, capNhatBoi: userName },
    });

    await prisma.nhatKy.create({
      data: {
        action: `[CONFIG] Cập nhật ${ns}.${key} = ${value}`,
        user: userName, role: 'admin',
        ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        status: 'success',
      },
    });

    return NextResponse.json({ success: true, config: upserted });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
