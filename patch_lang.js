const { Client } = require('ssh2');
const path = require('path');

const UPLOADS = [
  { local: 'src/contexts/LanguageContext.tsx', remote: '/var/www/vntrust/src/contexts/LanguageContext.tsx' },
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const { local, remote } = UPLOADS[0];
    console.log('Uploading LanguageContext.tsx...');
    sftp.fastPut(path.join('D:/Web hang gia/vntrust', local), remote, (err) => {
      if (err) { console.error('Upload failed:', err); return; }
      console.log('Upload done! Rebuilding...');
      conn.exec('cd /var/www/vntrust && npm run build 2>&1 && pm2 restart vntrust && pm2 status && echo "=== DONE ==="', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => { conn.end(); process.exit(0); })
              .on('data', d => process.stdout.write(d))
              .stderr.on('data', d => process.stderr.write(d));
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
