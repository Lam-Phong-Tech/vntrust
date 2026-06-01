// Phase 9: Hash ảnh để phát hiện báo cáo trùng spam
// SHA-256 byte-level (exact duplicate). pHash (perceptual) cần thư viện thêm — để dành.

import crypto from 'crypto';

export async function hashImageUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

export function hashImageBuffer(buf: Buffer): string {
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}
