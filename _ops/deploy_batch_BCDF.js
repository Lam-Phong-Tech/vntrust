// Deploy Batch B + C + D + F (last one is SSH cron setup)
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
  'src/lib/aesQR.ts',
  'src/lib/webhook.ts',
  'src/lib/imageHash.ts',
  'src/lib/vaultCrypto.ts',
  'src/app/api/qr/encrypt/route.ts',
  'src/app/api/qr/decrypt/route.ts',
  'src/app/api/webhook/route.ts',
  'src/app/api/webhook/test/route.ts',
  'src/app/api/ocr/extract/route.ts',
  'src/app/api/report/check-duplicate/route.ts',
  'src/app/api/analytics-multi/route.ts',
  'src/app/api/vault/identity/route.ts',
  'src/app/api/vault/report/route.ts',
];

const CRON_LINES = [
  '# VNTrust cron (Phase F)',
  '0 * * * * curl -fsS "https://anticounterfeit.test9.io.vn/api/cron/escalate?secret=vntrust-cron-key" > /dev/null 2>&1',
  '0 8 * * * curl -fsS "https://anticounterfeit.test9.io.vn/api/cron/daily-digest?secret=vntrust-cron-key" > /dev/null 2>&1',
  '0 */6 * * * curl -fsS "https://anticounterfeit.test9.io.vn/api/lifecycle-check?secret=vntrust-cron-key" > /dev/null 2>&1',
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
  const backupDir = `${REMOTE_ROOT}/_backups/bcdf.${stamp}`;
  await run(conn, `mkdir -p ${backupDir} && cp ${REMOTE_ROOT}/dev.db ${backupDir}/dev.db.bak`);
  for (const rel of FILES) {
    const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
    await run(conn, `[ -f '${REMOTE_ROOT}/${rel}' ] && cp '${REMOTE_ROOT}/${rel}' '${bkp}' || true`);
  }
  console.log(`[backup] ${backupDir}`);

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    await run(conn, `mkdir -p '${path.posix.dirname(remote)}'`);
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`✓ ${rel}`);
  }

  console.log('\n[prisma] generate + db push --accept-data-loss...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npx prisma generate 2>&1 | tail -2 && npx prisma db push --accept-data-loss 2>&1 | tail -5`);
  console.log(r.stdout);

  console.log('[build] npm run build...');
  r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-10).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rollback');
    for (const rel of FILES) {
      const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `[ -f '${bkp}' ] && cp '${bkp}' '${REMOTE_ROOT}/${rel}' || rm '${REMOTE_ROOT}/${rel}' 2>/dev/null`);
    }
    conn.end(); process.exit(1);
  }

  console.log('[pm2] restart vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 3).join('\n'));

  // ── Phase F: Setup crontab idempotent ──────────────────────────
  console.log('\n[cron] Cập nhật crontab cho root...');
  // Lấy crontab hiện tại, lọc bỏ các dòng VNTrust cũ, thêm bộ mới
  r = await run(conn, `crontab -l 2>/dev/null | grep -v "VNTrust cron\\|anticounterfeit.test9.io.vn/api/cron\\|anticounterfeit.test9.io.vn/api/lifecycle" > /tmp/cron_new || true; echo '${CRON_LINES.join('\n')}' >> /tmp/cron_new; crontab /tmp/cron_new; crontab -l | tail -6`);
  console.log(r.stdout);

  await new Promise(r => setTimeout(r, 3000));

  // Verify
  console.log('\n[verify] endpoints mới:');
  for (const url of [
    '/api/qr/encrypt',
    '/api/webhook',
    '/api/ocr/extract',
    '/api/analytics-multi?groupBy=day&metric=scans',
    '/api/vault/identity',
    '/api/vault/report',
    '/api/report/check-duplicate',
  ]) {
    r = await run(conn, `curl -sk -o /dev/null -w "%{http_code}" -X POST -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn${url}"`);
    const post = r.stdout.trim();
    r = await run(conn, `curl -sk -o /dev/null -w "%{http_code}" -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn${url}"`);
    console.log(`  GET ${r.stdout.trim()} / POST ${post}  ${url}`);
  }

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
