// Thêm NEXT_PUBLIC_VIETMAP_KEY vào prod .env + restart pm2
const { Client } = require('ssh2');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const ENV_PATH = '/var/www/vntrust/.env';
const KEY = '9fddd6cdd439433d034c55b26d07d9fbe5915a7ebfabd946';

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

  // Backup .env
  const stamp = Date.now();
  await run(conn, `cp ${ENV_PATH} ${ENV_PATH}.bak.${stamp}`);
  console.log(`[backup] ${ENV_PATH}.bak.${stamp}`);

  // Append the key (idempotent: remove old then add new)
  await run(conn, `sed -i '/^NEXT_PUBLIC_VIETMAP_KEY=/d' ${ENV_PATH}`);
  await run(conn, `echo '' >> ${ENV_PATH} && echo '# VietMap public client key (whitelist domain in console)' >> ${ENV_PATH} && echo 'NEXT_PUBLIC_VIETMAP_KEY=${KEY}' >> ${ENV_PATH}`);

  // Verify
  const v = await run(conn, `grep "^NEXT_PUBLIC_VIETMAP_KEY=" ${ENV_PATH} | awk -F= '{ print $1"=<set,len="length($2)">" }'`);
  console.log('[verify]', v.stdout.trim());

  conn.end();
  console.log('✅ Env set. Sẽ restart pm2 ở deploy bundle sau.');
}

main().catch(e => { console.error(e); process.exit(1); });
