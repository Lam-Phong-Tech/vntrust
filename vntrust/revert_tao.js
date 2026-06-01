const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && node -e "
    const db = require('better-sqlite3')('dev.db');
    // Change back to active
    const updateLh = db.prepare(\\"UPDATE LoHang SET trangThai = 'active' WHERE sanPhamId IN (SELECT id FROM SanPham WHERE ten = 'táo')\\").run();
    console.log('Updated LoHang to active:', updateLh.changes);
  "`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
