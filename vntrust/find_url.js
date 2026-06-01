const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  // Check what port vntrust is listening on and find its nginx config
  const cmd = 'cat /etc/nginx/sites-available/vntrust 2>/dev/null; ls /etc/nginx/sites-enabled/; ss -tlnp | grep node; pm2 show vntrust 2>/dev/null | head -30';
  c.exec(cmd, (_, s) => {
    s.on('data', d => process.stdout.write(d.toString()));
    s.stderr.on('data', d => process.stderr.write(d.toString()));
    s.on('close', () => c.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 30000 });
