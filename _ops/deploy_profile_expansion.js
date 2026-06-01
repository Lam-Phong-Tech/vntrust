// Batch 3 deploy: profile schema migration + PATCH /api/auth/me + avatar upload + UI fields
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');
const LOCAL_MIGRATION = path.join(__dirname, 'migration_profile_fields.sql');

const FILES = [
  'prisma/schema.prisma',
  'src/app/api/auth/me/route.ts',
  'src/app/api/upload/route.ts',
  'src/app/dashboard/profile/page.tsx',
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
  if (!fs.existsSync(LOCAL_MIGRATION)) {
    console.error(`[ERR] Missing migration SQL`); process.exit(1);
  }

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 10000 });
  });
  console.log('[ssh] connected');

  const stamp = Date.now();
  const backupDir = `${REMOTE_ROOT}/_backups/profile_exp.${stamp}`;
  await run(conn, `mkdir -p ${backupDir}`);

  // 1) Backup DB + files
  console.log('[1/5] Backup DB + files…');
  await run(conn, `cp ${REMOTE_ROOT}/dev.db ${backupDir}/dev.db.backup`);
  for (const rel of FILES) {
    await run(conn, `cp '${REMOTE_ROOT}/${rel}' '${backupDir}/${rel.replace(/[/\\]/g, '_')}' || true`);
  }

  // 2) Apply SQL migration
  console.log('[2/5] Apply SQL migration…');
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  await new Promise((resolve, reject) => sftp.fastPut(
    LOCAL_MIGRATION, `${backupDir}/migration_profile_fields.sql`,
    e => e ? reject(e) : resolve()
  ));
  const mig = await run(conn, `cd ${REMOTE_ROOT} && sqlite3 dev.db < '${backupDir}/migration_profile_fields.sql' 2>&1`);
  console.log('    SQL:', mig.stdout || '(empty)');
  if (mig.code !== 0 && !/duplicate column name/i.test(mig.stdout + mig.stderr)) {
    console.error('[ERR] Migration failed:', mig.stderr || mig.stdout);
    console.log('[rollback] Restoring DB…');
    await run(conn, `cp ${backupDir}/dev.db.backup ${REMOTE_ROOT}/dev.db`);
    conn.end(); process.exit(1);
  }

  // 3) Create avatars upload dir
  console.log('[3/5] mkdir public/uploads/avatars…');
  await run(conn, `mkdir -p ${REMOTE_ROOT}/public/uploads/avatars && chmod 755 ${REMOTE_ROOT}/public/uploads/avatars`);

  // 4) SFTP files
  console.log('[4/5] Upload files…');
  for (const rel of FILES) {
    const dir = path.posix.dirname(rel);
    await run(conn, `mkdir -p '${REMOTE_ROOT}/${dir}'`);
  }
  for (const rel of FILES) {
    await new Promise((resolve, reject) => sftp.fastPut(
      path.join(LOCAL_VNTRUST, rel), `${REMOTE_ROOT}/${rel}`,
      e => e ? reject(e) : resolve()
    ));
    console.log(`    ✓ ${rel}`);
  }

  // 5) Prisma generate + build + restart
  console.log('[5/5] Prisma + build + pm2…');
  const gen = await run(conn, `cd ${REMOTE_ROOT} && npx prisma generate 2>&1`);
  console.log('    prisma:', gen.stdout.split('\n').slice(-2).join(' | '));
  const build = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(build.stdout.split('\n').slice(-10).join('\n'));
  if (build.code !== 0) {
    console.error('[BUILD FAILED] rollback DB + code…');
    await run(conn, `cp ${backupDir}/dev.db.backup ${REMOTE_ROOT}/dev.db`);
    for (const rel of FILES) {
      await run(conn, `cp '${backupDir}/${rel.replace(/[/\\]/g, '_')}' '${REMOTE_ROOT}/${rel}' || true`);
    }
    await run(conn, `cd ${REMOTE_ROOT} && npx prisma generate && npm run build`);
    conn.end(); process.exit(1);
  }
  const r2 = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log('    ', r2.stdout.split('\n').filter(l => l.includes('vntrust')).slice(0, 2).join(' | '));

  // Verify DB columns
  const verify = await run(conn, `cd ${REMOTE_ROOT} && sqlite3 dev.db ".schema NguoiDung" | head -20`);
  console.log('\n[verify] NguoiDung schema:');
  console.log(verify.stdout);

  conn.end();
  console.log(`\n✅ Deploy thành công. Backup: ${backupDir}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
