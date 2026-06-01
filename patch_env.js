const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('Uploading .env...');
    sftp.fastPut('D:/Web hang gia/vntrust/.env', '/var/www/vntrust/.env', (err) => {
      if (err) { console.error('Upload failed:', err); return; }
      console.log('.env uploaded! Restarting vntrust...');
      conn.exec('pm2 restart vntrust && pm2 status && echo "=== DONE ==="', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => { console.log('Exit:', code); conn.end(); process.exit(0); })
              .on('data', d => process.stdout.write(d))
              .stderr.on('data', d => process.stderr.write(d));
      });
    });
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
