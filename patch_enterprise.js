const { Client } = require('ssh2');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const local = 'D:/Web hang gia/vntrust/src/app/enterprise/page.tsx';
    const remote = '/var/www/vntrust/src/app/enterprise/page.tsx';
    console.log('Uploading enterprise/page.tsx...');
    sftp.fastPut(local, remote, (err) => {
      if (err) { console.error(err); return; }
      console.log('Done! Building...');
      conn.exec('cd /var/www/vntrust && npm run build 2>&1 && pm2 restart vntrust && echo "=== DONE ==="', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => { conn.end(); process.exit(0); })
              .on('data', d => process.stdout.write(d))
              .stderr.on('data', d => process.stderr.write(d));
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
