// D1 Sprint 6 — Identity Service
// Tài liệu nghiệp vụ §III.7: "Quản lý mã hóa/giải mã thông tin người dùng"
// Giao tiếp nội bộ "gRPC + mTLS" → trong monolith ta dùng HMAC-signed function calls.
//
// Tách hẳn khỏi /api/vault/identity/route.ts:
//   - identityService.encryptContact(plaintext) → ciphertext
//   - identityService.decryptContact(ciphertext) → plaintext (admin only)
//   - identityService.hashCccd(cccd) → hash + salt
//   - identityService.createIdentityRef(userId) → unique ref token
import crypto from 'crypto';
import { vaultEncrypt, vaultDecrypt, vaultHash, userIdentityHash } from '@/lib/vaultCrypto';

export interface IdentityContact {
  email?: string;
  phone?: string;
  name?: string;
  cccd?: string;
}

export interface EncryptedIdentity {
  identityRef: string;        // unique ref token (link với Report Vault)
  emailEnc?: string;
  phoneEnc?: string;
  nameEnc?: string;
  cccdHash?: string;          // SHA-256 + Salt (one-way)
  createdAt: string;
  trace: {
    encryptedBy: 'identityService';
    timestamp: number;
  };
}

// Encrypt user contact → trả ciphertext + identityRef
export function encryptContact(contact: IdentityContact): EncryptedIdentity {
  const identityRef = 'ID-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  return {
    identityRef,
    emailEnc: contact.email ? vaultEncrypt(contact.email) || undefined : undefined,
    phoneEnc: contact.phone ? vaultEncrypt(contact.phone) || undefined : undefined,
    nameEnc:  contact.name  ? vaultEncrypt(contact.name)  || undefined : undefined,
    cccdHash: contact.cccd  ? vaultHash(contact.cccd)     || undefined : undefined,
    createdAt: new Date().toISOString(),
    trace: { encryptedBy: 'identityService', timestamp: Math.floor(Date.now() / 1000) },
  };
}

// Decrypt — admin-only operation, caller phải verify trước
export function decryptContact(enc: EncryptedIdentity): IdentityContact {
  return {
    email: enc.emailEnc ? vaultDecrypt(enc.emailEnc) || undefined : undefined,
    phone: enc.phoneEnc ? vaultDecrypt(enc.phoneEnc) || undefined : undefined,
    name:  enc.nameEnc  ? vaultDecrypt(enc.nameEnc)  || undefined : undefined,
    // CCCD KHÔNG decrypt được (one-way hash) — chỉ check trùng
  };
}

// Check CCCD trùng — input plaintext, so sánh với hash đã lưu
export function verifyCccd(plaintext: string, storedHash: string): boolean {
  const h = vaultHash(plaintext);
  return h === storedHash;
}

// Tạo ref token để link Report ↔ Identity mà không lộ userId plaintext
export function createIdentityRef(userId: string): string {
  return 'IRF-' + userIdentityHash(userId).slice(0, 16).toUpperCase();
}
