import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const ALLOWED_EVENTS = [
  'batch.suspend', 'batch.recall', 'batch.ready',
  'cert.expire', 'cert.expiring_soon',
  'haukiem.violation', 'alert.escalated', '*',
];

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const dnId = cookieStore.get('doanhNghiepId')?.value;
  if (!dnId) return NextResponse.json({ error: 'no_doanhnghiep' }, { status: 401 });

  const configs = await prisma.webhookErp.findMany({
    where: role === 'admin' ? {} : { doanhNghiepId: dnId },
    orderBy: { ngayTao: 'desc' },
  });
  // Mask secrets
  const safe = configs.map(c => ({ ...c, secret: c.secret.substring(0, 4) + '***' + c.secret.substring(c.secret.length - 4) }));
  return NextResponse.json({ webhooks: safe });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const dnId = cookieStore.get('doanhNghiepId')?.value;
  if (!dnId) return NextResponse.json({ error: 'no_doanhnghiep' }, { status: 401 });
  if (!['admin', 'manufacturer', 'importer'].includes(role || '')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { endpointUrl, secret, events, retryMax } = body;
  if (!endpointUrl || !secret || !events) {
    return NextResponse.json({ error: 'missing_fields', required: ['endpointUrl', 'secret', 'events'] }, { status: 400 });
  }
  try { new URL(endpointUrl); } catch { return NextResponse.json({ error: 'invalid_url' }, { status: 400 }); }

  const eventsArr = (events as string).split(',').map(e => e.trim());
  for (const e of eventsArr) {
    if (!ALLOWED_EVENTS.includes(e)) return NextResponse.json({ error: 'invalid_event', allowed: ALLOWED_EVENTS, got: e }, { status: 400 });
  }

  const created = await prisma.webhookErp.create({
    data: {
      doanhNghiepId: dnId,
      endpointUrl,
      secret,
      events: eventsArr.join(','),
      retryMax: typeof retryMax === 'number' && retryMax > 0 && retryMax <= 10 ? retryMax : 3,
    },
  });
  return NextResponse.json({ success: true, id: created.id });
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const role = cookieStore.get('userRole')?.value;
  const dnId = cookieStore.get('doanhNghiepId')?.value;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const existing = await prisma.webhookErp.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (role !== 'admin' && existing.doanhNghiepId !== dnId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  await prisma.webhookErp.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
