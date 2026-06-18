// POST /api/webhook/test — gửi webhook test tới ERP config
// GET /api/webhook — list configs của DN
// POST /api/webhook — DN tạo config mới (manufacturer/importer)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { triggerWebhook } from '@/lib/webhook';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('userRole')?.value;
    const dnId = cookieStore.get('doanhNghiepId')?.value;
    if (!dnId) return NextResponse.json({ error: 'no_doanhnghiep' }, { status: 401 });
    if (!['admin', 'manufacturer', 'importer'].includes(role || '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const event = body.event || 'batch.suspend';

    await triggerWebhook(event, dnId, {
      test: true,
      message: 'Test webhook từ AI VeriGoods',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Webhook test đã được gửi (fire-and-forget). Check ERP và /dashboard/logs sau vài giây.', event });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
