const { Client } = require('ssh2');
const path = require('path');

const UPLOADS = [
  { local: 'src/app/api/auth/send-otp/route.ts',    remote: '/var/www/vntrust/src/app/api/auth/send-otp/route.ts' },
  { local: 'src/app/api/auth/verify-otp/route.ts',  remote: '/var/www/vntrust/src/app/api/auth/verify-otp/route.ts' },
  { local: 'src/lib/otpStore.ts',                    remote: '/var/www/vntrust/src/lib/otpStore.ts' },
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;

    const ensureDir = (remotePath, cb) => {
      conn.exec(`mkdir -p "${remotePath}"`, (err, stream) => {
        if (err) return cb(err);
        stream.on('close', () => cb(null)).resume();
      });
    };

    const uploadNext = (i) => {
      if (i >= UPLOADS.length) {
        console.log('All uploads done! Building...');
        conn.exec('cd /var/www/vntrust && npm run build 2>&1 && pm2 restart vntrust --update-env && echo "=== DONE ==="', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code) => { console.log('Exit:', code); conn.end(); process.exit(0); })
                .on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
        });
        return;
      }
      const { local, remote } = UPLOADS[i];
      const remoteDir = remote.split('/').slice(0, -1).join('/');
      console.log(`[${i+1}/${UPLOADS.length}] ${local}...`);
      ensureDir(remoteDir, () => {
        sftp.fastPut(path.join('D:/Web hang gia/vntrust', local), remote, (err) => {
          if (err) { console.error('Failed:', err); return; }
          uploadNext(i + 1);
        });
      });
    };
    uploadNext(0);
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
