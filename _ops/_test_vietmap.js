// Test VietMap API endpoints — gửi từ prod server với referer đúng
const { Client } = require('ssh2');

const HOST = '45.119.83.233', USER = 'root', PASS = 'Tailoc@2026';
const KEY = '9fddd6cdd439433d034c55b26d07d9fbe5915a7ebfabd946';
const REFERER = 'https://anticounterfeit.test9.io.vn/';

const URLS = [
  // Different VietMap style URL patterns to try
  `https://maps.vietmap.vn/api/maps/light/styles.json?apikey=${KEY}`,
  `https://maps.vietmap.vn/api/maps/dark/styles.json?apikey=${KEY}`,
  `https://maps.vietmap.vn/api/maps/raster/styles.json?apikey=${KEY}`,
  `https://maps.vietmap.vn/tm/style.json?apikey=${KEY}`,
  // Direct tile test
  `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${KEY}`.replace('{z}/{x}/{y}', '5/25/15'),
  `https://maps.vietmap.vn/api/maps/light/{z}/{x}/{y}.png?apikey=${KEY}`.replace('{z}/{x}/{y}', '5/25/15'),
];

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      stream.on('close', code => resolve({ code, stdout }))
        .on('data', d => stdout += d.toString());
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 10000 });
  });
  console.log('[ssh] connected (server-side test với referer header)\n');

  for (const url of URLS) {
    const cmd = `curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}b" -H "Referer: ${REFERER}" -H "Origin: https://anticounterfeit.test9.io.vn" "${url}"`;
    const r = await run(conn, cmd);
    console.log(r.stdout.trim().padEnd(40), '←', url.replace(KEY, '<KEY>').substring(0, 80));
  }
  conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
