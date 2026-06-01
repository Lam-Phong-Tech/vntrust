const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('ss -tnlp 2>/dev/null | awk \'NR>1{print $4}\' | sort -u | head -40; echo ---; cat /etc/nginx/sites-enabled/anticounterfeit.test9.io.vn 2>/dev/null', (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
