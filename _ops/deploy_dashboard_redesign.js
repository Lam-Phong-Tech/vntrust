// Deploy dashboard main page redesign:
// - cyan radial glow → gold (như login)
// - thêm grid overlay subtle
// - font-headline (Manrope) → font-display (Fraunces) cho headlines

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILE = 'src/app/dashboard/page.tsx';

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

  // Backup
  const stamp = Date.now();
  const backupPath = `${REMOTE_ROOT}/_backups/dashboard_page.${stamp}.bak`;
  console.log(`[backup] ${backupPath}`);
  let r = await run(conn, `cp '${REMOTE_ROOT}/${FILE}' '${backupPath}'`);
  if (r.code !== 0) { console.error('backup failed:', r.stderr); conn.end(); process.exit(1); }

  // Upload
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  await new Promise((resolve, reject) => sftp.fastPut(path.join(LOCAL_VNTRUST, FILE), `${REMOTE_ROOT}/${FILE}`, e => e ? reject(e) : resolve()));
  console.log(`[sftp] uploaded ${FILE}`);

  // Build
  console.log('[build] npm run build...');
  r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-10).join('\n'));
  if (r.code !== 0) {
    console.error('❌ Build FAILED — rolling back');
    await run(conn, `cp '${backupPath}' '${REMOTE_ROOT}/${FILE}'`);
    conn.end(); process.exit(1);
  }

  // Restart
  console.log('[pm2] restarting vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 3).join('\n'));

  await new Promise(r => setTimeout(r, 2500));

  // Verify
  console.log('\n[verify] curl HTTPS public /dashboard ...');
  r = await run(conn, 'curl -sk -b "userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/dashboard" -o /tmp/d.html; echo "STATUS=$?"; echo "--- search markers ---"; grep -c "rgba(200,165,87,0.15)" /tmp/d.html; echo "gold glow occurrence count"; grep -c "font-display" /tmp/d.html; echo "font-display occurrence count"; grep -c "rgba(60,200,200" /tmp/d.html; echo "OLD cyan glow (should be 0)"');
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
