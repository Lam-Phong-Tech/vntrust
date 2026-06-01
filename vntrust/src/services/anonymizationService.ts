// D1 Sprint 6 — Anonymization Service
// Tài liệu nghiệp vụ §III.7: "Xóa thông tin định danh khỏi báo cáo trước khi lưu"
// Giao tiếp "Event-driven (Kafka)" — trong monolith dùng synchronous function calls.
//
// Mục đích: nhận raw report → strip PII → trả ra report đã an toàn để lưu DB chính.
// PII gồm: email, phone, CCCD trong nội dung mô tả, GPS lat/lng quá chính xác.

export interface RawReport {
  reportId: string;
  moTa?: string;
  metadata?: Record<string, any>;
}

export interface AnonymizedReport {
  reportId: string;
  moTa?: string;
  metadata?: Record<string, any>;
  redactedFields: string[];   // list các field đã bị xoá/redact
  trace: {
    anonymizedBy: 'anonymizationService';
    timestamp: number;
  };
}

// Regex strip patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+84|0084|0)[1-9]\d{8,9}/g;
const CCCD_REGEX  = /\b\d{12}\b/g; // VN CCCD 12 digits
const CMND_REGEX  = /\b\d{9}\b/g;  // VN CMND 9 digits

function redactPII(text: string): { text: string; redacted: string[] } {
  const redacted: string[] = [];
  let t = text;
  if (EMAIL_REGEX.test(t)) { redacted.push('email'); t = t.replace(EMAIL_REGEX, '[EMAIL_REDACTED]'); }
  if (PHONE_REGEX.test(t)) { redacted.push('phone'); t = t.replace(PHONE_REGEX, '[PHONE_REDACTED]'); }
  if (CCCD_REGEX.test(t))  { redacted.push('cccd');  t = t.replace(CCCD_REGEX,  '[CCCD_REDACTED]'); }
  if (CMND_REGEX.test(t))  { redacted.push('cmnd');  t = t.replace(CMND_REGEX,  '[CMND_REDACTED]'); }
  return { text: t, redacted };
}

// Giảm độ chính xác GPS (1km = 0.01°) để chống re-identify cá nhân
function blurGps(lat: number | null | undefined, lng: number | null | undefined): { lat: number | null; lng: number | null } {
  return {
    lat: typeof lat === 'number' ? Math.round(lat * 100) / 100 : null,
    lng: typeof lng === 'number' ? Math.round(lng * 100) / 100 : null,
  };
}

export function anonymize(raw: RawReport): AnonymizedReport {
  const allRedacted: string[] = [];
  let moTa = raw.moTa;
  let metadata = raw.metadata ? { ...raw.metadata } : undefined;

  if (moTa) {
    const r = redactPII(moTa);
    moTa = r.text;
    allRedacted.push(...r.redacted);
  }

  if (metadata) {
    // Redact PII trong các text field thường gặp
    for (const key of ['lyDo', 'tenShop', 'sdtNguoiBan', 'linkSanPham']) {
      if (typeof metadata[key] === 'string') {
        const r = redactPII(metadata[key]);
        metadata[key] = r.text;
        if (r.redacted.length) allRedacted.push(`metadata.${key}.${r.redacted.join(',')}`);
      }
    }
    // Blur GPS
    if ('lat' in metadata || 'lng' in metadata) {
      const blurred = blurGps(metadata.lat, metadata.lng);
      metadata.lat = blurred.lat;
      metadata.lng = blurred.lng;
      allRedacted.push('gps.blurred');
    }
    // Strip contactInfo plaintext nếu chế độ ẩn danh
    if (metadata.cheDoAnDanh === 'an_danh' || !metadata.cheDoAnDanh) {
      if (metadata.contactInfo) {
        metadata.contactInfo = '[ANONYMOUS]';
        allRedacted.push('metadata.contactInfo');
      }
    }
  }

  return {
    reportId: raw.reportId,
    moTa,
    metadata,
    redactedFields: [...new Set(allRedacted)],
    trace: { anonymizedBy: 'anonymizationService', timestamp: Math.floor(Date.now() / 1000) },
  };
}
