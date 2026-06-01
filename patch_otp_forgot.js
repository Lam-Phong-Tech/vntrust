const { Client } = require('ssh2');
const path = require('path');

const UPLOADS = [
  { local: 'src/app/login/page.tsx',                          remote: '/var/www/vntrust/src/app/login/page.tsx' },
  { local: 'src/app/api/auth/send-otp/route.ts',              remote: '/var/www/vntrust/src/app/api/auth/send-otp/route.ts' },
  { local: 'src/app/api/auth/verify-otp/route.ts',            remote: '/var/www/vntrust/src/app/api/auth/verify-otp/route.ts' },
  { local: 'src/app/api/auth/reset-password/route.ts',        remote: '/var/www/vntrust/src/app/api/auth/reset-password/route.ts' },
];

// Cập nhật .env trên server với Gmail credentials
const ENV_APPEND = `
GMAIL_USER="vntrustsystem@gmail.com"
GMAIL_APP_PASSWORD="your_app_password_here"
`;

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
        console.log('All uploads done!');
        // Install nodemailer on server + rebuild
        const cmds = [
          'cd /var/www/vntrust',
          'npm install nodemailer --legacy-peer-deps',
          'npm run build 2>&1',
          'pm2 restart vntrust',
          'pm2 status',
          'echo "=== DONE ==="'
        ].join(' && ');
        conn.exec(cmds, (err, stream) => {
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
