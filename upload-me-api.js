const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  // Create the me directory
  conn.exec('mkdir -p /var/www/vntrust/src/app/api/auth/me', (err, stream) => {
    if (err) { console.error('mkdir error:', err); conn.end(); return; }
    stream.on('close', () => {
      console.log('Directory created. Uploading me/route.ts...');
      conn.sftp((err, sftp) => {
        if (err) { console.error('SFTP error:', err); conn.end(); return; }
        const local = path.join(__dirname, 'src/app/api/auth/me/route.ts');
        const remote = '/var/www/vntrust/src/app/api/auth/me/route.ts';
        sftp.fastPut(local, remote, (err) => {
          if (err) console.error('Upload failed:', err.message);
          else console.log('OK: me/route.ts uploaded');
          conn.end();
        });
      });
    }).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'nSmaPGEY39' });
