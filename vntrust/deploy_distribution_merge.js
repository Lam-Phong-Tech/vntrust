const { Client } = require('ssh2');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    let done = 0;
    const files = [
      'src/app/api/don-chuyen-hang/route.ts',
      'src/app/dashboard/distribution/page.tsx'
    ];
    files.forEach(f => {
      sftp.fastPut(path.join(__dirname, f), '/var/www/vntrust/' + f, (err) => {
        if (err) console.error(err);
        done++;
        if (done === files.length) {
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
        }
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
