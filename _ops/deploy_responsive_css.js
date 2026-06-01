// Deploy responsive global CSS — chỉ 1 file globals.css (low risk)
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILE = 'src/app/globals.css';

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
  const backupPath = `${REMOTE_ROOT}/_backups/globals.css.${stamp}.bak`;
  console.log(`[backup] ${backupPath}`);
  let r = await run(conn, `mkdir -p ${REMOTE_ROOT}/_backups && cp '${REMOTE_ROOT}/${FILE}' '${backupPath}'`);
  if (r.code !== 0) { console.error('backup failed'); conn.end(); process.exit(1); }

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  await new Promise((resolve, reject) =>
    sftp.fastPut(path.join(LOCAL_VNTRUST, FILE), `${REMOTE_ROOT}/${FILE}`, e => e ? reject(e) : resolve()));
  console.log(`[sftp] uploaded ${FILE}`);

  console.log('\n[build] npm run build...');
  r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-10).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rollback');
    await run(conn, `cp '${backupPath}' '${REMOTE_ROOT}/${FILE}'`);
    conn.end(); process.exit(1);
  }

  console.log('[pm2] restart vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 3).join('\n'));

  await new Promise(r => setTimeout(r, 2500));

  // Verify
  console.log('\n[verify] curl /dashboard, đếm media query mới ...');
  r = await run(conn, 'curl -sk "https://anticounterfeit.test9.io.vn/dashboard" -o /tmp/d.html; echo "HTML bytes: $(wc -c < /tmp/d.html)"; echo "Stylesheets linked: $(grep -oE \'href=\\"[^\\"]+\\.css\' /tmp/d.html | head -3)"');
  console.log(r.stdout);

  // Verify by fetching the linked CSS file
  r = await run(conn, 'CSS_URL=$(curl -sk "https://anticounterfeit.test9.io.vn/dashboard" | grep -oE \'/_next/static/css/[a-z0-9]+\\.css\' | head -1); echo "Loading: $CSS_URL"; curl -sk "https://anticounterfeit.test9.io.vn${CSS_URL}" -o /tmp/c.css; echo "CSS bytes: $(wc -c < /tmp/c.css)"; echo "Media (max-width:767px) hits: $(grep -c "max-width:767px\\|max-width: 767px" /tmp/c.css)"');
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
