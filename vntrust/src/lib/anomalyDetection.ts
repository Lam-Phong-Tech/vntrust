// §IV.5 / PHÂN HỆ 4.1 — Sprint 10
// Phát hiện bất thường Big Data theo Tài liệu nghiệp vụ
//
// 5 loại bất thường:
//   1. Cùng UID quét quá nhiều lần (>3/day, >10/week)            — time-series counting
//   2. SP xuất hiện vị trí địa lý bất thường                       — geospatial clustering
//   3. Tần suất báo cáo tăng đột biến theo batch                   — change point / Z-score
//   4. Similarity score thấp bất thường (AI vision)                — SPC (>3 sigma)
//   5. Hành vi báo cáo bất thường (spam)                           — Isolation Forest / DBSCAN approximation

import { prisma } from '@/lib/prisma';

// ─── 1. UID over-scan detection ──────────────────────────────────
export async function detectUIDOverScan(uid: string): Promise<{
  abnormal: boolean;
  scansToday: number;
  scansThisWeek: number;
  reason?: string;
}> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const [todayCount, weekCount] = await Promise.all([
    prisma.luotQuet.count({
      where: { uid, thoiGian: { gte: dayAgo } },
    }),
    prisma.luotQuet.count({
      where: { uid, thoiGian: { gte: weekAgo } },
    }),
  ]);

  // Doc thresholds: >3/day OR >10/week
  if (todayCount > 3) {
    return { abnormal: true, scansToday: todayCount, scansThisWeek: weekCount, reason: `Quét ${todayCount} lần trong 24h (ngưỡng >3)` };
  }
  if (weekCount > 10) {
    return { abnormal: true, scansToday: todayCount, scansThisWeek: weekCount, reason: `Quét ${weekCount} lần trong 7 ngày (ngưỡng >10)` };
  }
  return { abnormal: false, scansToday: todayCount, scansThisWeek: weekCount };
}

// ─── 2. Geospatial anomaly: scan ngoài vùng phân phối ────────────
// Haversine distance trong km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Detect: GPS scan xa khỏi median lat/lon của các lần quét trước
export async function detectGeoAnomaly(uid: string, newLat: number, newLng: number): Promise<{
  abnormal: boolean;
  distanceKm: number;
  reason?: string;
}> {
  // Lấy 50 scan gần nhất có GPS
  const scans = await prisma.luotQuet.findMany({
    where: {
      uid,
      lat: { not: null },
      lng: { not: null },
    },
    select: { lat: true, lng: true },
    orderBy: { thoiGian: 'desc' },
    take: 50,
  });

  if (scans.length < 3) {
    return { abnormal: false, distanceKm: 0 }; // chưa đủ dữ liệu
  }

  // Compute median lat/lon (robust against outliers)
  const lats = scans.map(s => s.lat!).sort((a, b) => a - b);
  const lngs = scans.map(s => s.lng!).sort((a, b) => a - b);
  const medLat = lats[Math.floor(lats.length / 2)];
  const medLng = lngs[Math.floor(lngs.length / 2)];

  const distance = haversine(medLat, medLng, newLat, newLng);

  // Threshold: >500km được coi là bất thường (ngoài vùng phân phối)
  if (distance > 500) {
    return {
      abnormal: true,
      distanceKm: Math.round(distance),
      reason: `Quét tại vị trí xa ${Math.round(distance)}km so với vùng phân phối chính thức`,
    };
  }
  return { abnormal: false, distanceKm: Math.round(distance) };
}

