const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('find /var/www/vntrust/src/app/verify -type f 2>/dev/null; echo "---"; ls /var/www/vntrust/src/app/verify/ 2>/dev/null', (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
