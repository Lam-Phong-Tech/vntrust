const { Client } = require('ssh2');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;

    const files = [
      'src/app/dashboard/warehouse/page.tsx',
      'src/app/dashboard/distribution/page.tsx',
      'src/app/dashboard/compliance/page.tsx',
    ];

    let done = 0;
    files.forEach(file => {
      const local = path.join(__dirname, file);
      const remote = `/var/www/vntrust/${file}`;
      sftp.fastPut(local, remote, (err) => {
        if (err) { console.error('FAIL:', file, err.message); }
        else { console.log('OK:', file); }
        done++;
        if (done === files.length) {
          console.log('\nAll uploaded. Building...');
          conn.exec('cd /var/www/vntrust && npm run build && pm2 restart vntrust', (err, stream) => {
            if (err) throw err;
            stream.on('data', d => process.stdout.write(d.toString()));
            stream.stderr.on('data', d => process.stderr.write(d.toString()));
            stream.on('close', code => {
              console.log('Deploy done, code:', code);
              conn.end();
            });
          });
        }
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 60000 });