// ─── 3. Batch report spike detection (Change point / Z-score) ─────
export async function detectBatchSpike(loHangId: string): Promise<{
  abnormal: boolean;
  zScore: number;
  todayReports: number;
  baseline7dAvg: number;
  reason?: string;
}> {
  const now = new Date();
  const today = new Date(now.getTime() - 24 * 3600 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // Count reports for this batch in last 24h
  const todayReports = await prisma.canhBao.count({
    where: {
      uid: { contains: loHangId.substring(0, 8) }, // approximate match
      loai: 'NGUOI_DUNG_BAO_CAO',
      thoiGian: { gte: today },
    },
  });

  // Daily counts in previous 7 days (baseline)
  const dailyCounts: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const start = new Date(now.getTime() - (i + 1) * 24 * 3600 * 1000);
    const end = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const c = await prisma.canhBao.count({
      where: {
        uid: { contains: loHangId.substring(0, 8) },
        loai: 'NGUOI_DUNG_BAO_CAO',
        thoiGian: { gte: start, lte: end },
      },
    });
    dailyCounts.push(c);
  }

  const avg = dailyCounts.reduce((s, x) => s + x, 0) / dailyCounts.length;
  const variance = dailyCounts.reduce((s, x) => s + (x - avg) ** 2, 0) / dailyCounts.length;
  const stdDev = Math.sqrt(variance) || 1; // avoid div by 0
  const zScore = (todayReports - avg) / stdDev;

  if (zScore > 3 && todayReports >= 3) {
    return {
      abnormal: true,
      zScore: Math.round(zScore * 10) / 10,
      todayReports,
      baseline7dAvg: Math.round(avg * 10) / 10,
      reason: `Tăng đột biến: ${todayReports} báo cáo hôm nay vs trung bình ${avg.toFixed(1)}/ngày (Z=${zScore.toFixed(1)})`,
    };
  }
  return { abnormal: false, zScore: Math.round(zScore * 10) / 10, todayReports, baseline7dAvg: Math.round(avg * 10) / 10 };
}

// ─── 4. Similarity score outlier (SPC — Statistical Process Control) ──
// Lấy similarity scores từ luotQuet metadata (chưa có field rõ — placeholder)
// Khi có AI vision real, sẽ check score < mean - 3*stdDev
export function detectSimilarityOutlier(score: number, recentScores: number[]): {
  abnormal: boolean;
  reason?: string;
} {
  if (recentScores.length < 10) return { abnormal: false };
  const mean = recentScores.reduce((s, x) => s + x, 0) / recentScores.length;
  const stdDev = Math.sqrt(recentScores.reduce((s, x) => s + (x - mean) ** 2, 0) / recentScores.length);
  const threshold = Math.max(0.7, mean - 3 * stdDev);
  if (score < threshold) {
    return {
      abnormal: true,
      reason: `Similarity score ${score.toFixed(2)} dưới ngưỡng SPC ${threshold.toFixed(2)} (mean=${mean.toFixed(2)}, σ=${stdDev.toFixed(2)})`,
    };
  }
  return { abnormal: false };
}

// ─── 5. Spam behavior (Isolation Forest approximation via clustering) ──
// Simple version: detect multiple reports from same IP in short timeframe
export async function detectSpamBehavior(ipHash: string, withinMinutes = 60): Promise<{
  abnormal: boolean;
  count: number;
  reason?: string;
}> {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
  // Reports trong vòng X phút từ cùng IP (proxy: same 8-char IP prefix)
  const count = await prisma.canhBao.count({
    where: {
      loai: 'NGUOI_DUNG_BAO_CAO',
      thoiGian: { gte: cutoff },
      // moTa contains ipHash (since IP stored in metadata JSON)
      moTa: { contains: ipHash },
    },
  });

  if (count >= 5) {
    return {
      abnormal: true,
      count,
      reason: `Spam suspect: ${count} báo cáo từ cùng IP trong ${withinMinutes} phút`,
    };
  }
  return { abnormal: false, count };
}

// ─── Helper: create AI_PHAT_HIEN canhBao if anomaly detected ────
export async function createAnomalyAlert(
  uid: string | null,
  loai: 'UID_OVERSCAN' | 'GEO_ANOMALY' | 'BATCH_SPIKE' | 'SIMILARITY_OUTLIER' | 'SPAM_BEHAVIOR',
  mucDo: 'low' | 'medium' | 'high',
  moTa: string,
) {
  // Avoid duplicate (same uid + loai + open) within 24h
  const recent = await prisma.canhBao.findFirst({
    where: {
      uid: uid || undefined,
      loai: 'AI_PHAT_HIEN',
      trangThai: 'open',
      thoiGian: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
      moTa: { contains: loai },
    },
  });
  if (recent) return null;
  return prisma.canhBao.create({
    data: {
      uid: uid || null,
      loai: 'AI_PHAT_HIEN',
      mucDo,
      moTa: `[${loai}] ${moTa}`,
      trangThai: 'open',
    },
  });
}
