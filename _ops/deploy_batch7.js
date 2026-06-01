// Deploy Batch 7: escalate cron + daily digest + Trust Score weights + 4 loại phản ánh
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
  'src/app/api/cron/escalate/route.ts',
  'src/app/api/cron/daily-digest/route.ts',
  'src/app/api/trust-score/[uid]/route.ts',
  'src/app/api/report/route.ts',
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
  const backupDir = `${REMOTE_ROOT}/_backups/batch7.${stamp}`;
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

  console.log('\n[verify] endpoints mới:');
  for (const url of [
    '/api/cron/escalate?secret=vntrust-cron-key',
    '/api/cron/daily-digest?secret=vntrust-cron-key&dryRun=1',
    '/api/trust-score/test-fake-uid',
  ]) {
    r = await run(conn, `curl -sk -o /tmp/out.json -w "%{http_code}" "https://anticounterfeit.test9.io.vn${url}"`);
    console.log(`  ${r.stdout}  ${url}`);
  }

  console.log('\n[verify] daily-digest dryRun output:');
  r = await run(conn, 'curl -sk "https://anticounterfeit.test9.io.vn/api/cron/daily-digest?secret=vntrust-cron-key&dryRun=1" | head -c 600');
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
