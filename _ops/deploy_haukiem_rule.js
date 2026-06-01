// Deploy Phase 5: Hậu kiểm Rule Engine
// 1) Backup prisma/dev.db + 5 source files
// 2) Upload schema.prisma, route.ts, hauKiemRule.ts
// 3) Remote: prisma generate + prisma db push (schema migration)
// 4) Remote: npm run build
// 5) PM2 restart vntrust
// 6) Verify: GET /api/standards (should return empty array, not 404)

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
  'src/app/api/haukiem/route.ts',
  'src/app/api/standards/route.ts',
  'src/app/api/standards/seed/route.ts',
  'src/lib/hauKiemRule.ts',
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
  const backupDir = `${REMOTE_ROOT}/_backups/haukiem_rule.${stamp}`;
  console.log(`[backup] ${backupDir}`);
  await run(conn, `mkdir -p ${backupDir}`);

  // Backup DB
  await run(conn, `cp ${REMOTE_ROOT}/dev.db ${backupDir}/dev.db.bak`);
  console.log('  ✓ dev.db backed up');

  // Backup source files
  for (const rel of FILES) {
    const remote = `${REMOTE_ROOT}/${rel}`;
    const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
    await run(conn, `[ -f '${remote}' ] && cp '${remote}' '${bkp}' || echo "(new file)"`);
  }

  // Upload
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    await run(conn, `mkdir -p '${path.posix.dirname(remote)}'`);
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`✓ ${rel}`);
  }

  // Prisma generate + db push
  console.log('\n[prisma] generate + db push (schema migration)...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npx prisma generate 2>&1 | tail -5 && npx prisma db push 2>&1 | tail -5`);
  console.log(r.stdout);
  if (r.code !== 0) {
    console.error('❌ prisma migration failed — rollback');
    await run(conn, `cp ${backupDir}/dev.db.bak ${REMOTE_ROOT}/dev.db`);
    for (const rel of FILES) {
      const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `[ -f '${bkp}' ] && cp '${bkp}' '${REMOTE_ROOT}/${rel}' || rm '${REMOTE_ROOT}/${rel}' 2>/dev/null`);
    }
    conn.end(); process.exit(1);
  }

  // Next.js build
  console.log('[build] npm run build...');
  r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-12).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rolling back code (schema kept)');
    for (const rel of FILES) {
      const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `[ -f '${bkp}' ] && cp '${bkp}' '${REMOTE_ROOT}/${rel}' || rm '${REMOTE_ROOT}/${rel}' 2>/dev/null`);
    }
    conn.end(); process.exit(1);
  }

  // PM2 restart
  console.log('[pm2] restart vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 3).join('\n'));

  await new Promise(r => setTimeout(r, 3000));

  // Verify
  console.log('\n[verify] GET /api/standards (should return 200 with empty array)');
  r = await run(conn, 'curl -sk -w "STATUS:%{http_code}\\n" "https://anticounterfeit.test9.io.vn/api/standards"');
  console.log(r.stdout);

  console.log('[verify] POST /api/standards/seed as admin (seed initial data)');
  r = await run(conn, 'curl -sk -X POST -H "Cookie: userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/api/standards/seed"');
  console.log(r.stdout);

  console.log('[verify] GET /api/standards?nhomSanPham=Rau củ');
  r = await run(conn, `curl -sk "https://anticounterfeit.test9.io.vn/api/standards?nhomSanPham=Rau%20c%E1%BB%A7" | head -c 600`);
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
