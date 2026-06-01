const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && node -e "
    const db = require('better-sqlite3')('dev.db');
    
    // Delete KhoHang records for the fake product Nattokinase
    const delKh = db.prepare(\\"DELETE FROM KhoHang WHERE loHangId IN (SELECT id FROM LoHang WHERE sanPhamId IN (SELECT id FROM SanPham WHERE ten = 'Thực phẩm BVSK Nattokinase Premium'))\\").run();
    console.log('Deleted KhoHang:', delKh.changes);

    // Delete LoHang records for the fake product
    const delLh = db.prepare(\\"DELETE FROM LoHang WHERE sanPhamId IN (SELECT id FROM SanPham WHERE ten = 'Thực phẩm BVSK Nattokinase Premium')\\").run();
    console.log('Deleted LoHang:', delLh.changes);

    // Delete the fake product itself
    const delSp = db.prepare(\\"DELETE FROM SanPham WHERE ten = 'Thực phẩm BVSK Nattokinase Premium'\\").run();
    console.log('Deleted SanPham:', delSp.changes);

    // Optional: Are there other fake products for this user?
    // User doanhNghiepId = '2c342c28-1f2f-4da6-92e7-9a3fd6946c61'
    const sp = db.prepare(\\"SELECT id, ten FROM SanPham WHERE doanhNghiepId = '2c342c28-1f2f-4da6-92e7-9a3fd6946c61'\\").all();
    console.log('Remaining SanPham for this user:', sp);
  "`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
