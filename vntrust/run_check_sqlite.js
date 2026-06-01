const { Client } = require('ssh2');
const path = require('path');
const conn = new Client();
const script = `
const Database = require('better-sqlite3');
const db = new Database('/var/www/vntrust/prisma/dev.db');
const dns = db.prepare("SELECT id, ten, loai, trangThai FROM DoanhNghiep").all();
console.log(JSON.stringify(dns, null, 2));
`;
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(Buffer.from(script), '/var/www/vntrust/check_sqlite.js', (err) => {
      if (err) console.error(err);
      conn.exec('cd /var/www/vntrust && node check_sqlite.js', (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.on('close', () => conn.end());
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
