const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec(`sqlite3 /var/www/vntrust/dev.db <<'SQL'
.headers on
.mode column
.width 30 10
SELECT 'MaDinhDanh' as tbl, COUNT(*) FROM MaDinhDanh;
SELECT 'LuotQuet', COUNT(*) FROM LuotQuet;
SELECT 'CanhBao', COUNT(*) FROM CanhBao;
SELECT 'SanPham', COUNT(*) FROM SanPham;
SELECT 'LoHang', COUNT(*) FROM LoHang;
SELECT 'DoanhNghiep', COUNT(*) FROM DoanhNghiep;
SELECT 'TieuChuanKiemNghiem', COUNT(*) FROM TieuChuanKiemNghiem;
SELECT 'KetQuaHauKiem', COUNT(*) FROM KetQuaHauKiem;
SELECT 'NhatKy (last 24h)', COUNT(*) FROM NhatKy WHERE time > datetime('now', '-1 day');
.print ''
.print '=== Sample 3 UIDs (first) ==='
SELECT uid, qrCodeUrl, trangThai, soLanQuet FROM MaDinhDanh LIMIT 3;
.print ''
.print '=== Recent NhatKy ==='
SELECT substr(action, 1, 60), role, time FROM NhatKy ORDER BY time DESC LIMIT 5;
SQL`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
