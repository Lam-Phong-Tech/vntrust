const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec(`
    echo "=== Find font-headline in ALL prod source ==="
    grep -rn "font-headline" /var/www/vntrust/src/ --include="*.tsx" | head -30
    echo ""
    echo "=== Counter cho dashboard/page.tsx (mới upload) ==="
    grep -c "font-headline" /var/www/vntrust/src/app/dashboard/page.tsx
    echo "(should be 0)"
    echo ""
    grep -c "font-display" /var/www/vntrust/src/app/dashboard/page.tsx
    echo "(should be 5)"
  `, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
