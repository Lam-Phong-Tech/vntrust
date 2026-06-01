const { Client } = require('ssh2');
const path = require('path');
const conn = new Client();

conn.on('ready', () => {
  console.log('Client ready. Starting SFTP...');
  conn.exec('mkdir -p /var/www/vntrust/src/app/api/compliance', (err) => {
    if (err) throw err;
    conn.sftp((err, sftp) => {
      if (err) throw err;
      const localPath = path.join(__dirname, 'src/app/api/compliance/route.ts');
      const remotePath = `/var/www/vntrust/src/app/api/compliance/route.ts`;

      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) {
          console.error('SFTP Error:', err);
          conn.end();
          return;
        }
        console.log('Upload success. Running build...');
        conn.exec('cd /var/www/vntrust && npm run build && pm2 restart vntrust', (err, stream) => {
          stream.on('data', d => process.stdout.write(d));
          stream.stderr.on('data', d => process.stderr.write(d));
          stream.on('close', () => {
            console.log('Build finished. Testing API...');
            conn.exec('curl -s -X GET "http://127.0.0.1:3001/api/compliance" -b "userRole=admin"', (err2, stream2) => {
              stream2.on('data', d => console.log('API Response:', d.toString()));
              stream2.on('close', () => conn.end());
            });
          });
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
