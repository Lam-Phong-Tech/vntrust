const { Client } = require('ssh2');
const path = require('path');

const UPLOADS = [
  { local: 'src/contexts/LanguageContext.tsx',      remote: '/var/www/vntrust/src/contexts/LanguageContext.tsx' },
  { local: 'src/app/dashboard/security/page.tsx',   remote: '/var/www/vntrust/src/app/dashboard/security/page.tsx' },
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const uploadNext = (i) => {
      if (i >= UPLOADS.length) {
        console.log('All uploads done! Rebuilding...');
        conn.exec('cd /var/www/vntrust && npm run build 2>&1 && pm2 restart vntrust && echo "=== DONE ==="', (err, stream) => {
          if (err) throw err;
          stream.on('close', () => { conn.end(); process.exit(0); })
                .on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
        });
        return;
      }
      const { local, remote } = UPLOADS[i];
      console.log(`[${i+1}/${UPLOADS.length}] Uploading ${local}...`);
      sftp.fastPut(path.join('D:/Web hang gia/vntrust', local), remote, (err) => {
        if (err) { console.error('Failed:', err); return; }
        uploadNext(i + 1);
      });
    };
    uploadNext(0);
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
