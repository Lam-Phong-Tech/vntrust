// §V.4 Sprint 9 — API cấu hình linh hoạt vòng đời cho doanh nghiệp
// GET /api/lifecycle-config              → trả config của DN hiện tại + defaults
// PATCH /api/lifecycle-config            → cập nhật (admin hoặc DN tự cập nhật)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLifecycleConfig, setLifecycleConfig, DEFAULT_LIFECYCLE_CONFIG } from '@/lib/lifecycleConfig';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value;
  const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

  if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin có thể query DN bất kỳ qua ?doanhNghiepId=...
  const { searchParams } = new URL(req.url);
  const targetDnId = userRole === 'admin'
    ? (searchParams.get('doanhNghiepId') || doanhNghiepId)
    : doanhNghiepId;

  if (!targetDnId) {
    return NextResponse.json({
      config: DEFAULT_LIFECYCLE_CONFIG,
      isDefault: true,
      doanhNghiepId: null,
      note: 'Bạn chưa thuộc DN nào — hiển thị config mặc định',
    });
  }

  const config = await getLifecycleConfig(targetDnId);
  return NextResponse.json({
    config,
    isDefault: JSON.stringify(config) === JSON.stringify(DEFAULT_LIFECYCLE_CONFIG),
    doanhNghiepId: targetDnId,
    defaults: DEFAULT_LIFECYCLE_CONFIG,
    ranges: {
      expWarnDays:   { min: 1,  max: 365 },
      certWarnDays:  { min: 30, max: 365 },
    },
  });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value;
  const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

  if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'manufacturer', 'importer'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const targetDnId = userRole === 'admin' && body.doanhNghiepId ? body.doanhNghiepId : doanhNghiepId;
  if (!targetDnId) return NextResponse.json({ error: 'Thiếu doanhNghiepId' }, { status: 400 });

  try {
    const updated = await setLifecycleConfig(targetDnId, body.config || body);
    return NextResponse.json({ ok: true, config: updated, doanhNghiepId: targetDnId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
