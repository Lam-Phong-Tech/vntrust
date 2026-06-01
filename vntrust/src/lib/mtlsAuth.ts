// D2 Sprint 6 — Inter-service mTLS simulation via HMAC
// Tài liệu nghiệp vụ §III.8: "mTLS nội bộ: Xác thực lẫn nhau giữa các microservice"
// Trong môi trường monolith Next.js, ta simulate mTLS bằng HMAC-SHA256 signed headers.
//
// Mỗi internal service request phải có header:
//   X-Service-Name: <reportIngestion|identityService|anonymizationService|apiGateway>
//   X-Service-Timestamp: <unix sec>
//   X-Service-Sig: <HMAC(SHA256, secret, name + timestamp + path + body)>
//
// Server verify:
//   1. Timestamp trong khoảng ±60s (chống replay)
//   2. HMAC signature khớp
//   3. Service name trong whitelist
import crypto from 'crypto';

const MTLS_SECRET = process.env.MTLS_INTERNAL_SECRET
  || process.env.VAULT_AES_KEY
  || 'vntrust-mtls-internal-CHANGE-IN-PROD';

// Whitelist 4 microservices per doc §III.7
export const VALID_SERVICES = [
  'reportIngestion',
  'identityService',
  'anonymizationService',
  'apiGateway',
] as const;

export type ServiceName = typeof VALID_SERVICES[number];

const MAX_TIMESTAMP_DRIFT_SEC = 60;

// Build HMAC signature
export function signServiceRequest(
  service: ServiceName,
  path: string,
  body: string = '',
  timestamp: number = Math.floor(Date.now() / 1000)
): { headers: Record<string, string>; sig: string } {
  const payload = `${service}|${timestamp}|${path}|${body}`;
  const sig = crypto.createHmac('sha256', MTLS_SECRET).update(payload).digest('hex');
  return {
    headers: {
      'X-Service-Name':      service,
      'X-Service-Timestamp': String(timestamp),
      'X-Service-Sig':       sig,
    },
    sig,
  };
}

// Verify request — return service name if valid, null otherwise
export function verifyServiceRequest(
  headers: Headers | Record<string, string>,
  path: string,
  body: string = ''
): ServiceName | null {
  const get = (k: string): string | null => {
    if (headers instanceof Headers) return headers.get(k);
    return (headers as Record<string, string>)[k] || (headers as Record<string, string>)[k.toLowerCase()] || null;
  };
  const service = get('X-Service-Name');
  const tsStr   = get('X-Service-Timestamp');
  const sig     = get('X-Service-Sig');
  if (!service || !tsStr || !sig) return null;
  // 1. Service name in whitelist
  if (!VALID_SERVICES.includes(service as ServiceName)) return null;
  // 2. Timestamp drift check
  const ts = parseInt(tsStr, 10);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > MAX_TIMESTAMP_DRIFT_SEC) return null;
  // 3. HMAC signature check (timing-safe)
  const expected = crypto.createHmac('sha256', MTLS_SECRET)
    .update(`${service}|${ts}|${path}|${body}`).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return service as ServiceName;
}
