// Phase 10: helper mã hóa cho 3 vault tách biệt
// AES-256-GCM theo doc §III.4 — Key Management Service riêng (env), Salt cho hash.
// Sprint 3 / B2: Key versioning để hỗ trợ rotation (re-encryption migration sau).

import crypto from 'crypto';

const VAULT_KEY_HEX = process.env.VAULT_AES_KEY || 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
const VAULT_HASH_SALT = process.env.VAULT_HASH_SALT || 'vntrust-vault-salt-2026';
const VAULT_KEY = Buffer.from(VAULT_KEY_HEX, 'hex');

// Key version metadata (cho cron rotation check)
export const VAULT_KEY_VERSION = parseInt(process.env.VAULT_KEY_VERSION || '1', 10);
export const VAULT_KEY_CREATED_AT = process.env.VAULT_KEY_CREATED_AT || '2026-05-01T00:00:00Z';
export const VAULT_KEY_ROTATION_DAYS = 90; // Luật BVDLCN §III.4: xoay vòng mỗi 90 ngày

export function vaultEncrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', VAULT_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function vaultDecrypt(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    const packed = Buffer.from(encrypted, 'base64');
    const iv = packed.subarray(0, 12);
    const authTag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', VAULT_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// SHA-256 + salt — không thể đảo ngược, để check trùng
export function vaultHash(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  return crypto.createHash('sha256').update(plaintext + VAULT_HASH_SALT).digest('hex');
}

// User identity hash — link giữa các vault qua hash thay vì plaintext userId
export function userIdentityHash(userId: string): string {
  return crypto.createHash('sha256').update(userId + ':' + VAULT_HASH_SALT).digest('hex').substring(0, 32);
}
