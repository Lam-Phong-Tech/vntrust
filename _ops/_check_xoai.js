const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && sqlite3 dev.db "SELECT sp.ten, sp.maSKU, lh.maLo, lh.hanDung, lh.trangThai FROM SanPham sp LEFT JOIN LoHang lh ON lh.sanPhamId = sp.id WHERE sp.maSKU = 'SKU-E7286090' ORDER BY lh.ngaySanXuat DESC;"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 10000 });
