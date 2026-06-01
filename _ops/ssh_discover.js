// Read-only SSH discovery: dump production source structure
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmd = [
    'echo "=== PWD ==="',
    'cd /var/www/vntrust && pwd',
    'echo "=== /var/www/vntrust top-level ==="',
    'ls -la /var/www/vntrust | head -30',
    'echo "=== src/app/login tree ==="',
    'find /var/www/vntrust/src/app/login -type f 2>/dev/null',
    'echo "=== src/app/api/auth tree ==="',
    'find /var/www/vntrust/src/app/api/auth -type f 2>/dev/null',
    'echo "=== src/app/dashboard pages ==="',
    'find /var/www/vntrust/src/app/dashboard -name page.tsx 2>/dev/null',
    'echo "=== middleware.ts ==="',
    'ls -la /var/www/vntrust/src/middleware.ts 2>/dev/null',
    'echo "=== PM2 list ==="',
    'pm2 list 2>/dev/null || echo "(no pm2)"',
    'echo "=== node version ==="',
    'node -v',
    'echo "=== nginx sites-enabled ==="',
    'ls /etc/nginx/sites-enabled/ 2>/dev/null',
    'echo "=== free disk ==="',
    'df -h / | tail -2'
  ].join(' && ');
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => console.error('SSH ERR:', e.message))
  .connect({
    host: '45.119.83.233', port: 22,
    username: 'root', password: 'Tailoc@2026',
    readyTimeout: 8000
  });
