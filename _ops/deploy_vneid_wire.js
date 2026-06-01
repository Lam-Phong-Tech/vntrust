// Deploy Phase 2: wire up VNeID button trong VNTrust app
// 1) Backup file login/[role]/page.tsx trên VPS trước khi đè
// 2) SFTP upload 3 file: edited login page + 2 new route.ts
// 3) Remote build: cd /var/www/vntrust && npm run build
// 4) Nếu build OK: pm2 restart vntrust
// 5) Nếu build FAIL: KHÔNG restart, in lỗi
// 6) Verify: curl /api/auth/vneid/start?role=consumer → expect 307 redirect

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILES = [
  'src/app/login/[role]/page.tsx',
  'src/app/api/auth/vneid/start/route.ts',
  'src/app/api/auth/vneid/callback/route.ts',
];

function run(conn, cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('close', (code) => resolve({ code, stdout, stderr }))
        .on('data', d => { const s = d.toString(); stdout += s; if (opts.stream) process.stdout.write(s); })
        .stderr.on('data', d => { const s = d.toString(); stderr += s; if (opts.stream) process.stderr.write(s); });
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

  // 1) Backup existing login page
  const stamp = Date.now();
  const backupPath = `${REMOTE_ROOT}/_backups/login_role_page.tsx.${stamp}.bak`;
  console.log(`[backup] saving current prod file to ${backupPath}`);
  let r = await run(conn, `mkdir -p ${REMOTE_ROOT}/_backups && cp '${REMOTE_ROOT}/src/app/login/[role]/page.tsx' '${backupPath}'`);
  if (r.code !== 0) { console.error('backup failed:', r.stderr); conn.end(); process.exit(1); }
  console.log('[backup] OK');

  // 2) SFTP upload 3 files
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    // Make sure parent dir exists on remote
    const parent = path.posix.dirname(remote);
    await run(conn, `mkdir -p '${parent}'`);
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`[sftp] uploaded ${rel}`);
  }

  // 3) Remote build
  console.log('\n[build] cd /var/www/vntrust && npm run build (streaming, may take ~60s)...');
  r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`, { stream: false });
  // Print last 40 lines of build output
  const tail = r.stdout.split('\n').slice(-40).join('\n');
  console.log(tail);
  if (r.code !== 0) {
    console.error('\n❌ Build FAILED — NOT restarting vntrust. Rolling back login page from backup.');
    await run(conn, `cp '${backupPath}' '${REMOTE_ROOT}/src/app/login/[role]/page.tsx'`);
    // Note: 2 new vneid route files left in place (harmless — not served unless build succeeds)
    conn.end();
    process.exit(1);
  }
  console.log('\n[build] ✓ OK');

  // 4) PM2 restart vntrust
  console.log('[pm2] restarting vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').slice(-15).join('\n'));

  // 5) Verify
  console.log('\n[verify] sleep 3s for app to come up...');
  await new Promise(r => setTimeout(r, 3000));
  console.log('[verify] curl /api/auth/vneid/start?role=consumer (expect 307 redirect)...');
  r = await run(conn, "curl -sS -o /tmp/vneid_start.txt -w 'STATUS:%{http_code}\\nLOCATION:%{redirect_url}\\nCOOKIE:'; grep -i 'set-cookie' /tmp/vneid_start.txt 2>/dev/null || true; curl -sS -i 'https://anticounterfeit.test9.io.vn/api/auth/vneid/start?role=consumer' --max-redirs 0 2>&1 | head -15");
  console.log(r.stdout);

  console.log('\n[verify] pm2 status vntrust:');
  r = await run(conn, 'pm2 list | grep -E "vntrust|mock-vneid"');
  console.log(r.stdout);

  conn.end();
  console.log('\n✅ [done] Phase 2 deployed. Backup: ' + backupPath);
}

main().catch(e => { console.error(e); process.exit(1); });
