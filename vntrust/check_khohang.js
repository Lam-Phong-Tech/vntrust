const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`node -e "
    const db = require('better-sqlite3')('/var/www/vntrust/dev.db');
    const kh = db.prepare('SELECT KhoHang.id, KhoHang.loaiGD, KhoHang.soLuong, KhoHang.loHangId, LoHang.sanPhamId, SanPham.ten FROM KhoHang JOIN LoHang ON KhoHang.loHangId = LoHang.id JOIN SanPham ON LoHang.sanPhamId = SanPham.id').all();
    console.log('KhoHang records:', kh);
  "`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
