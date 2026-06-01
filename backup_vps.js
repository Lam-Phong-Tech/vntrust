/**
 * Backup toàn bộ source code VPS anticounterfeit.test9.io.vn
 * về thư mục local: ./vps_backup/
 * 
 * Bước 1: SSH vào VPS, tạo archive tar.gz
 * Bước 2: Download archive về local qua SFTP
 * Bước 3: Xoá archive tạm trên VPS
 */

const { Client } = require('ssh2');
const SftpClient = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

const VPS_CONFIG = {
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
};

const REMOTE_APP_DIR = '/var/www/vntrust';
const REMOTE_ARCHIVE = '/tmp/vntrust_backup.tar.gz';
const LOCAL_BACKUP_DIR = path.join(__dirname, 'vps_backup');
const LOCAL_ARCHIVE = path.join(LOCAL_BACKUP_DIR, 'vntrust_backup.tar.gz');

// Ensure local backup directory exists
if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
  fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
}

function execSSH(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      console.log(`[SSH] Executing: ${command}`);
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(`Command exited with code ${code}\nSTDERR: ${stderr}`));
          } else {
            resolve(stdout);
          }
        });
        stream.on('data', (data) => {
          const str = data.toString();
          process.stdout.write(str);
          stdout += str;
        });
        stream.stderr.on('data', (data) => {
          const str = data.toString();
          process.stderr.write(str);
          stderr += str;
        });
      });
    });

    conn.on('error', reject);
    conn.connect(VPS_CONFIG);
  });
}

async function main() {
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log(' VPS BACKUP - anticounterfeit.test9.io.vn');
  console.log(' Source: ' + REMOTE_APP_DIR);
  console.log(' Target: ' + LOCAL_BACKUP_DIR);
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Check remote directory and show info
  console.log('[1/5] Kiểm tra thư mục trên VPS...');
  try {
    const info = await execSSH(`du -sh ${REMOTE_APP_DIR} && echo "---" && ls -la ${REMOTE_APP_DIR}/`);
    console.log('');
  } catch (err) {
    console.error('ERROR: Không thể truy cập thư mục trên VPS!', err.message);
    process.exit(1);
  }

  // Step 2: Check .env and database files
  console.log('[2/5] Kiểm tra .env và database...');
  try {
    await execSSH(`echo "=== .env ===" && cat ${REMOTE_APP_DIR}/.env 2>/dev/null && echo "" && echo "=== Database files ===" && find ${REMOTE_APP_DIR} -name "*.db" -o -name "*.sqlite" 2>/dev/null | head -20`);
    console.log('');
  } catch (err) {
    console.log('  (Không tìm thấy .env hoặc db files)');
  }

  // Step 3: Create tar.gz archive on VPS (exclude node_modules and .next to save bandwidth)
  console.log('[3/5] Tạo archive trên VPS (bao gồm cả node_modules/.next)...');
  try {
    // Remove old archive if exists
    await execSSH(`rm -f ${REMOTE_ARCHIVE}`).catch(() => {});
    
    // Create archive - include everything (node_modules, .next, .env, db files)
    await execSSH(`cd /var/www && tar -czf ${REMOTE_ARCHIVE} vntrust/ && ls -lh ${REMOTE_ARCHIVE}`);
    console.log('');
  } catch (err) {
    console.error('ERROR: Không thể tạo archive!', err.message);
    process.exit(1);
  }

  // Step 4: Download archive via SFTP
  console.log('[4/5] Downloading archive via SFTP...');
  const sftp = new SftpClient();
  try {
    await sftp.connect(VPS_CONFIG);
    
    // Get file size for progress tracking
    const stat = await sftp.stat(REMOTE_ARCHIVE);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`  File size: ${sizeMB} MB`);
    
    // Download with progress
    let lastPercent = 0;
    await sftp.fastGet(REMOTE_ARCHIVE, LOCAL_ARCHIVE, {
      step: (totalTransferred, chunk, total) => {
        const percent = Math.round((totalTransferred / total) * 100);
        if (percent >= lastPercent + 5) {
          process.stdout.write(`  Progress: ${percent}% (${(totalTransferred/1024/1024).toFixed(1)}/${sizeMB} MB)\r`);
          lastPercent = percent;
        }
      }
    });
    console.log(`  Download hoàn tất: ${LOCAL_ARCHIVE}`);
    console.log('');
  } catch (err) {
    console.error('ERROR: Download thất bại!', err.message);
    process.exit(1);
  } finally {
    sftp.end();
  }

  // Step 5: Clean up remote archive
  console.log('[5/5] Dọn dẹp archive tạm trên VPS...');
  try {
    await execSSH(`rm -f ${REMOTE_ARCHIVE}`);
    console.log('  Đã xoá archive tạm trên VPS.');
  } catch (err) {
    console.log('  (Warning: không thể xoá archive tạm)');
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const localSize = fs.statSync(LOCAL_ARCHIVE);
  console.log('');
  console.log('='.repeat(60));
  console.log(' BACKUP HOÀN TẤT!');
  console.log(` File: ${LOCAL_ARCHIVE}`);
  console.log(` Size: ${(localSize.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(` Thời gian: ${elapsed}s`);
  console.log('');
  console.log(' Để giải nén: tar -xzf vps_backup/vntrust_backup.tar.gz');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
