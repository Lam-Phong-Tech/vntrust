// Deploy 5 quick wins L: voice + backfill + OCR wire + weekly/monthly + SVG export
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILES = [
  'src/components/VoiceSearchButton.tsx',
  'src/app/verify/manual/page.tsx',
  'src/app/dashboard/kyc/page.tsx',
  'src/app/dashboard/inventory/[id]/qr/page.tsx',
  'src/app/api/qr/backfill/route.ts',
  'src/app/api/cron/weekly-digest/route.ts',
  'src/app/api/cron/monthly-digest/route.ts',
];

// 2 cron entries mới + giữ 3 cũ
const CRON_LINES = [
  '# VNTrust cron (Phase F + L)',
  '0 *   * * *  curl -fsS "https://anticounterfeit.test9.io.vn/api/cron/escalate?secret=vntrust-cron-key" > /dev/null 2>&1',
  '0 8   * * *  curl -fsS "https://anticounterfeit.test9.io.vn/api/cron/daily-digest?secret=vntrust-cron-key" > /dev/null 2>&1',
  '0 */6 * * *  curl -fsS "https://anticounterfeit.test9.io.vn/api/lifecycle-check?secret=vntrust-cron-key" > /dev/null 2>&1',
  '0 8   * * 1  curl -fsS "https://anticounterfeit.test9.io.vn/api/cron/weekly-digest?secret=vntrust-cron-key" > /dev/null 2>&1',
  '0 8   1 * *  curl -fsS "https://anticounterfeit.test9.io.vn/api/cron/monthly-digest?secret=vntrust-cron-key" > /dev/null 2>&1',
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
  const backupDir = `${REMOTE_ROOT}/_backups/L_quickwins.${stamp}`;
  await run(conn, `mkdir -p ${backupDir}`);
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

  console.log('\n[build] npm run build...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
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

  // Update crontab: + weekly + monthly
  console.log('\n[cron] Cập nhật crontab thêm weekly + monthly...');
  r = await run(conn, `crontab -l 2>/dev/null | grep -v "VNTrust cron\\|anticounterfeit.test9.io.vn/api/cron\\|anticounterfeit.test9.io.vn/api/lifecycle" > /tmp/cron_new || true; printf '%s\\n' ${CRON_LINES.map(l => "'" + l.replace(/'/g, "'\"'\"'") + "'").join(' ')} >> /tmp/cron_new; crontab /tmp/cron_new; crontab -l | tail -7`);
  console.log(r.stdout);

  await new Promise(r => setTimeout(r, 3000));

  // Verify endpoints + run backfill
  console.log('\n[verify] endpoints mới:');
  for (const url of [
    '/api/qr/backfill',
    '/api/cron/weekly-digest?secret=vntrust-cron-key&dryRun=1',
    '/api/cron/monthly-digest?secret=vntrust-cron-key&dryRun=1',
  ]) {
    r = await run(conn, `curl -sk -o /dev/null -w "%{http_code}" -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn${url}"`);
    console.log(`  ${r.stdout}  ${url}`);
  }

  console.log('\n[backfill] Chạy backfill encryptedToken cho 1103 UID (admin cookie)...');
  r = await run(conn, 'curl -sk -X POST -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/api/qr/backfill?limit=2000" | head -c 400');
  console.log(r.stdout);

  console.log('\n[verify] backfill status:');
  r = await run(conn, 'curl -sk -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/api/qr/backfill"');
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
