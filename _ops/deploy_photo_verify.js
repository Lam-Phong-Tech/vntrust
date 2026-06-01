// Sprint 13 — Deploy AI Photo Verify page + result page nav link + CSS
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILES = [
  // NEW: AI photo verify page
  'src/app/verify/[uid]/photo/page.tsx',
  // UPDATED: nav link + CSS for s-ai-scan-cta
  'src/app/verify/[uid]/page.tsx',
  'src/app/verify/[uid]/result.css',
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
  // Sanity: ensure all local files exist before touching prod
  for (const rel of FILES) {
    const full = path.join(LOCAL_VNTRUST, rel);
    if (!fs.existsSync(full)) {
      console.error(`[ERR] Missing local file: ${full}`);
      process.exit(1);
    }
  }

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 10000 });
  });
  console.log('[ssh] connected');

  const stamp = Date.now();
  const backupDir = `${REMOTE_ROOT}/_backups/photo_verify.${stamp}`;
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
  console.log(r.stdout.split('\n').slice(-15).join('\n'));
  if (r.code !== 0) {
    console.error('[BUILD FAILED] rolling back…');
    for (const rel of FILES) {
      await run(conn, `cp '${backupDir}/${rel.replace(/[/\\]/g, '_')}' '${REMOTE_ROOT}/${rel}' || true`);
    }
    conn.end(); process.exit(1);
  }

  const r2 = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r2.stdout.split('\n').filter(l => l.includes('vntrust')).slice(0, 3).join('\n'));
  conn.end();
  console.log(`✅ Done. Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
