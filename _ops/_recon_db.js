const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && sqlite3 dev.db "SELECT vaiTro, trangThai, COUNT(*) FROM NguoiDung GROUP BY vaiTro, trangThai;" && echo '---DN-USER---' && sqlite3 dev.db "SELECT d.ten, d.loai, COUNT(n.id) as users, GROUP_CONCAT(n.email) FROM DoanhNghiep d LEFT JOIN NguoiDung n ON n.doanhNghiepId = d.id GROUP BY d.id ORDER BY users DESC LIMIT 20;" && echo '---SCHEMA---' && sqlite3 dev.db ".schema NguoiDung"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 10000 });
