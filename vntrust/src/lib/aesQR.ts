// AES-256-GCM mã hóa UID cho QR (Phase 8)
// Token nhúng vào QR thay vì plaintext UUID.
// Format token: base64url(iv[12] || authTag[16] || ciphertext)

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.QR_AES_KEY || '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
// 32 bytes = 64 hex chars
const KEY = Buffer.from(KEY_HEX, 'hex');
if (KEY.length !== 32) {
  console.error('[aesQR] QR_AES_KEY phải là 64 hex chars (32 bytes). Đang dùng key mặc định (KHÔNG an toàn cho production).');
}

export function encryptUidForQR(uid: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(uid, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, ciphertext]);
  return packed.toString('base64url');
}

export function decryptQRToken(token: string): string | null {
  try {
    const packed = Buffer.from(token, 'base64url');
    if (packed.length < 12 + 16 + 1) return null;
    const iv = packed.subarray(0, 12);
    const authTag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    const uid = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return uid;
  } catch {
    return null;
  }
}

// Helper: nhận diện token (base64url, không chứa dấu - hyphen kiểu UUID v4)
export function looksLikeEncryptedToken(input: string): boolean {
  // UUID v4 có format 8-4-4-4-12 hex với dấu '-'
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) return false;
  // Encrypted token base64url thường > 50 chars và không có dấu '-' giữa
  if (input.length < 40) return false;
  return /^[A-Za-z0-9_-]+$/.test(input);
}
