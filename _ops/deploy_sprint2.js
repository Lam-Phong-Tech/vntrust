const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILES = [
  // A1: alerts API filter
  'src/app/api/alerts/route.ts',
  // A2: gov-integration 3 new entries (+ dependency)
  'src/lib/integrationChecker.ts',
  'src/app/api/gov-integration/route.ts',
  // A3 + report layout
  'src/app/dashboard/report/page.tsx',
  'src/app/supply-chain/page.tsx',
  'src/contexts/LanguageContext.tsx',
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
  const backupDir = `${REMOTE_ROOT}/_backups/sprint2.${stamp}`;
  await run(conn, `mkdir -p ${backupDir}`);
  for (const rel of FILES) {
    const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
    await run(conn, `cp '${REMOTE_ROOT}/${rel}' '${bkp}' || true`);
  }
  console.log(`[backup] ${backupDir}`);

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  // Ensure remote directories exist
  for (const rel of FILES) {
    const dir = path.posix.dirname(rel);
    await run(conn, `mkdir -p '${REMOTE_ROOT}/${dir}'`);
  }
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`✓ ${rel}`);
  }

  console.log('[build] starting...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-15).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rollback');
    for (const rel of FILES) {
      const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `cp '${bkp}' '${REMOTE_ROOT}/${rel}'`);
    }
    conn.end(); process.exit(1);
  }

  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0,3).join('\n'));

  conn.end();
  console.log(`✅ Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
