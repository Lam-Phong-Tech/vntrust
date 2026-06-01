// D1 Sprint 6 — API Gateway Service
// Tài liệu nghiệp vụ §III.7: "Điều phối, xác thực, phân quyền — OAuth 2.0 + JWT + RBAC"
// Boundary: là entry point cho mọi internal service call, enforce auth/rate-limit/audit.
//
// Trong monolith Next.js, ta dùng API Gateway như một orchestrator function:
//   ingest report → identityService.encrypt → anonymizationService.anonymize → save DB
import { ingest, type IngestionInput, type IngestionResult } from './reportIngestion';
import { encryptContact, createIdentityRef, type EncryptedIdentity } from './identityService';
import { anonymize, type AnonymizedReport } from './anonymizationService';
import { verifyJWT, type SessionPayload } from '@/lib/jwt';

export interface GatewayContext {
  userRole?: string;
  userName?: string;
  ip: string;
  sessionToken?: string;
}

export interface GatewayResult {
  success: boolean;
  reportId?: string;
  identityRef?: string;
  redactedFields?: string[];
  trace: {
    services: string[];        // services touched in order
    latencyMs: number;
    timestamp: number;
  };
  error?: string;
}

// RBAC matrix per doc §IV
const RBAC: Record<string, string[]> = {
  // Action → roles allowed
  'report.submit':       ['admin', 'manufacturer', 'importer', 'consumer', 'anonymous'],
  'identity.encrypt':    ['admin', 'manufacturer', 'importer', 'consumer'],
  'identity.decrypt':    ['admin'],
  'report.investigate':  ['admin'],
};

export function checkRBAC(action: string, role: string = 'anonymous'): boolean {
  const allowed = RBAC[action];
  if (!allowed) return false;
  return allowed.includes(role);
}

// Orchestration: full ingestion pipeline (D1 demonstration)
export async function ingestReportPipeline(
  input: IngestionInput,
  ctx: GatewayContext
): Promise<GatewayResult> {
  const start = Date.now();
  const servicesTouched: string[] = ['apiGateway'];

  try {
    // 1. RBAC check
    if (!checkRBAC('report.submit', ctx.userRole || 'anonymous')) {
      return {
        success: false,
        trace: { services: servicesTouched, latencyMs: Date.now() - start, timestamp: Math.floor(Date.now() / 1000) },
        error: 'forbidden_rbac',
      };
    }

    // 2. Optional JWT verification (logged-in user)
    let session: SessionPayload | null = null;
    if (ctx.sessionToken) {
      session = verifyJWT(ctx.sessionToken);
      if (!session) {
        return {
          success: false,
          trace: { services: servicesTouched, latencyMs: Date.now() - start, timestamp: Math.floor(Date.now() / 1000) },
          error: 'invalid_session',
        };
      }
    }

    // 3. → Report Ingestion Service
    servicesTouched.push('reportIngestion');
    const ingested: IngestionResult = ingest(input);

    // 4. → Identity Service (nếu mode != an_danh)
    let identity: EncryptedIdentity | null = null;
    if (input.loaiBaoCao && input.loaiBaoCao !== 'an_danh' && input.thongTinLienHe) {
      servicesTouched.push('identityService');
      const parts = input.thongTinLienHe.includes('@')
        ? { email: input.thongTinLienHe }
        : { phone: input.thongTinLienHe };
      identity = encryptContact({
        ...parts,
        name: ctx.userName,
      });
    }

    // 5. → Anonymization Service
    servicesTouched.push('anonymizationService');
    const anonymized: AnonymizedReport = anonymize({
      reportId: ingested.reportId,
      moTa: input.moTa,
      metadata: input.metadata,
    });

    return {
      success: true,
      reportId: ingested.reportId,
      identityRef: identity?.identityRef,
      redactedFields: anonymized.redactedFields,
      trace: {
        services: servicesTouched,
        latencyMs: Date.now() - start,
        timestamp: Math.floor(Date.now() / 1000),
      },
    };
  } catch (e: any) {
    return {
      success: false,
      trace: { services: servicesTouched, latencyMs: Date.now() - start, timestamp: Math.floor(Date.now() / 1000) },
      error: e.message || 'pipeline_error',
    };
  }
}
