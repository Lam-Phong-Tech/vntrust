// Deploy Phase 3: sync theme dashboard (amber → gold, ink shade)
// Upload 20 patched dashboard pages, build trên VPS, restart vntrust nếu build OK.
// Pre-flight: backup tất cả file trên VPS trước khi đè.

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

// Đọc file kết quả của transform để biết file nào cần upload
const TRANSFORM_RESULT = JSON.parse(fs.readFileSync(path.join(__dirname, 'transform_theme_result.json'), 'utf8'));
const FILES = TRANSFORM_RESULT.perFile
  .filter(f => f.changes > 0)
  .map(f => `src/app/dashboard/${f.rel}`);

console.log(`[plan] ${FILES.length} files to deploy (>0 changes)`);

function run(conn, cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('close', (code) => resolve({ code, stdout, stderr }))
        .on('data', d => { const s = d.toString(); stdout += s; if (opts.stream) process.stdout.write(s); })
        .stderr.on('data', d => { const s = d.toString(); stderr += s; if (opts.stream) process.stderr.write(s); });
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

  // 1) Backup tất cả file trên VPS trước khi đè
  const stamp = Date.now();
  const backupDir = `${REMOTE_ROOT}/_backups/theme_sync.${stamp}`;
  console.log(`[backup] saving prod originals to ${backupDir}`);
  await run(conn, `mkdir -p ${backupDir}`);
  for (const rel of FILES) {
    const remoteFile = `${REMOTE_ROOT}/${rel}`;
    const backupFile = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
    let r = await run(conn, `[ -f '${remoteFile}' ] && cp '${remoteFile}' '${backupFile}' || echo "no original"`);
    process.stdout.write('.');
  }
  console.log('\n[backup] OK');

  // 2) SFTP upload các file đã patch
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    const parent = path.posix.dirname(remote);
    await run(conn, `mkdir -p '${parent}'`);
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    process.stdout.write(`✓ ${rel}\n`);
  }

  // 3) Remote build
  console.log('\n[build] cd /var/www/vntrust && npm run build (~30-60s)...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  const tail = r.stdout.split('\n').slice(-15).join('\n');
  console.log(tail);
  if (r.code !== 0) {
    console.error('\n❌ Build FAILED — rolling back ALL files from backup');
    for (const rel of FILES) {
      const remoteFile = `${REMOTE_ROOT}/${rel}`;
      const backupFile = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `[ -f '${backupFile}' ] && cp '${backupFile}' '${remoteFile}'`);
    }
    console.error('Rollback done. Vntrust will keep old .next build (not restarted).');
    conn.end();
    process.exit(1);
  }
  console.log('[build] ✓ OK');

  // 4) PM2 restart vntrust
  console.log('[pm2] restarting vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 5).join('\n'));

  // 5) Smoke verify
  await new Promise(r => setTimeout(r, 3000));
  console.log('\n[verify] checking dashboard pages return 200/3xx...');
  for (const rel of FILES.slice(0, 5)) {
    const url = rel
      .replace('src/app', '')
      .replace('/page.tsx', '')
      .replace(/\[id\]/g, 'TEST')
      .replace(/\[uid\]/g, 'TEST');
    r = await run(conn, `curl -sk -o /dev/null -w "%{http_code}" "https://anticounterfeit.test9.io.vn${url}"`);
    console.log(`  ${r.stdout}  ${url}`);
  }

  conn.end();
  console.log(`\n✅ [done] Phase 3 deployed. Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
