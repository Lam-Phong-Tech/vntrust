const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const commands = [
    // Kiểm tra cấu hình Nginx hiện tại
    'echo "=== SITES-ENABLED ===" && ls -la /etc/nginx/sites-enabled/',
    'echo "=== PM2 STATUS ===" && pm2 list',
    'echo "=== NGINX CONFIG anticounterfeit ===" && cat /etc/nginx/sites-enabled/anticounterfeit.test9.io.vn 2>/dev/null || echo "NOT FOUND"',
    'echo "=== CHECK PORT 3009 ===" && ss -tlnp | grep 3009 || echo "Port 3009 not listening"',
    'echo "=== CURL TEST ===" && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3009 || echo "Cannot connect"',
  ];

  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Done, code: ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
