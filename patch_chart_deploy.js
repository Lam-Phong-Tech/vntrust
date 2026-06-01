const { Client } = require('ssh2');
const path = require('path');

const UPLOADS = [
  { local: 'src/app/supply-chain/page.tsx', remote: '/var/www/vntrust/src/app/supply-chain/page.tsx' },
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
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
      console.log(`Uploading [${i+1}/${UPLOADS.length}] ${local}...`);
      const remoteDir = path.dirname(remote).replace(/\\/g, '/');
      conn.exec(`mkdir -p "${remoteDir}"`, (err, s) => {
        s.on('close', () => {
          sftp.fastPut(path.join('D:/Web hang gia/vntrust', local), remote, (err) => {
            if (err) { console.error('Upload failed:', local, err); return; }
            uploadNext(i + 1);
          });
        }).on('data', () => {}).stderr.on('data', () => {});
      });
    };
    uploadNext(0);
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
