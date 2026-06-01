const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('sqlite3 /var/www/vntrust/dev.db "SELECT email, soDienThoai, vaiTro, trangThai, doanhNghiepId FROM NguoiDung ORDER BY id DESC LIMIT 5;"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (d) => process.stdout.write(d))
          .stderr.on('data', (d) => process.stderr.write(d));
  });
}).connect({ host: '45.119.83.233', username: 'root', password: 'Tailoc@2026' });
