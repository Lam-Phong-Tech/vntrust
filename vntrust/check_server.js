const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  // Check the MapDetailModal area which had a broken className
  c.exec('sed -n "430,460p" /var/www/vntrust/src/app/dashboard/page.tsx', (e, s) => {
    s.on('data', d => console.log(d.toString()));
    s.stderr.on('data', d => console.error(d.toString()));
    s.on('close', () => c.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
