const { Client } = require('ssh2');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('Uploading login/page.tsx...');
    sftp.fastPut(
      path.join('D:/Web hang gia/vntrust', 'src/app/login/page.tsx'),
      '/var/www/vntrust/src/app/login/page.tsx',
      (err) => {
        if (err) { console.error('Upload failed:', err); return; }
        console.log('Uploaded! Building...');
        conn.exec('cd /var/www/vntrust && npm run build 2>&1 && pm2 restart vntrust && echo "=== DONE ==="', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code) => { console.log('Exit:', code); conn.end(); process.exit(0); })
                .on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
        });
      }
    );
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
