// Phase 3 — Admin API: batch geocode tất cả DN có diaChi mà chưa có lat/lng
// GET  : Trả về stats (đã geocode bao nhiêu, còn lại bao nhiêu)
// POST : Trigger batch geocode (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { geocodeBatch } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const c = await cookies();
  const r = c.get('userRole')?.value;
  if (r !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const [total, hasCoords, hasAddrNoCoords, noAddr] = await Promise.all([
    prisma.doanhNghiep.count(),
    prisma.doanhNghiep.count({ where: { AND: [{ lat: { not: null } as any }, { lng: { not: null } as any }] } as any }),
    prisma.doanhNghiep.count({ where: { AND: [
      { diaChi: { not: null } },
      { OR: [{ lat: null } as any, { lng: null } as any] } as any,
    ] } as any }),
    prisma.doanhNghiep.count({ where: { diaChi: null } as any }),
  ]);

  return NextResponse.json({
    total,
    hasCoords,                  // Đã geocode
    needsGeocoding: hasAddrNoCoords,  // Có address nhưng chưa geocode
    noAddress: noAddr,          // Không có address (không thể geocode)
    coverage: total > 0 ? Math.round((hasCoords / total) * 100) : 0,
  });
}

export async function POST(req: NextRequest) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(parseInt(body.limit) || 50, 1), 500);
  const delayMs = Math.min(Math.max(parseInt(body.delayMs) || 600, 200), 5000);

  // Lấy danh sách DN cần geocode (có diaChi + chưa có lat/lng)
  const targets = await prisma.doanhNghiep.findMany({
    where: {
      AND: [
        { diaChi: { not: null } },
        { OR: [{ lat: null } as any, { lng: null } as any] } as any,
      ],
    } as any,
    select: { id: true, ten: true, diaChi: true },
    take: limit,
  });

  if (targets.length === 0) {
    return NextResponse.json({
      ok: true,
      message: 'Không còn DN nào cần geocode',
      processed: 0,
    });
  }

  // Geocode tuần tự
  const startTime = Date.now();
  const results = await geocodeBatch(
    targets.map(t => ({ id: t.id, address: t.diaChi! })),
    delayMs,
  );

  // Update DB cho các DN geocode thành công
  let succeeded = 0;
  let failed = 0;
  const failedList: Array<{ id: string; ten: string; address: string }> = [];

  for (let i = 0; i < results.length; i++) {
    const { id, result } = results[i];
    if (result) {
      await prisma.doanhNghiep.update({
        where: { id },
        data: { lat: result.lat, lng: result.lng } as any,
      });
      succeeded++;
    } else {
      failed++;
      failedList.push({ id, ten: targets[i].ten, address: targets[i].diaChi! });
    }
  }

  // Audit log
  await prisma.nhatKy.create({
    data: {
      action: `[GEOCODE BATCH] Processed ${results.length} DN · ${succeeded} OK · ${failed} failed`,
      user: 'Admin', role: 'admin',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: failed > 0 ? 'warning' : 'success',
    },
  });

  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded,
    failed,
    failedList: failedList.slice(0, 20),  // Cap để response không quá lớn
    durationMs: Date.now() - startTime,
  });
}
