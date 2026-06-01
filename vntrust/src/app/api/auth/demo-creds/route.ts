// Endpoint trả demo credentials từ env (per-deploy random).
// Demo creds là PUBLIC theo thiết kế (cho phép visitor test nhanh) —
// vulnerability cũ là dùng password mặc định hardcoded, đã fix bằng cách
// random per-deploy. Endpoint chỉ trả 4 demo có sẵn trong env.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const accounts = [
    { role: 'admin',        user: process.env.DEMO_ADMIN_EMAIL || 'admin@vntrust.vn',         pass: process.env.DEMO_ADMIN_PASS || '' },
    { role: 'manufacturer', user: process.env.DEMO_MFR_EMAIL   || 'nsx@vntrust.vn',           pass: process.env.DEMO_MFR_PASS   || '' },
    { role: 'importer',     user: process.env.DEMO_IMP_EMAIL   || 'nhapkhau@vntrust.vn',      pass: process.env.DEMO_IMP_PASS   || '' },
    { role: 'consumer',     user: process.env.DEMO_CON_EMAIL   || 'nguoitieudung@vntrust.vn', pass: process.env.DEMO_CON_PASS   || '' },
  ];
  return NextResponse.json({
    demoAccounts: accounts,
    // Không cache (vì pass có thể thay đổi sau khi rotate env)
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
