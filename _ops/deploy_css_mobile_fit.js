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
  const backupPath = `${REMOTE_ROOT}/_backups/globals_mobile_fit.${stamp}.bak`;
  await run(conn, `mkdir -p ${REMOTE_ROOT}/_backups && cp ${REMOTE_ROOT}/${FILE} ${backupPath}`);
  console.log(`[backup] ${backupPath}`);

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  await new Promise((resolve, reject) => sftp.fastPut(path.join(LOCAL_VNTRUST, FILE), `${REMOTE_ROOT}/${FILE}`, e => e ? reject(e) : resolve()));
  console.log(`✓ ${FILE}`);

  console.log('\n[build] npm run build...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-8).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rollback');
    await run(conn, `cp ${backupPath} ${REMOTE_ROOT}/${FILE}`);
    conn.end(); process.exit(1);
  }

  console.log('[pm2] restart vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 3).join('\n'));

  await new Promise(r => setTimeout(r, 2500));

  console.log('\n[verify] CSS bundle có max-width:480 media query?');
  r = await run(conn, `CSS=$(curl -sk "https://anticounterfeit.test9.io.vn/login" | grep -oE '/_next/static/chunks/[a-z0-9~_.-]+\\.css' | tail -1); curl -sk "https://anticounterfeit.test9.io.vn\${CSS}" -o /tmp/c.css; echo "Has max-width:480px: $(grep -oc 'max-width:480px' /tmp/c.css)"; echo "Has max-width:360px: $(grep -oc 'max-width:360px' /tmp/c.css)"; echo "Has grid-cols-2 1fr rule: $(grep -c 'grid-cols-2.*1fr' /tmp/c.css)"`);
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
