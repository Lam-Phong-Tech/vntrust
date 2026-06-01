// §IV.5 / PH4.1 Sprint 10 — Cron anomaly detection
// Chạy định kỳ (mỗi 30 phút) để phát hiện 5 loại bất thường:
//   1. UID quét quá nhiều (>3/day or >10/week)
//   2. Geospatial anomaly (>500km xa median)
//   3. Batch report spike (Z-score > 3)
//   4. Similarity outlier (SPC) — placeholder cho AI vision real
//   5. Spam behavior (>5 reports/IP/hour)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  detectUIDOverScan,
  detectGeoAnomaly,
  detectBatchSpike,
  detectSpamBehavior,
  createAnomalyAlert,
} from '@/lib/anomalyDetection';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET || 'vntrust-cron-key';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = {
      uidOverScan: 0,
      geoAnomaly: 0,
      batchSpike: 0,
      spamBehavior: 0,
      similarityOutlier: 0,
    };

    // ── 1. UID over-scan ────────────────────────────────────────
    // Lấy top 100 UID quét nhiều nhất trong 24h
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const recentScans = await prisma.luotQuet.groupBy({
      by: ['uid'],
      where: { thoiGian: { gte: dayAgo } },
      _count: true,
      orderBy: { _count: { uid: 'desc' } },
      take: 100,
    });

    for (const s of recentScans) {
      if (!s.uid || s._count < 3) continue;
      const r = await detectUIDOverScan(s.uid);
      if (r.abnormal) {
        const alert = await createAnomalyAlert(
          s.uid,
          'UID_OVERSCAN',
          r.scansToday > 10 ? 'high' : 'medium',
          r.reason!,
        );
        if (alert) summary.uidOverScan++;
      }
    }

    // ── 2. Geospatial anomaly ──────────────────────────────────
    // Check scans gần đây có GPS
    const geoScans = await prisma.luotQuet.findMany({
      where: {
        thoiGian: { gte: dayAgo },
        lat: { not: null },
        lng: { not: null },
      },
      select: { uid: true, lat: true, lng: true },
      orderBy: { thoiGian: 'desc' },
      take: 200,
    });

    const checkedUids = new Set<string>();
    for (const sc of geoScans) {
      if (!sc.uid || checkedUids.has(sc.uid)) continue;
      checkedUids.add(sc.uid);
      const r = await detectGeoAnomaly(sc.uid, sc.lat!, sc.lng!);
      if (r.abnormal) {
        const alert = await createAnomalyAlert(
          sc.uid,
          'GEO_ANOMALY',
          r.distanceKm > 1000 ? 'high' : 'medium',
          r.reason!,
        );
        if (alert) summary.geoAnomaly++;
      }
    }

    // ── 3. Batch spike (Z-score > 3) ───────────────────────────
    // Lấy batches có hoạt động báo cáo trong 24h
    // Note: CanhBao không có FK trực tiếp đến LoHang — match qua uid prefix
    const batchesWithReports = await prisma.loHang.findMany({
      select: { id: true, maLo: true },
      take: 50,
    }).catch(() => [] as { id: string; maLo: string }[]);

    for (const lo of batchesWithReports) {
      const r = await detectBatchSpike(lo.id);
      if (r.abnormal) {
        const alert = await createAnomalyAlert(
          `LO-${lo.id}`,
          'BATCH_SPIKE',
          r.zScore > 5 ? 'high' : 'medium',
          r.reason!,
        );
        if (alert) summary.batchSpike++;
      }
    }

    // ── 5. Spam behavior: group by IP hash from recent reports ──
    const recentReports = await prisma.canhBao.findMany({
      where: {
        loai: 'NGUOI_DUNG_BAO_CAO',
        thoiGian: { gte: new Date(Date.now() - 3600 * 1000) }, // last hour
      },
      select: { moTa: true },
      take: 200,
    });

    // Extract IP hashes from moTa JSON (best-effort)
    const ipHashes = new Set<string>();
    for (const r of recentReports) {
      try {
        if (r.moTa.startsWith('{')) {
          const parsed = JSON.parse(r.moTa);
          if (parsed.ipHash) ipHashes.add(parsed.ipHash);
        }
      } catch {}
    }
    for (const ipHash of ipHashes) {
      const r = await detectSpamBehavior(ipHash, 60);
      if (r.abnormal) {
        const alert = await createAnomalyAlert(
          null,
          'SPAM_BEHAVIOR',
          r.count > 10 ? 'high' : 'medium',
          r.reason!,
        );
        if (alert) summary.spamBehavior++;
      }
    }

    // Audit log
    await prisma.nhatKy.create({
      data: {
        action: `[CRON] anomaly-detection: ${JSON.stringify(summary)}`,
        user: 'System',
        role: 'system',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        status: 'success',
      },
    });

    return NextResponse.json({
      ok: true,
      summary,
      totalAlertsCreated: Object.values(summary).reduce((s, n) => s + n, 0),
      ranAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
