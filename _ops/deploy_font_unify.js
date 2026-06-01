// Deploy: replace font-headline → font-display trên 27 file
// Backup + SFTP + remote build + restart

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILES = [
  'src/app/dashboard/alerts/page.tsx',
  'src/app/dashboard/analytics/page.tsx',
  'src/app/dashboard/certificates/page.tsx',
  'src/app/dashboard/compliance/page.tsx',
  'src/app/dashboard/create/page.tsx',
  'src/app/dashboard/distribution/page.tsx',
  'src/app/dashboard/glossary/page.tsx',
  'src/app/dashboard/haukiem/page.tsx',
  'src/app/dashboard/history/page.tsx',
  'src/app/dashboard/integration/page.tsx',
  'src/app/dashboard/inventory/page.tsx',
  'src/app/dashboard/kyc/page.tsx',
  'src/app/dashboard/readiness/page.tsx',
  'src/app/dashboard/report/page.tsx',
  'src/app/dashboard/risks/page.tsx',
  'src/app/dashboard/roadmap/page.tsx',
  'src/app/dashboard/security/page.tsx',
  'src/app/dashboard/warehouse/page.tsx',
  'src/app/enterprise/page.tsx',
  'src/app/forgot-password/page.tsx',
  'src/app/supply-chain/page.tsx',
  'src/app/verify/ai-doc/page.tsx',
  'src/app/verify/manual/page.tsx',
  'src/app/verify/page.tsx',
  'src/components/BottomSheetModal.tsx',
  'src/components/Footer.tsx',
  'src/components/Navbar.tsx',
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
  const backupDir = `${REMOTE_ROOT}/_backups/font_unify.${stamp}`;
  console.log(`[backup] ${backupDir}`);
  await run(conn, `mkdir -p ${backupDir}`);
  for (const rel of FILES) {
    const remote = `${REMOTE_ROOT}/${rel}`;
    const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
    await run(conn, `[ -f '${remote}' ] && cp '${remote}' '${bkp}'`);
    process.stdout.write('.');
  }
  console.log(' backup OK\n');

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    const parent = path.posix.dirname(remote);
    await run(conn, `mkdir -p '${parent}'`);
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`✓ ${rel}`);
  }

  console.log('\n[build] npm run build...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-10).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rolling back');
    for (const rel of FILES) {
      const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `[ -f '${bkp}' ] && cp '${bkp}' '${REMOTE_ROOT}/${rel}'`);
    }
    conn.end(); process.exit(1);
  }

  console.log('[pm2] restart vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0,3).join('\n'));

  await new Promise(r => setTimeout(r, 2500));
  console.log('\n[verify] count font-display vs font-headline in /dashboard HTML:');
  r = await run(conn, 'curl -sk -b "userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/dashboard" -o /tmp/d.html; echo "font-display: $(grep -o font-display /tmp/d.html | wc -l)"; echo "font-headline: $(grep -o font-headline /tmp/d.html | wc -l)"');
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
