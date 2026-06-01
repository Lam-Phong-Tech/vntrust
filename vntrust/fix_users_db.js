const { Client } = require('ssh2');
const conn = new Client();

// Update user hidequan to have the first available doanhNghiepId
// Also update other users with null doanhNghiepId
const remoteScript = `
process.chdir('/var/www/vntrust');
const Database = require('better-sqlite3');
const db = new Database('/var/www/vntrust/dev.db');

// Check users without doanhNghiepId
const nullUsers = db.prepare("SELECT id, ten, email, soDienThoai, vaiTro, doanhNghiepId FROM NguoiDung WHERE doanhNghiepId IS NULL AND vaiTro IN ('manufacturer', 'importer')").all();
console.log('Users without doanhNghiepId:', JSON.stringify(nullUsers, null, 2));

// Check available DoanhNghiep
const dns = db.prepare("SELECT id, ten, loai, trangThai FROM DoanhNghiep WHERE trangThai='verified'").all();
console.log('Available DoanhNghiep:', JSON.stringify(dns, null, 2));

// Assign user hidequan to first NSX company (Tổng Công ty Dược phẩm - 2c342c28)
// Looking at the data, user hidequan created "táo" product under doanhNghiepId=2c342c28
// So we should link hidequan to that company
const updated = db.prepare("UPDATE NguoiDung SET doanhNghiepId='2c342c28-1f2f-4da6-92e7-9a3fd6946c61' WHERE id='cd07a02b-34a4-4c39-b40a-60bb79886580' AND doanhNghiepId IS NULL").run();
console.log('Updated hidequan:', updated.changes, 'row(s)');

// Also update test user to same company
const updated2 = db.prepare("UPDATE NguoiDung SET doanhNghiepId=(SELECT id FROM DoanhNghiep WHERE trangThai='verified' LIMIT 1) WHERE doanhNghiepId IS NULL AND vaiTro IN ('manufacturer','importer')").run();
console.log('Updated remaining null users:', updated2.changes, 'row(s)');

// Verify
const verifyUsers = db.prepare("SELECT id, ten, email, vaiTro, doanhNghiepId FROM NguoiDung").all();
console.log('All users after update:', JSON.stringify(verifyUsers, null, 2));
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const ws = sftp.createWriteStream('/var/www/vntrust/fix_users.js');
    ws.end(remoteScript, 'utf8', () => {
      console.log('Script uploaded. Running...');
      conn.exec('cd /var/www/vntrust && node fix_users.js 2>&1', (err2, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
          conn.exec('rm -f /var/www/vntrust/fix_users.js', () => conn.end());
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 30000 });
