const Client = require('ssh2').Client;
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const conn = new Client();
const localArchive = path.join(__dirname, 'vps_code.tar.gz');

console.log('Đang bắt đầu quá trình đồng bộ code từ VPS...');

conn.on('ready', () => {
  console.log('1. Đã kết nối tới VPS. Đang nén code trên server (bỏ qua node_modules và .next để tải nhanh hơn)...');
  const tarCmd = "cd /var/www && tar -czf vps_code.tar.gz --exclude='vntrust/node_modules' --exclude='vntrust/.next' vntrust";
  
  conn.exec(tarCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('2. Đã nén xong trên VPS. Bắt đầu tải file nén về máy tính...');
      conn.sftp((err, sftp) => {
        if (err) throw err;
        sftp.fastGet('/var/www/vps_code.tar.gz', localArchive, (err) => {
          if (err) {
            console.error('Lỗi khi tải file:', err);
            conn.end();
          } else {
            console.log('3. Tải hoàn tất! Đang giải nén và cập nhật vào thư mục hiện tại...');
            try {
              // Extract locally using Windows tar command
              execSync('tar -xzf vps_code.tar.gz --strip-components=1', { cwd: __dirname, stdio: 'inherit' });
              
              // Cài đặt lại npm packages nếu package.json có thay đổi
              console.log('4. Giải nén thành công. Đang cài đặt lại các thư viện (npm install)...');
              execSync('npm install --legacy-peer-deps', { cwd: __dirname, stdio: 'inherit' });
              
              console.log('=== HOÀN TẤT! Code của bạn đã được cập nhật bằng với code trên VPS ===');
            } catch (e) {
              console.error('Lỗi trong quá trình giải nén hoặc cài đặt thư viện:', e);
            }
            conn.end();
          }
        });
      });
    }).on('data', (data) => {
      // Ignore
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'nSmaPGEY39',
  readyTimeout: 60000
});
