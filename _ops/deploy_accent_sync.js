// Deploy accent color sync (cyan/teal/blue/indigo → gold, emerald/green → verified)
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ROOT = '/var/www/vntrust';
const LOCAL_VNTRUST = path.resolve(__dirname, '../vntrust');

const RESULT = JSON.parse(fs.readFileSync(path.join(__dirname, 'transform_accent_result.json'), 'utf8'));
const FILES = RESULT.perFile.map(f => 'src/' + f.rel);

console.log(`[plan] ${FILES.length} files to deploy (${RESULT.totalChanges} total changes)`);

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
  const backupDir = `${REMOTE_ROOT}/_backups/accent_sync.${stamp}`;
  console.log(`[backup] ${backupDir}`);
  await run(conn, `mkdir -p ${backupDir}`);

  // Batch backup (limit per command)
  for (let i = 0; i < FILES.length; i += 5) {
    const batch = FILES.slice(i, i + 5);
    const cmds = batch.map(rel => `[ -f '${REMOTE_ROOT}/${rel}' ] && cp '${REMOTE_ROOT}/${rel}' '${backupDir}/${rel.replace(/[/\\]/g, '_')}'`).join(' ; ');
    await run(conn, cmds);
    process.stdout.write('.');
  }
  console.log(' backup OK');

  // Upload
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));
  for (const rel of FILES) {
    const local = path.join(LOCAL_VNTRUST, rel);
    const remote = `${REMOTE_ROOT}/${rel}`;
    await run(conn, `mkdir -p '${path.posix.dirname(remote)}'`);
    await new Promise((resolve, reject) => sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
    process.stdout.write(`✓ ${rel}\n`);
  }

  console.log('\n[build] npm run build...');
  let r = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(r.stdout.split('\n').slice(-10).join('\n'));
  if (r.code !== 0) {
    console.error('❌ build failed — rolling back ALL files from backup');
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
  console.log('\n[verify] curl /dashboard/inventory + grep cyan/teal/blue residue:');
  r = await run(conn, 'CSS=$(curl -sk https://anticounterfeit.test9.io.vn/login | grep -oE \'/_next/static/chunks/[a-z0-9~_-]+\\.css\' | head -1); curl -sk "https://anticounterfeit.test9.io.vn${CSS}" -o /tmp/c.css; echo "CSS size: $(wc -c </tmp/c.css)"; echo "C8A557 hits: $(grep -oc C8A557 /tmp/c.css)"; echo "6FB585 hits: $(grep -oc 6FB585 /tmp/c.css)"; echo "4A7C5C hits: $(grep -oc 4A7C5C /tmp/c.css)"');
  console.log(r.stdout);

  conn.end();
  console.log(`\n✅ [done] Backup: ${backupDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
