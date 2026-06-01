const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && node -e "
    const db = require('better-sqlite3')('dev.db');
    
    // Disable foreign keys temporarily
    db.pragma('foreign_keys = OFF');

    // Delete LoHang
    const delLh = db.prepare(\\"DELETE FROM LoHang WHERE sanPhamId IN (SELECT id FROM SanPham WHERE ten = 'Thực phẩm BVSK Nattokinase Premium')\\").run();
    console.log('Deleted LoHang:', delLh.changes);

    // Delete SanPham
    const delSp = db.prepare(\\"DELETE FROM SanPham WHERE ten = 'Thực phẩm BVSK Nattokinase Premium'\\").run();
    console.log('Deleted SanPham:', delSp.changes);

    db.pragma('foreign_keys = ON');

    // Remaining
    const sp = db.prepare(\\"SELECT id, ten FROM SanPham WHERE doanhNghiepId = '2c342c28-1f2f-4da6-92e7-9a3fd6946c61'\\").all();
    console.log('Remaining SanPham for this user:', sp);
  "`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
