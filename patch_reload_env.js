const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // pm2 restart với --update-env để load biến môi trường mới từ .env
  conn.exec('cd /var/www/vntrust && pm2 restart vntrust --update-env && echo "=== ENV UPDATED ==="', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => { console.log('Exit:', code); conn.end(); process.exit(0); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
