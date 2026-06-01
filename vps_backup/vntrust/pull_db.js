const Client = require('ssh2').Client;
const fs = require('fs');
const path = require('path');

const conn = new Client();
const localDbPath = path.join(__dirname, 'dev.db');
const backupDbPath = path.join(__dirname, 'dev.db.bak');
const remoteDbPath = '/var/www/vntrust/dev.db';

// Backup existing local db just in case
if (fs.existsSync(localDbPath)) {
  try {
    fs.copyFileSync(localDbPath, backupDbPath);
    console.log('Đã tạo bản sao lưu dữ liệu cũ tại dev.db.bak');
  } catch (err) {
    console.error('Lỗi khi tạo bản sao lưu:', err);
  }
}

conn.on('ready', () => {
  console.log('Đã kết nối tới VPS...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('Bắt đầu tải file dev.db từ VPS về máy...');
    sftp.fastGet(remoteDbPath, localDbPath, (err) => {
      if (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
      } else {
        console.log('Tải dữ liệu hoàn tất! Dữ liệu cục bộ của bạn đã được đồng bộ với VPS.');
      }
      conn.end();
    });
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'nSmaPGEY39',
  readyTimeout: 60000
});
