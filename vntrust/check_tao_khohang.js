const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && node -e "
    const db = require('better-sqlite3')('dev.db');
    const kh = db.prepare(\\"SELECT * FROM KhoHang WHERE loHangId IN (SELECT id FROM LoHang WHERE sanPhamId IN (SELECT id FROM SanPham WHERE ten = 'táo'))\\").all();
    console.log('KhoHang records:', kh);
  "`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
