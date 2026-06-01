const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(
      path.join(__dirname, 'src/app/api/stats/route.ts'),
      '/var/www/vntrust/src/app/api/stats/route.ts',
      (err) => {
        if (err) throw err;
        console.log('stats/route.ts uploaded. Building...');
        conn.exec('cd /var/www/vntrust && npm run build && pm2 restart vntrust 2>&1', (err, stream) => {
          if (err) throw err;
          stream.on('data', (data) => process.stdout.write(data));
          stream.stderr.on('data', (data) => process.stderr.write(data));
          stream.on('close', (code) => {
            console.log('\nDone, code:', code);
            conn.end();
          });
        });
      }
    );
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 60000 });
