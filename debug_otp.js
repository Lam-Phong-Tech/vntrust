const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Check PM2 logs + env vars
  const cmd = [
    'pm2 logs vntrust --lines 50 --nostream 2>&1',
    'echo "=== ENV CHECK ==="',
    'grep GMAIL /var/www/vntrust/.env',
  ].join(' && ');
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => { conn.end(); process.exit(0); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
