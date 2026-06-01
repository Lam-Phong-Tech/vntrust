const { Client } = require('ssh2');

// Try multiple username/password combinations
const attempts = [
  { username: 'root', password: 'Tailoc@2026' },
  { username: 'tailoc', password: 'Tailoc@2026' },
  { username: 'admin', password: 'Tailoc@2026' },
  { username: 'root', password: 'Tailoc@2026' },  // old password
];

let attemptIndex = 0;

function tryConnect() {
  if (attemptIndex >= attempts.length) {
    console.log('\n❌ All attempts failed. Please check credentials.');
    return;
  }

  const cred = attempts[attemptIndex];
  console.log(`\n🔑 Attempt ${attemptIndex + 1}: user=${cred.username}`);

  const conn = new Client();
  conn.on('ready', () => {
    console.log(`✅ Connected with user="${cred.username}"!`);

    const commands = [
      'echo "=== HOSTNAME ===" && hostname',
      'echo "=== NGINX STATUS ===" && systemctl status nginx --no-pager -l 2>&1 | head -15',
      'echo "=== SITES-ENABLED ===" && ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "No sites-enabled dir"',
      'echo "=== NGINX CONFIG anticounterfeit ===" && cat /etc/nginx/sites-enabled/anticounterfeit.test9.io.vn 2>/dev/null || cat /etc/nginx/sites-available/anticounterfeit.test9.io.vn 2>/dev/null || echo "NOT FOUND"',
      'echo "=== PM2 STATUS ===" && pm2 list 2>/dev/null || echo "PM2 not installed"',
      'echo "=== LISTENING PORTS ===" && ss -tlnp | grep -E "3001|3009|80|443" 2>/dev/null || echo "No matching ports"',
      'echo "=== SSL CERTS ===" && ls -la /etc/letsencrypt/live/anticounterfeit.test9.io.vn/ 2>/dev/null || echo "No SSL certs found"',
      'echo "=== VNTRUST DIR ===" && ls -la /var/www/vntrust/ 2>/dev/null | head -20 || echo "No vntrust dir"',
      'echo "=== DNS CHECK ===" && dig +short anticounterfeit.test9.io.vn 2>/dev/null || nslookup anticounterfeit.test9.io.vn 2>/dev/null | head -10 || echo "dig/nslookup not available"',
    ];

    conn.exec(commands.join(' ; '), (err, stream) => {
      if (err) throw err;
      stream.on('close', (code) => {
        console.log('\n--- Done, exit code: ' + code + ' ---');
        conn.end();
      }).on('data', (data) => {
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  }).on('error', (err) => {
    console.log(`  ❌ Failed: ${err.message}`);
    attemptIndex++;
    tryConnect();
  }).connect({
    host: '45.119.83.233',
    port: 22,
    username: cred.username,
    password: cred.password,
    readyTimeout: 15000
  });
}

tryConnect();
