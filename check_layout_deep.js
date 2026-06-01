const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Xem nội dung layout + kiểm tra .next build có chứa forgot-password không
  const cmd = [
    'cat /var/www/vntrust/src/app/forgot-password/layout.tsx',
    'echo "=== .next built routes ==="',
    'ls /var/www/vntrust/.next/server/app/forgot-password/ 2>&1 || echo "NOT FOUND in build"',
    'echo "=== Root layout ==="',
    'grep -n "Navbar\\|navbar\\|Header\\|header\\|Nav " /var/www/vntrust/src/app/layout.tsx | head -10',
  ].join(' && echo "---" && ');
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => { conn.end(); process.exit(0); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
