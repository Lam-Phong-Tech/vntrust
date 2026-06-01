const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && node -e "
    const db = require('better-sqlite3')('dev.db');
    
    // Find DonChuyenHang for 'táo'
    const dch = db.prepare(\\"SELECT * FROM DonChuyenHang WHERE loHangId IN (SELECT id FROM LoHang WHERE sanPhamId IN (SELECT id FROM SanPham WHERE ten = 'táo'))\\").all();
    console.log('Found:', dch);

    // Update them to pending_review
    const update = db.prepare(\\"UPDATE DonChuyenHang SET trangThai = 'pending_review' WHERE loHangId IN (SELECT id FROM LoHang WHERE sanPhamId IN (SELECT id FROM SanPham WHERE ten = 'táo'))\\").run();
    console.log('Updated DonChuyenHang:', update.changes);

    // Also update LoHang to pending_review
    const updateLh = db.prepare(\\"UPDATE LoHang SET trangThai = 'pending_review' WHERE sanPhamId IN (SELECT id FROM SanPham WHERE ten = 'táo') AND trangThai = 'pending_distributor'\\").run();
    console.log('Updated LoHang:', updateLh.changes);

  "`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
