// Full batch deploy:
//  1) Schema update (TieuChuanKiemNghiem + chiTieuPhanTich field) — prisma db push
//  2) Code:
//     - prisma/schema.prisma (schema)
//     - src/lib/hauKiemRule.ts (rule engine)
//     - src/app/api/standards/route.ts
//     - src/app/api/standards/seed/route.ts
//     - src/app/api/haukiem/route.ts (updated POST với rule engine)
//     - src/app/api/external/agency/route.ts (đầu chờ cơ quan QLTT/Công an)
//     - src/app/api/product/lookup/route.ts (public lookup alias)
//     - src/app/api/gtin/validate/route.ts (UC19 GTIN check)
//     - src/app/dashboard/inventory/[id]/qr/page.tsx (dark + @media print)
//  3) Remote build
//  4) PM2 restart vntrust
//  5) Auto-seed 27 tiêu chuẩn qua /api/standards/seed (admin cookie)
//  6) Verify all new endpoints

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILES = [
  'prisma/schema.prisma',
  'src/lib/hauKiemRule.ts',
  'src/app/api/standards/route.ts',
  'src/app/api/standards/seed/route.ts',
  'src/app/api/haukiem/route.ts',
  'src/app/api/external/agency/route.ts',
  'src/app/api/product/lookup/route.ts',
  'src/app/api/gtin/validate/route.ts',
  'src/app/api/certificates/route.ts',  // fix orderBy ngayTao → ngayCap (prod broken)
  'src/app/dashboard/inventory/[id]/qr/page.tsx',
  'tsconfig.json',  // exclude _backups/ + _ops/ from TS compilation
];

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('close', code => resolve({ code, stdout, stderr }))
        .on('data', d => stdout += d.toString())
        .stderr.on('data', d => stderr += d.toString());
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 10000 });
  });
  console.log('[ssh] connected');

  const stamp = Date.now();
  const backupDir = `${REMOTE_ROOT}/_backups/full_batch.${stamp}`;
  console.log(`[backup] ${backupDir}`);
  await run(conn, `mkdir -p ${backupDir}`);
  await run(conn, `cp ${REMOTE_ROOT}/dev.db ${backupDir}/dev.db.bak`);

  for (const rel of FILES) {
    const remote = `${REMOTE_ROOT}/${rel}`;
    const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
    await run(conn, `[ -f '${remote}' ] && cp '${remote}' '${bkp}' || true`);
  }
  console.log('  ✓ backup OK (db + 9 source files)');

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    await run(conn, `mkdir -p '${path.posix.dirname(remote)}'`);
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`✓ ${rel}`);
  }

  console.log('\n[prisma] generate + db push...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npx prisma generate 2>&1 | tail -3 && npx prisma db push 2>&1 | tail -5`);
  console.log(r.stdout);
  if (r.code !== 0) {
    console.error('❌ prisma failed — rollback DB');
    await run(conn, `cp ${backupDir}/dev.db.bak ${REMOTE_ROOT}/dev.db`);
    conn.end(); process.exit(1);
  }

  console.log('[build] npm run build...');
  r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-12).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rolling back files');
    for (const rel of FILES) {
      const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `[ -f '${bkp}' ] && cp '${bkp}' '${REMOTE_ROOT}/${rel}' || rm '${REMOTE_ROOT}/${rel}' 2>/dev/null`);
    }
    conn.end(); process.exit(1);
  }

  console.log('[pm2] restart vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 3).join('\n'));

  await new Promise(r => setTimeout(r, 3000));

  // Auto-seed standards
  console.log('\n[seed] POST /api/standards/seed (admin cookie)');
  r = await run(conn, 'curl -sk -X POST -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/api/standards/seed"');
  console.log('  ', r.stdout);

  // Verify all new endpoints
  console.log('\n[verify] endpoints mới live không:');
  for (const url of [
    '/api/standards',
    '/api/external/agency?resource=info',
    '/api/product/lookup?code=ebb6f6982e894486',
    '/api/gtin/validate?gtin=8931234567893',
  ]) {
    let cmd;
    if (url.startsWith('/api/external/agency')) {
      cmd = `curl -sk -o /dev/null -w "%{http_code}" -H "x-gov-api-key: demo-qltt-2026" "https://anticounterfeit.test9.io.vn${url}"`;
    } else {
      cmd = `curl -sk -o /dev/null -w "%{http_code}" "https://anticounterfeit.test9.io.vn${url}"`;
    }
    r = await run(conn, cmd);
    console.log(`  ${r.stdout}  ${url}`);
  }

  conn.end();
  console.log(`\n✅ [done] Full batch deployed. Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
