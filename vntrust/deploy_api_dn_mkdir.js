const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;

    sftp.mkdir('/var/www/vntrust/src/app/api/distribution', (err) => {
      // ignore if exists
      const local = path.join(__dirname, 'src/app/api/distribution/route.ts');
      const remote = '/var/www/vntrust/src/app/api/distribution/route.ts';
      sftp.fastPut(local, remote, (err) => {
        if (err) console.error('FAIL distribution:', err.message);
        else console.log('OK distribution');

        // Also upload warehouse
        const localWh = path.join(__dirname, 'src/app/api/warehouse/route.ts');
        const remoteWh = '/var/www/vntrust/src/app/api/warehouse/route.ts';
        sftp.fastPut(localWh, remoteWh, (err) => {
          if (err) console.error('FAIL warehouse:', err.message);
          else console.log('OK warehouse');
          
          console.log('Building...');
          conn.exec('cd /var/www/vntrust && npm run build && pm2 restart vntrust', (err, stream) => {
            if (err) throw err;
            stream.on('data', d => process.stdout.write(d.toString()));
            stream.stderr.on('data', d => process.stderr.write(d.toString()));
            stream.on('close', code => {
              console.log('Deploy done, code:', code);
              conn.end();
            });
          });
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 60000 });
