const { Client } = require('ssh2');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(path.join(__dirname, 'check_prisma.js'), '/var/www/vntrust/check_prisma.js', (err) => {
      if (err) console.error(err);
      conn.exec('cd /var/www/vntrust && node check_prisma.js', (err, stream) => {
        if (err) throw err;
        stream.on('data', d => console.log(d.toString()));
        stream.on('close', () => conn.end());
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
