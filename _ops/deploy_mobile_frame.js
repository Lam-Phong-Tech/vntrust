// Deploy mobile-only frame layout (Flutter Web style)
// Files: ClientShell.tsx, MobileBottomNav.tsx, globals.css
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const FILES = [
  'src/components/ClientShell.tsx',
  'src/components/MobileBottomNav.tsx',
  'src/app/globals.css',
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
  const backupDir = `${REMOTE_ROOT}/_backups/mobile_frame.${stamp}`;
  await run(conn, `mkdir -p ${backupDir}`);
  for (const rel of FILES) {
    const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
    await run(conn, `[ -f '${REMOTE_ROOT}/${rel}' ] && cp '${REMOTE_ROOT}/${rel}' '${bkp}' || true`);
  }
  console.log(`[backup] ${backupDir}`);

  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    console.log(`✓ ${rel}`);
  }

  console.log('\n[build] npm run build...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-10).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rollback');
    for (const rel of FILES) {
      const bkp = `${backupDir}/${rel.replace(/[/\\]/g, '_')}`;
      await run(conn, `[ -f '${bkp}' ] && cp '${bkp}' '${REMOTE_ROOT}/${rel}'`);
    }
    conn.end(); process.exit(1);
  }

  console.log('[pm2] restart vntrust...');
  r = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r.stdout.split('\n').filter(l => l.includes('vntrust') || l.includes('Saving')).slice(0, 3).join('\n'));

  await new Promise(r => setTimeout(r, 2500));

  // Verify
  console.log('\n[verify] mobile-frame CSS class hiện diện?');
  r = await run(conn, `CSS=$(curl -sk "https://anticounterfeit.test9.io.vn/login" | grep -oE '/_next/static/chunks/[a-z0-9~_.-]+\\.css' | tail -1); curl -sk "https://anticounterfeit.test9.io.vn\${CSS}" -o /tmp/c.css; echo "Has .vntrust-mobile-frame: $(grep -o 'vntrust-mobile-frame' /tmp/c.css | wc -l)"; echo "Has --vntrust-frame-width: $(grep -o '\\-\\-vntrust-frame-width' /tmp/c.css | wc -l)"; echo "Has .mobile-top-bar in selectors: $(grep -o '\\.mobile-top-bar' /tmp/c.css | wc -l)"`);
  console.log(r.stdout);

  console.log('\n[verify] HTML có wrapper div class vntrust-mobile-frame?');
  r = await run(conn, 'curl -sk "https://anticounterfeit.test9.io.vn/login" | grep -o "vntrust-mobile-frame" | wc -l');
  console.log('  HTML wrapper hits: ' + r.stdout.trim());

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
