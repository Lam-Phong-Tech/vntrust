const { Client } = require('ssh2');
const conn = new Client();

const remoteScript = `
process.chdir('/var/www/vntrust');
const Database = require('better-sqlite3');
const db = new Database('/var/www/vntrust/dev.db', { readonly: true });

// Simulate what /api/distribution does for hidequan user
const doanhNghiepId = '2c342c28-1f2f-4da6-92e7-9a3fd6946c61'; // hidequan's company

console.log('=== Simulating fetchBatches for hidequan ===');
console.log('doanhNghiepId:', doanhNghiepId);

// Raw query matching what Prisma does
const batches = db.prepare(\`
  SELECT l.id, l.maLo, l.trangThai, l.soLuong, l.ngaySanXuat, l.hanDung,
         s.ten as sanPhamTen, s.maSKU, s.doanhNghiepId
  FROM LoHang l
  JOIN SanPham s ON s.id = l.sanPhamId
  WHERE s.doanhNghiepId = ?
  ORDER BY l.ngaySanXuat DESC
\`).all(doanhNghiepId);

console.log('');
console.log('=== Batches found:', batches.length, '===');
batches.forEach(b => console.log(JSON.stringify(b)));

// Filter for approved+active
const activeBatches = batches.filter(b => ['approved','active'].includes(b.trangThai));
console.log('');
console.log('=== After filter (approved+active):', activeBatches.length, '===');
activeBatches.forEach(b => console.log(JSON.stringify(b)));

// Also check what findFirst would return (for auto-assign in login)
const firstDN = db.prepare("SELECT id, ten FROM DoanhNghiep WHERE trangThai='verified' LIMIT 1").get();
console.log('');
console.log('=== findFirst verified DoanhNghiep ===', JSON.stringify(firstDN));

// Check users and their doanhNghiepId now
console.log('');
console.log('=== Current user doanhNghiepId in DB ===');
const users = db.prepare("SELECT id, ten, email, vaiTro, doanhNghiepId FROM NguoiDung").all();
users.forEach(u => console.log(JSON.stringify(u)));
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const ws = sftp.createWriteStream('/var/www/vntrust/debug_tmp.js');
    ws.end(remoteScript, 'utf8', () => {
      conn.exec('cd /var/www/vntrust && node debug_tmp.js 2>&1', (err2, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
          conn.exec('rm -f /var/www/vntrust/debug_tmp.js', () => conn.end());
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 30000 });
