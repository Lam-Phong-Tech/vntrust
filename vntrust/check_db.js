const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('sqlite3 /var/www/vntrust/prisma/dev.db "SELECT ten, loai, trangThai FROM DoanhNghiep;"', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
