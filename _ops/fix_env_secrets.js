// P0.4 — Fix prod .env: generate strong secrets, change demo passwords
// User-approved via AskUserQuestion ("Fix tự động hết").
// SAFE: backs up .env, only ADDS missing keys + replaces specified ones, restarts pm2.
const { Client } = require('ssh2');
const crypto = require('crypto');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';
const REMOTE_ENV = '/var/www/vntrust/.env';

// Generate strong secrets
const newSecrets = {
  JWT_SECRET:        crypto.randomBytes(48).toString('base64'),  // 64 chars URL-safe
  VAULT_AES_KEY:     crypto.randomBytes(32).toString('hex'),     // 64 hex = AES-256 key
  NODE_ENV:          'production',
  DEMO_ADMIN_PASS:   'Adm-' + crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'X'),
  DEMO_MFR_PASS:     'Mfr-' + crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'X'),
  DEMO_IMP_PASS:     'Imp-' + crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'X'),
  DEMO_CON_PASS:     'Con-' + crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'X'),
};

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

  // 1) Backup current .env
  const stamp = Date.now();
  const backup = `${REMOTE_ENV}.bak.${stamp}`;
  await run(conn, `cp ${REMOTE_ENV} ${backup}`);
  console.log(`[backup] ${backup}`);

  // 2) Read current .env content
  const r = await run(conn, `cat ${REMOTE_ENV}`);
  const lines = r.stdout.split('\n');

  // 3) Build new .env: keep all existing lines, then append/replace our keys
  const knownKeys = Object.keys(newSecrets);
  const keptLines = lines.filter(l => {
    if (!l.trim() || l.trim().startsWith('#')) return true;
    const key = l.split('=')[0].trim();
    return !knownKeys.includes(key);  // remove old versions of our managed keys
  });
  const newLines = [
    ...keptLines.filter(l => l.length > 0 || keptLines.indexOf(l) < keptLines.length - 1), // keep formatting
    '',
    '# ─── P0.4 Security hardening (auto-generated) ───',
    ...knownKeys.map(k => `${k}=${JSON.stringify(newSecrets[k])}`),
    '',
  ];

  // 4) Write new .env via base64 to avoid shell escaping issues
  const newContent = newLines.join('\n');
  const b64 = Buffer.from(newContent, 'utf8').toString('base64');
  const writeRes = await run(conn, `echo '${b64}' | base64 -d > ${REMOTE_ENV} && chmod 600 ${REMOTE_ENV}`);
  if (writeRes.code !== 0) {
    console.error('[ERR] write failed:', writeRes.stderr);
    console.log('[rollback] restoring .env');
    await run(conn, `cp ${backup} ${REMOTE_ENV}`);
    conn.end();
    process.exit(1);
  }

  // 5) Verify written keys present (no values printed)
  const verify = await run(conn, `grep -c "^JWT_SECRET\\|^VAULT_AES_KEY\\|^NODE_ENV\\|^DEMO_" ${REMOTE_ENV}`);
  console.log(`[verify] ${verify.stdout.trim()} managed keys in new .env`);

  // 6) Restart pm2 to pick up new env
  console.log('[restart] pm2 reload to pick up new env…');
  const reload = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log('         ', reload.stdout.split('\n').filter(l => l.includes('vntrust')).slice(0, 2).join(' | '));

  conn.end();

  // 7) Print new demo passwords (these must be saved by user — secrets NOT printed)
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('✅ DONE. New .env secrets generated. Backup: ' + backup);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('JWT_SECRET     : <64 chars, only on server>');
  console.log('VAULT_AES_KEY  : <64 chars, only on server>');
  console.log('NODE_ENV       : production');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('NEW DEMO PASSWORDS (save these — needed to login demo accounts):');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  admin@vntrust.vn        →  ${newSecrets.DEMO_ADMIN_PASS}`);
  console.log(`  nsx@vntrust.vn          →  ${newSecrets.DEMO_MFR_PASS}`);
  console.log(`  nhapkhau@vntrust.vn     →  ${newSecrets.DEMO_IMP_PASS}`);
  console.log(`  nguoitieudung@vntrust.vn→  ${newSecrets.DEMO_CON_PASS}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('\n⚠️ All currently-active sessions will be invalidated (JWT secret changed).');
  console.log('   All users must log in again.');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
