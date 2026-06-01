const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && node -e "
    try {
      const db = require('better-sqlite3')('dev.db');
      const kh = db.prepare('SELECT KhoHang.id, KhoHang.loaiGD, KhoHang.soLuong, KhoHang.loHangId, LoHang.sanPhamId, SanPham.ten, SanPham.doanhNghiepId FROM KhoHang JOIN LoHang ON KhoHang.loHangId = LoHang.id JOIN SanPham ON LoHang.sanPhamId = SanPham.id').all();
      console.log('KhoHang records:', kh);
    } catch(e) {
      console.error(e);
    }
  "`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
