const { Client } = require('ssh2');
const fs = require('fs');
const c = new Client();
c.on('ready', () => {
  c.sftp((e, sftp) => {
    if (e) { console.error(e); c.end(); return; }
    sftp.fastGet('/var/www/vntrust/src/app/api/report/route.ts', '/tmp/prod_report.ts', err => {
      if (err) console.error(err);
      else {
        const txt = fs.readFileSync('/tmp/prod_report.ts', 'utf8');
        fs.writeFileSync('C:/xampp/htdocs/Web-chong-hang-gia-main/_ops/prod_snapshot/src/app/api/report/route.ts', txt);
        console.log('Pulled prod report route.ts (' + txt.length + ' bytes)');
      }
      c.end();
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
