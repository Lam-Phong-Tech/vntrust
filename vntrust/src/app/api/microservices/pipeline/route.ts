// D1 Sprint 6 — Microservices Pipeline endpoint
// Demo endpoint chứng minh kiến trúc 4-service ingestion pipeline đã hoạt động:
//   Client → API Gateway → Report Ingestion → Identity Service → Anonymization Service
//
// Hỗ trợ 2 chế độ:
//   - public: caller gọi từ ngoài (qua session cookie auth)
//   - mTLS:   service-to-service call (kiểm tra HMAC qua mtlsAuth)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ingestReportPipeline } from '@/services/apiGateway';
import { verifyServiceRequest } from '@/lib/mtlsAuth';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'public';
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const bodyText = await req.text();
  const body = bodyText ? JSON.parse(bodyText) : {};

  // ── mTLS service-to-service mode ─────────────────────────
  if (mode === 'mtls') {
    const svc = verifyServiceRequest(req.headers, '/api/microservices/pipeline', bodyText);
    if (!svc) {
      return NextResponse.json({
        error: 'mtls_auth_failed',
        hint: 'Provide X-Service-Name, X-Service-Timestamp, X-Service-Sig (HMAC) headers',
      }, { status: 401 });
    }
    const result = await ingestReportPipeline(body.input, {
      userRole: body.ctx?.userRole || 'admin',
      userName: body.ctx?.userName,
      ip,
      sessionToken: body.ctx?.sessionToken,
    });
    return NextResponse.json({ mode: 'mtls', authenticatedAs: svc, ...result });
  }

  // ── Public mode (session-cookie auth) ────────────────────
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value;
  const userName = cookieStore.get('userName')?.value;
  const sessionToken = cookieStore.get('sessionToken')?.value;

  const result = await ingestReportPipeline(body, {
    userRole: userRole || 'anonymous',
    userName,
    ip,
    sessionToken,
  });
  return NextResponse.json({ mode: 'public', ...result });
}

// GET: list available services + status
export async function GET() {
  return NextResponse.json({
    architecture: 'logical_microservices',
    services: [
      { name: 'apiGateway',            role: 'Orchestrator + RBAC + JWT verify',  doc: '§III.7 row 4' },
      { name: 'reportIngestion',       role: 'Receive + validate + ReportID',     doc: '§III.7 row 1' },
      { name: 'identityService',       role: 'Encrypt/decrypt user PII',          doc: '§III.7 row 2' },
      { name: 'anonymizationService',  role: 'Redact PII, blur GPS',              doc: '§III.7 row 3' },
    ],
    interServiceAuth: 'HMAC-SHA256 signed headers (X-Service-*) — simulates mTLS in monolith',
    pipelineEndpoint: 'POST /api/microservices/pipeline?mode=public|mtls',
    note: 'Code lives in src/services/*.ts — boundary preserved để migrate sang microservices riêng trong tương lai.',
  });
}
