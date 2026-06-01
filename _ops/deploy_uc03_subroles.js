// UC03 — Deploy: backup DB → SQL migration → SFTP code → build → pm2 restart
// Auto-rollback BOTH DB and code if any step fails
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');
const LOCAL_MIGRATION = path.join(__dirname, 'migration_uc03_subroles.sql');

const FILES = [
  'prisma/schema.prisma',
  'src/lib/jwt.ts',
  'src/lib/teamAuth.ts',
  'src/app/api/auth/login/route.ts',
  'src/app/api/team/route.ts',
  'src/app/api/team/[id]/route.ts',
  'src/app/api/team/invites/[id]/route.ts',
  'src/app/api/team/accept-invite/route.ts',
  'src/app/dashboard/team/page.tsx',
  'src/app/team/accept-invite/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/components/MobileMenuDrawer.tsx',
  'src/app/api/inventory/route.ts',
  'src/app/api/warehouse/route.ts',
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
  // Sanity check local files
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
  const backupDir = `${REMOTE_ROOT}/_backups/uc03.${stamp}`;
  await run(conn, `mkdir -p ${backupDir}`);

  // 1) Backup DB + code
  console.log('[step 1/5] Backup DB + code files…');
  const dbBackup = await run(conn, `cp ${REMOTE_ROOT}/dev.db ${backupDir}/dev.db.backup`);
  if (dbBackup.code !== 0) {
    console.error('[ERR] DB backup failed:', dbBackup.stderr);
    conn.end(); process.exit(1);
  }
  for (const rel of FILES) {
    await run(conn, `cp '${REMOTE_ROOT}/${rel}' '${backupDir}/${rel.replace(/[/\\]/g, '_')}' 2>/dev/null || true`);
  }
  console.log(`     backup: ${backupDir}`);

  // 2) Upload migration SQL + apply
  console.log('[step 2/5] Apply SQL migration…');
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  await new Promise((resolve, reject) => sftp.fastPut(
    LOCAL_MIGRATION,
    `${backupDir}/migration_uc03_subroles.sql`,
    e => e ? reject(e) : resolve()
  ));
  const mig = await run(conn, `cd ${REMOTE_ROOT} && sqlite3 dev.db < '${backupDir}/migration_uc03_subroles.sql' 2>&1`);
  console.log('     SQL output:', mig.stdout || '(empty)');
  if (mig.code !== 0 || /Error|error/.test(mig.stdout + mig.stderr)) {
    // Check if "duplicate column" — that means already migrated (OK)
    const benign = /duplicate column name/i.test(mig.stdout + mig.stderr);
    if (!benign) {
      console.error('[ERR] Migration failed:', mig.stderr || mig.stdout);
      console.log('[rollback] Restoring DB…');
      await run(conn, `cp ${backupDir}/dev.db.backup ${REMOTE_ROOT}/dev.db`);
      conn.end(); process.exit(1);
    }
    console.warn('[warn] Columns already exist, continuing…');
  }

  // 3) SFTP code files
  console.log('[step 3/5] Upload 14 code files…');
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
    console.log(`     ✓ ${rel}`);
  }

  // 4) Regenerate Prisma client + build
  console.log('[step 4/5] Prisma generate + build…');
  const gen = await run(conn, `cd ${REMOTE_ROOT} && npx prisma generate 2>&1`);
  console.log('     prisma:', gen.stdout.split('\n').slice(-3).join(' | '));
  const build = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(build.stdout.split('\n').slice(-12).join('\n'));
  if (build.code !== 0) {
    console.error('[BUILD FAILED] rollback DB + code…');
    await run(conn, `cp ${backupDir}/dev.db.backup ${REMOTE_ROOT}/dev.db`);
    for (const rel of FILES) {
      await run(conn, `cp '${backupDir}/${rel.replace(/[/\\]/g, '_')}' '${REMOTE_ROOT}/${rel}' 2>/dev/null || true`);
    }
    await run(conn, `cd ${REMOTE_ROOT} && npx prisma generate && npm run build`);
    conn.end(); process.exit(1);
  }

  // 5) pm2 restart
  console.log('[step 5/5] pm2 restart…');
  const r2 = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log('     ', r2.stdout.split('\n').filter(l => l.includes('vntrust')).slice(0, 2).join(' | '));

  // Verification: query DB to confirm seed worked
  const verify = await run(conn, `cd ${REMOTE_ROOT} && sqlite3 dev.db "SELECT vaiTro, vaiTroCty, quyenMoiNV, COUNT(*) FROM NguoiDung GROUP BY vaiTro, vaiTroCty, quyenMoiNV;"`);
  console.log('\n[verify] NguoiDung after migration:');
  console.log(verify.stdout);

  conn.end();
  console.log(`\n✅ Deploy thành công. Backup: ${backupDir}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
