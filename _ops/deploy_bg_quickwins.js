// Deploy: fix body background xanh → ink + gold + 5 quick wins
//   1) globals.css (body bg, theme vars)
//   2) lifecycle-check (Lớp 3 cert version check)
//   3) report (UC11 auto-aggregate ≥3 reports)
//   4) system-config (UC14)
//   5) compliance/vsic + seed (UC18)
//   6) vneid callback (hash CCCD)
//   7) schema (CauHinhHeThong + YeuCauTuanThuVSIC)

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
  'src/app/globals.css',
  'src/app/api/lifecycle-check/route.ts',
  'src/app/api/report/route.ts',
  'src/app/api/system-config/route.ts',
  'src/app/api/compliance/vsic/route.ts',
  'src/app/api/compliance/vsic/seed/route.ts',
  'src/app/api/auth/vneid/callback/route.ts',
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
  const backupDir = `${REMOTE_ROOT}/_backups/bg_qwins.${stamp}`;
  await run(conn, `mkdir -p ${backupDir} && cp ${REMOTE_ROOT}/dev.db ${backupDir}/dev.db.bak`);
  for (const rel of FILES) {
    const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
    await run(conn, `[ -f '${REMOTE_ROOT}/${rel}' ] && cp '${REMOTE_ROOT}/${rel}' '${bkp}' || true`);
  }
  console.log(`[backup] ${backupDir} (db + ${FILES.length} files)`);

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    await run(conn, `mkdir -p '${path.posix.dirname(remote)}'`);
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`✓ ${rel}`);
  }

  console.log('\n[prisma] generate + db push...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npx prisma generate 2>&1 | tail -3 && npx prisma db push 2>&1 | tail -3`);
  console.log(r.stdout);
  if (r.code !== 0) {
    console.error('❌ prisma failed — rollback DB');
    await run(conn, `cp ${backupDir}/dev.db.bak ${REMOTE_ROOT}/dev.db`);
    conn.end(); process.exit(1);
  }

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

  await new Promise(r => setTimeout(r, 3000));

  // Seed VSIC
  console.log('\n[seed] POST /api/compliance/vsic/seed');
  r = await run(conn, 'curl -sk -X POST -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/api/compliance/vsic/seed"');
  console.log('  ', r.stdout);

  // Verify
  console.log('\n[verify] endpoints + body background:');
  for (const url of [
    '/api/system-config?namespace=alert',
    '/api/compliance/vsic?doanhNghiepId=any',
    '/api/lifecycle-check?secret=vntrust-cron-key',
  ]) {
    r = await run(conn, `curl -sk -o /dev/null -w "%{http_code}" -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn${url}"`);
    console.log(`  ${r.stdout}  ${url}`);
  }

  console.log('\n[verify] body background CSS (mong đợi gold rgba, KHÔNG có rgba(46,117 hoặc 122c42):');
  r = await run(conn, `CSS=$(curl -sk "https://anticounterfeit.test9.io.vn/login" | grep -oE '/_next/static/chunks/[a-z0-9~_.-]+\\.css' | tail -1); curl -sk "https://anticounterfeit.test9.io.vn\${CSS}" -o /tmp/c.css; echo "Size: $(wc -c </tmp/c.css)"; echo "Has #0B1623: $(grep -o '#0B1623\\|#0b1623' /tmp/c.css | wc -l)"; echo "Has #122c42 OLD blue: $(grep -o '#122c42' /tmp/c.css | wc -l)"; echo "Has rgba(46,117 OLD: $(grep -o 'rgba(46,117' /tmp/c.css | wc -l)"; echo "Has rgba(200,165,87 GOLD: $(grep -o 'rgba(200,165,87' /tmp/c.css | wc -l)"`);
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
