const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected. Uploading seed script...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(
      path.join(__dirname, 'seed_production.js'),
      '/var/www/vntrust/seed_production.js',
      (err) => {
        if (err) throw err;
        console.log('Script uploaded. Running seed (may take 10-20 seconds)...');
        conn.exec('cd /var/www/vntrust && node seed_production.js 2>&1', (err, stream) => {
          if (err) throw err;
          stream.on('data', (data) => process.stdout.write(data));
          stream.stderr.on('data', (data) => process.stderr.write(data));
          stream.on('close', (code) => {
            console.log('\nSeed finished with code:', code);
            conn.end();
          });
        });
      }
    );
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 60000 });
