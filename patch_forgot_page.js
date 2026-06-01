const { Client } = require('ssh2');
const path = require('path');

const UPLOADS = [
  { local: 'src/app/login/page.tsx',                    remote: '/var/www/vntrust/src/app/login/page.tsx' },
  { local: 'src/app/forgot-password/page.tsx',          remote: '/var/www/vntrust/src/app/forgot-password/page.tsx' },
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const ensureDir = (p, cb) => conn.exec(`mkdir -p "${p}"`, (e, s) => { if (e) return cb(e); s.on('close', () => cb(null)).resume(); });
    const uploadNext = (i) => {
      if (i >= UPLOADS.length) {
        console.log('Uploaded! Building...');
        conn.exec('cd /var/www/vntrust && npm run build 2>&1 && pm2 restart vntrust --update-env && echo "=== DONE ==="', (err, stream) => {
          if (err) throw err;
          stream.on('close', code => { console.log('Exit:', code); conn.end(); process.exit(0); })
                .on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
        });
        return;
      }
      const { local, remote } = UPLOADS[i];
      const dir = remote.split('/').slice(0, -1).join('/');
      console.log(`[${i+1}/${UPLOADS.length}] ${local}`);
      ensureDir(dir, () => sftp.fastPut(path.join('D:/Web hang gia/vntrust', local), remote, e => {
        if (e) { console.error('FAIL:', e); return; }
        uploadNext(i + 1);
      }));
    };
    uploadNext(0);
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
