const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');
const FILE = 'src/components/VietnamMap.tsx';

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
  const backupPath = `${REMOTE_ROOT}/_backups/VietnamMap.${stamp}.bak`;
  await run(conn, `cp ${REMOTE_ROOT}/${FILE} ${backupPath}`);

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  await new Promise((resolve, reject) => sftp.fastPut(path.join(LOCAL_VNTRUST, FILE), `${REMOTE_ROOT}/${FILE}`, e => e ? reject(e) : resolve()));
  console.log(`✓ ${FILE}`);

  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-6).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rollback');
    await run(conn, `cp ${backupPath} ${REMOTE_ROOT}/${FILE}`);
    conn.end(); process.exit(1);
  }
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0,3).join('\n'));
  conn.end();
  console.log(`✅ Backup: ${backupPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
