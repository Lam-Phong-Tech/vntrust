// Batch 1+2: badge wrap + verify-image hinhAnhUrl + AI cosine sim 2 vectors
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILES = [
  'src/app/dashboard/inventory/page.tsx',
  'src/app/api/verify-image/route.ts',
  'src/app/verify/[uid]/photo/page.tsx',
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
  for (const rel of FILES) {
    if (!fs.existsSync(path.join(LOCAL_VNTRUST, rel))) {
      console.error(`[ERR] Missing: ${rel}`); process.exit(1);
    }
  }
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 10000 });
  });
  console.log('[ssh] connected');

  const stamp = Date.now();
  const backupDir = `${REMOTE_ROOT}/_backups/batch12.${stamp}`;
  await run(conn, `mkdir -p ${backupDir}`);
  for (const rel of FILES) {
    await run(conn, `cp '${REMOTE_ROOT}/${rel}' '${backupDir}/${rel.replace(/[/\\]/g, '_')}' || true`);
  }

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const dir = path.posix.dirname(rel);
    await run(conn, `mkdir -p '${REMOTE_ROOT}/${dir}'`);
  }
  for (const rel of FILES) {
    await new Promise((resolve, reject) => sftp.fastPut(
      path.join(LOCAL_VNTRUST, rel),
      `${REMOTE_ROOT}/${rel}`,
      e => e ? reject(e) : resolve()
    ));
    console.log(`✓ ${rel}`);
  }

  console.log('[build]...');
  const r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-10).join('\n'));
  if (r.code !== 0) {
    console.error('[BUILD FAILED] rolling back…');
    for (const rel of FILES) {
      await run(conn, `cp '${backupDir}/${rel.replace(/[/\\]/g, '_')}' '${REMOTE_ROOT}/${rel}' || true`);
    }
    conn.end(); process.exit(1);
  }

  const r2 = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r2.stdout.split('\n').filter(l => l.includes('vntrust')).slice(0, 2).join('\n'));
  conn.end();
  console.log(`✅ Done. Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
