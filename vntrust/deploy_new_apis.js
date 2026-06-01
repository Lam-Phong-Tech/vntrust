const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client ready. Executing mkdirs...');
  conn.exec('mkdir -p /var/www/vntrust/src/app/api/verify-image && mkdir -p /var/www/vntrust/src/app/api/tmdt-sync', (err, stream) => {
    if (err) throw err;
    stream.on('data', (data) => console.log(data.toString()));
    stream.stderr.on('data', (data) => console.error(data.toString()));
    stream.on('close', () => {
      console.log('Mkdir done. Starting SFTP...');
      conn.sftp((err, sftp) => {
        if (err) throw err;

        const filesToUpload = [
          'src/app/api/verify-image/route.ts',
          'src/app/api/tmdt-sync/route.ts'
        ];

        let uploaded = 0;

        filesToUpload.forEach(file => {
          const localPath = path.join(__dirname, file);
          const remotePath = `/var/www/vntrust/${file}`;

          sftp.fastPut(localPath, remotePath, (err) => {
            if (err) {
              console.error(`Failed to upload ${file}:`, err);
              return;
            }
            console.log(`Successfully uploaded ${file}`);
            uploaded++;

            if (uploaded === filesToUpload.length) {
              console.log('All files uploaded. Running build and restart...');
              conn.exec('cd /var/www/vntrust && npm run build && pm2 restart vntrust', (err, buildStream) => {
                if (err) throw err;
                buildStream.on('data', (data) => process.stdout.write(data));
                buildStream.stderr.on('data', (data) => process.stderr.write(data));
                buildStream.on('close', (code) => {
                  console.log('Deploy finished with code ' + code);
                  conn.end();
                });
              });
            }
          });
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 60000 });
