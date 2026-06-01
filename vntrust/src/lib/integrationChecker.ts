/**
 * Integration Health Checker — Chạy ngầm, không cần UI
 * Mỗi 5 phút ping tất cả integration endpoints thật
 * Kết quả lưu vào DB (NhatKy) + cache trong memory
 */

import { prisma } from '@/lib/prisma';
import * as net from 'net';
import * as dns from 'dns/promises';

export interface HealthResult {
  id: string;
  status: 'active' | 'configured' | 'error' | 'pending';
  latencyMs: number | null;
  lastSync: string;
  lastError?: string;
}

// In-memory cache — shared across requests trong cùng 1 process
const healthCache = new Map<string, HealthResult>();
let checkerStarted = false;
let lastFullCheck = 0;

// ─── Ping helpers ───────────────────────────────────────────────

/** Ping HTTP endpoint, trả về latency ms hoặc null nếu lỗi */
async function pingHttp(url: string, timeoutMs = 5000): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'VNTrust-HealthCheck/1.0' },
    }).catch(() => fetch(url, { method: 'GET', signal: ctrl.signal }));
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    return { ok: res.status < 500, latencyMs };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, error: e.message };
  }
}

/** Ping SMTP port (TCP connect) */
async function pingSmtp(host: string, port: number, timeoutMs = 5000): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  return new Promise(resolve => {
    const sock = new net.Socket();
    const timer = setTimeout(() => {
      sock.destroy();
      resolve({ ok: false, latencyMs: Date.now() - start, error: 'timeout' });
    }, timeoutMs);
    sock.connect(port, host, () => {
      clearTimeout(timer);
      sock.destroy();
      resolve({ ok: true, latencyMs: Date.now() - start });
    });
    sock.on('error', (e) => {
      clearTimeout(timer);
      resolve({ ok: false, latencyMs: Date.now() - start, error: e.message });
    });
  });
}

/** DNS resolve check */
async function pingDns(hostname: string): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await dns.lookup(hostname);
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

// ─── Check từng integration ──────────────────────────────────────

async function checkEmail(): Promise<HealthResult> {
  // Ping smtp.gmail.com:587 thật
  const { ok, latencyMs, error } = await pingSmtp('smtp.gmail.com', 587);
  return {
    id: 'email',
    status: ok ? 'active' : 'error',
    latencyMs: ok ? latencyMs : null,
    lastSync: new Date().toISOString(),
    lastError: error,
  };
}

async function checkMaps(): Promise<HealthResult> {
  // Ping Google Maps API endpoint thật (không cần key để check connectivity)
  const { ok, latencyMs, error } = await pingHttp('https://maps.googleapis.com/maps/api/geocode/json?address=Hanoi&key=CHECK');
  // Status 200 = server responding (key invalid nhưng server OK)
  return {
    id: 'maps',
    status: ok ? 'active' : 'error',
    latencyMs: ok ? latencyMs : null,
    lastSync: new Date().toISOString(),
    lastError: error,
  };
}

async function checkHaiquan(): Promise<HealthResult> {
  // Thử resolve DNS của hải quan
  const dns1 = await pingDns('customs.gov.vn');
  // Thử ping portal hải quan công khai
  const http = await pingHttp('https://customs.gov.vn', 6000);
  const ok = dns1.ok;
  return {
    id: 'haiquan',
    status: ok ? 'configured' : 'error',
    latencyMs: ok ? (dns1.latencyMs + (http.ok ? http.latencyMs : 0)) : null,
    lastSync: new Date().toISOString(),
    lastError: ok ? undefined : 'DNS resolve failed',
  };
}

async function checkBoYTe(): Promise<HealthResult> {
  const dns1 = await pingDns('moh.gov.vn');
  const http = await pingHttp('https://moh.gov.vn', 6000);
  const ok = dns1.ok;
  return {
    id: 'byt',
    status: ok ? 'configured' : 'error',
    latencyMs: ok ? dns1.latencyMs + (http.ok ? http.latencyMs : 0) : null,
    lastSync: new Date().toISOString(),
    lastError: ok ? undefined : 'DNS resolve failed',
  };
}

async function checkBoCongThuong(): Promise<HealthResult> {
  const dns1 = await pingDns('moit.gov.vn');
  return {
    id: 'bct',
    status: dns1.ok ? 'configured' : 'pending',
    latencyMs: dns1.ok ? dns1.latencyMs : null,
    lastSync: new Date().toISOString(),
  };
}

async function checkCameraAI(): Promise<HealthResult> {
  // MQTT broker check — chưa có thiết bị thật
  return {
    id: 'camera_ai',
    status: 'pending',
    latencyMs: null,
    lastSync: new Date().toISOString(),
    lastError: 'Chờ kết nối thiết bị Edge Gateway',
  };
}

// ─── Full health check ───────────────────────────────────────────

async function runFullHealthCheck() {
  console.log('[VNTrust] Running integration health check...');
  const now = Date.now();

  const checks = await Promise.allSettled([
    checkEmail(),
    checkMaps(),
    checkHaiquan(),
    checkBoYTe(),
    checkBoCongThuong(),
    checkCameraAI(),
  ]);

  const results: HealthResult[] = [];
  for (const r of checks) {
    if (r.status === 'fulfilled') {
      healthCache.set(r.value.id, r.value);
      results.push(r.value);
    }
  }

  // Lưu vào NhatKy
  const summary = results.map(r => `${r.id}:${r.status}(${r.latencyMs ?? '-'}ms)`).join(', ');
  try {
    await prisma.nhatKy.create({
      data: {
        action: `[Integration Health Check] ${summary}`,
        user: 'system',
        role: 'admin',
        ip: '127.0.0.1',
        status: results.every(r => r.status !== 'error') ? 'success' : 'warning',
      },
    });
  } catch {
    // DB log không block health check
  }

  lastFullCheck = now;
  console.log('[VNTrust] Health check done:', summary);
  return results;
}

// ─── Background Scheduler ─────────────────────────────────────────

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

export function startIntegrationHealthChecker() {
  if (checkerStarted) return;
  checkerStarted = true;

  // Chạy ngay lần đầu
  runFullHealthCheck().catch(console.error);

  // Lặp mỗi 5 phút
  setInterval(() => {
    runFullHealthCheck().catch(console.error);
  }, CHECK_INTERVAL_MS);

  console.log('[VNTrust] Integration health checker started (every 5 min)');
}

// ─── Public API ───────────────────────────────────────────────────

/** Lấy cache hiện tại. Nếu cache trống, chạy check ngay */
export async function getHealthStatus(): Promise<HealthResult[]> {
  if (healthCache.size === 0 || Date.now() - lastFullCheck > CHECK_INTERVAL_MS) {
    await runFullHealthCheck();
  }
  return Array.from(healthCache.values());
}

/** Force check ngay lập tức */
export async function forceHealthCheck(): Promise<HealthResult[]> {
  return runFullHealthCheck();
}
