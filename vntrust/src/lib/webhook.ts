// Outbound webhook helper — gọi ERP của DN khi sự kiện thay đổi state
// Phase 8 (B2). Có HMAC signing + retry max 3, không block main thread (fire-and-forget).

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export type WebhookEvent =
  | 'batch.suspend'
  | 'batch.recall'
  | 'batch.ready'
  | 'cert.expire'
  | 'cert.expiring_soon'
  | 'haukiem.violation'
  | 'alert.escalated';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;       // ISO8601
  doanhNghiepId: string;
  data: Record<string, any>;
}

function signPayload(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export async function triggerWebhook(event: WebhookEvent, doanhNghiepId: string, data: Record<string, any>): Promise<void> {
  // Tìm webhook config active cho DN này + event matched
  const configs = await prisma.webhookErp.findMany({
    where: { doanhNghiepId, trangThai: 'active' },
  });

  for (const config of configs) {
    const allowedEvents = config.events.split(',').map(e => e.trim());
    if (!allowedEvents.includes(event) && !allowedEvents.includes('*')) continue;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      doanhNghiepId,
      data,
    };
    const body = JSON.stringify(payload);
    const signature = signPayload(config.secret, body);

    // Fire-and-forget với retry — không await để không block caller
    (async () => {
      let attempt = 0;
      let lastStatus = 0;
      while (attempt < config.retryMax) {
        try {
          const res = await fetch(config.endpointUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-vntrust-signature': signature,
              'x-vntrust-event': event,
              'x-vntrust-timestamp': payload.timestamp,
            },
            body,
            signal: AbortSignal.timeout(8000),
          });
          lastStatus = res.status;
          if (res.ok) break;
        } catch (e) {
          lastStatus = 0;
        }
        attempt++;
        if (attempt < config.retryMax) await new Promise(r => setTimeout(r, 1000 * attempt));
      }
      await prisma.webhookErp.update({
        where: { id: config.id },
        data: { lastTriggered: new Date(), lastStatus },
      });
      await prisma.nhatKy.create({
        data: {
          action: `Webhook ERP ${event} → DN ${doanhNghiepId.substring(0, 8)}, status=${lastStatus}, attempts=${attempt + 1}`,
          user: 'Webhook System', role: 'system', ip: '127.0.0.1',
          status: lastStatus >= 200 && lastStatus < 300 ? 'success' : 'error',
        },
      }).catch(() => {});
    })().catch(() => {});
  }
}
