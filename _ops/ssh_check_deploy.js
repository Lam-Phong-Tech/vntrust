const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec([
    'echo "=== BUILD_ID ==="',
    'cat /var/www/vntrust/.next/BUILD_ID 2>/dev/null',
    'echo ""',
    'echo "=== Last build time ==="',
    'stat -c "%y %n" /var/www/vntrust/.next/BUILD_ID 2>/dev/null',
    'echo "=== Source mtime (kyc/page.tsx — should be very recent) ==="',
    'stat -c "%y %n" /var/www/vntrust/src/app/dashboard/kyc/page.tsx',
    'echo "=== grep nguồn (chỉ chứa C8A557 nếu patch đã apply) ==="',
    'grep -c "C8A557" /var/www/vntrust/src/app/dashboard/kyc/page.tsx',
    'grep -c "amber-400\\|amber-500" /var/www/vntrust/src/app/dashboard/kyc/page.tsx',
    'echo ""',
    'echo "=== HTML phục vụ (curl từ chính VPS) /dashboard/kyc ==="',
    'curl -sk -b "userRole=admin;userName=Admin;doanhNghiepId=test" https://anticounterfeit.test9.io.vn/dashboard/kyc | grep -oc "C8A557"',
    'curl -sk -b "userRole=admin;userName=Admin;doanhNghiepId=test" https://anticounterfeit.test9.io.vn/dashboard/kyc | grep -oc "amber-400\\|amber-500"',
    'echo "=== PM2 status vntrust ==="',
    'pm2 list | grep vntrust',
    'echo "=== Last 8 log lines ==="',
    'pm2 logs vntrust --lines 8 --nostream 2>&1 | tail -15'
  ].join(' && '), (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
