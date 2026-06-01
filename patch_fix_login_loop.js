const { Client } = require('ssh2');
const path = require('path');

const UPLOADS = [
  { local: 'src/app/login/page.tsx',               remote: '/var/www/vntrust/src/app/login/page.tsx' },
  { local: 'src/app/dashboard/page.tsx',            remote: '/var/www/vntrust/src/app/dashboard/page.tsx' },
  { local: 'src/app/api/auth/logout/route.ts',      remote: '/var/www/vntrust/src/app/api/auth/logout/route.ts' },
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;

    const ensureDir = (remotePath, cb) => {
      conn.exec(`mkdir -p "${remotePath}"`, (err, stream) => {
        if (err) return cb(err);
        stream.on('close', () => cb(null));
        stream.resume();
      });
    };

    const uploadNext = (i) => {
      if (i >= UPLOADS.length) {
        console.log('All uploads done! Rebuilding...');
        conn.exec('cd /var/www/vntrust && npm run build 2>&1 && pm2 restart vntrust && pm2 status && echo "=== DONE ==="', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code) => { console.log('Exit:', code); conn.end(); process.exit(0); })
                .on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
        });
        return;
      }
      const { local, remote } = UPLOADS[i];
      const remoteDir = remote.split('/').slice(0, -1).join('/');
      console.log(`Uploading [${i+1}/${UPLOADS.length}] ${local}...`);
      ensureDir(remoteDir, () => {
        sftp.fastPut(path.join('D:/Web hang gia/vntrust', local), remote, (err) => {
          if (err) { console.error('Upload failed:', local, err); return; }
          uploadNext(i + 1);
        });
      });
    };
    uploadNext(0);
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
