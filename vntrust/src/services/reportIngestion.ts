// D1 Sprint 6 — Report Ingestion Service
// Tài liệu nghiệp vụ §III.7: "Tiếp nhận báo cáo từ người dùng, tạo Report ID"
// Boundary: nhận input từ user → validate → tạo ReportID → forward sang AnonymizationService.
//
// Tách logic ra khỏi /api/report/route.ts để dễ migrate sang microservice riêng sau này.
import crypto from 'crypto';

export interface IngestionInput {
  serial?: string;
  moTa?: string;
  viTri?: string;
  loaiSanPham?: string;
  mucDo?: 'low' | 'medium' | 'high';
  thongTinLienHe?: string;
  loaiBaoCao?: 'an_danh' | 'lien_he' | 'cong_khai';
  loaiPhanAnh?: string;
  noiMua?: string;
  giaMua?: number;
  metadata?: Record<string, any>;
  anhBangChung?: string[];
}

export interface IngestionResult {
  reportId: string;     // unique report ID (server-side)
  receivedAt: string;   // ISO timestamp
  trace: {
    ingestedBy: 'reportIngestion';
    timestamp: number;
  };
}

// Tạo Report ID duy nhất — UUID v4 prefix RPT
export function generateReportId(): string {
  return 'RPT-' + crypto.randomUUID().slice(0, 13).toUpperCase();
}

// Validate input ở tầng Ingestion (basic, không xử lý PII)
export function validateIngestion(input: IngestionInput): { ok: true } | { ok: false; error: string } {
  if (!input.moTa && !input.metadata?.lyDo) {
    return { ok: false, error: 'Vui lòng mô tả lý do nghi ngờ (moTa or metadata.lyDo required)' };
  }
  if (input.mucDo && !['low', 'medium', 'high'].includes(input.mucDo)) {
    return { ok: false, error: 'Invalid mucDo. Must be low|medium|high' };
  }
  if (input.loaiBaoCao && !['an_danh', 'lien_he', 'cong_khai'].includes(input.loaiBaoCao)) {
    return { ok: false, error: 'Invalid loaiBaoCao' };
  }
  return { ok: true };
}

// Main entry: nhận input → trả Report ID + trace
export function ingest(input: IngestionInput): IngestionResult {
  const valid = validateIngestion(input);
  if (!valid.ok) throw new Error(valid.error);
  return {
    reportId: generateReportId(),
    receivedAt: new Date().toISOString(),
    trace: {
      ingestedBy: 'reportIngestion',
      timestamp: Math.floor(Date.now() / 1000),
    },
  };
}
