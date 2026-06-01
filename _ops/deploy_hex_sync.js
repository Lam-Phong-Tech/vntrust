// Deploy Phase 3.5: chỉ upload 10 file có hex change (backup + remote build + restart)
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const RESULT = JSON.parse(fs.readFileSync(path.join(__dirname, 'transform_hex_result.json'), 'utf8'));
const FILES = RESULT.perFile.filter(f => f.changes > 0).map(f => `src/app/dashboard/${f.rel}`);

console.log(`[plan] ${FILES.length} files to deploy`);

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
  const backupDir = `${REMOTE_ROOT}/_backups/hex_sync.${stamp}`;
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
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`✓ ${rel}`);
  }

  console.log('\n[build] remote npm run build...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  const buildOk = r.code === 0;
  console.log(r.stdout.split('\n').slice(-12).join('\n'));
  if (!buildOk) {
    console.error('\n❌ Build FAILED — rollback');
    for (const rel of FILES) {
      const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `[ -f '${bkp}' ] && cp '${bkp}' '${REMOTE_ROOT}/${rel}'`);
    }
    conn.end(); process.exit(1);
  }

  console.log('[pm2] restart vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 4).join('\n'));

  await new Promise(r => setTimeout(r, 2500));
  console.log('\n[verify] curl prod for canonical ink...');
  for (const slug of ['profile', 'kyc', 'alerts']) {
    r = await run(conn, `curl -sk -b "userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/dashboard/${slug}" | grep -oE "#0[Bb]1623|#142235|#0d1b2e|#0f1e33|#0a1628|#1a2235|#0d2040" | sort | uniq -c`);
    console.log(`  /dashboard/${slug}:`); console.log(r.stdout.split('\n').map(l => '    ' + l).join('\n'));
  }

  conn.end();
  console.log(`\n✅ [done] backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
