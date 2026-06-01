const { Client } = require('ssh2');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(path.join(__dirname, 'src/app/api/kyc/route.ts'), '/var/www/vntrust/src/app/api/kyc/route.ts', (err) => {
      if (err) console.error(err);
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
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
