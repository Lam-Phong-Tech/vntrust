// Sprint 13 — Shopee integration API
// Endpoints:
//   GET  /api/shopee?action=parse&url={shopee_url}      → parse listing ref
//   GET  /api/shopee?action=lookup&url={shopee_url}     → fetch item info (real or mock)
//   POST /api/shopee  (action: takedown)                → file takedown request
//   GET  /api/shopee?action=status                      → check integration mode
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  parseListingUrl,
  lookupItem,
  sendTakedown,
  getModeInfo,
  IS_REAL_MODE,
} from '@/lib/shopeeIntegration';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value;
  if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'status';

  if (action === 'status') {
    return NextResponse.json({ mode: getModeInfo() });
  }

  if (action === 'parse') {
    const url = searchParams.get('url') || '';
    return NextResponse.json({ ref: parseListingUrl(url) });
  }

  if (action === 'lookup') {
    const url = searchParams.get('url') || '';
    const ref = parseListingUrl(url);
    if (!ref.valid) {
      return NextResponse.json({ error: 'URL Shopee không hợp lệ', ref }, { status: 400 });
    }
    const info = await lookupItem(ref);
    if (!info) {
      return NextResponse.json({ error: 'Không lookup được item từ Shopee', ref }, { status: 502 });
    }
    return NextResponse.json({ ref, item: info, mode: IS_REAL_MODE ? 'real' : 'mock' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value;
  const dnId = cookieStore.get('doanhNghiepId')?.value;
  if (!userRole || !['admin', 'manufacturer', 'importer'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  if (body.action !== 'takedown') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { url, reason, evidenceUrls = [], description = '' } = body;
  const ref = parseListingUrl(url || '');
  if (!ref.valid) {
    return NextResponse.json({ error: 'URL Shopee không hợp lệ' }, { status: 400 });
  }

  const ALLOWED = ['counterfeit', 'misleading_ads', 'expired', 'unauthorized_seller', 'other'];
  const safeReason = ALLOWED.includes(reason) ? reason : 'other';

  const result = await sendTakedown({
    itemId: ref.itemId!,
    shopId: ref.shopId!,
    reason: safeReason as any,
    evidenceUrls,
    description,
    reporterDoanhNghiepId: dnId,
  });

  // Audit log
  await prisma.nhatKy.create({
    data: {
      action: `[SHOPEE TAKEDOWN] item=${ref.itemId} shop=${ref.shopId} reason=${safeReason} → ${result.ticketId}`,
      user: cookieStore.get('userName')?.value || userRole,
      role: userRole,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      status: result.ok ? 'success' : 'error',
    },
  });

  // Tạo CanhBao mức cao cho admin theo dõi
  if (result.ok) {
    await prisma.canhBao.create({
      data: {
        loai: 'TMDT_TAKEDOWN',
        mucDo: 'high',
        moTa: JSON.stringify({
          platform: 'shopee', itemId: ref.itemId, shopId: ref.shopId,
          reason: safeReason, description, evidenceUrls,
          ticketId: result.ticketId, source: result.source,
          listingUrl: url,
        }),
        trangThai: result.status === 'submitted' ? 'reviewing' : 'open',
      },
    });
  }

  return NextResponse.json(result);
}
