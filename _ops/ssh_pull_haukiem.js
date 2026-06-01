const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const FILES = [
  'src/app/api/haukiem/route.ts',
  'src/app/api/lifecycle-check/route.ts',
  'src/app/api/compliance/route.ts',
  'src/app/api/gov-integration/route.ts',
  'src/app/api/certificates/route.ts',
  'src/app/api/verify-image/route.ts',
  'src/app/dashboard/haukiem/page.tsx',
  'src/app/dashboard/compliance/page.tsx',
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.error(err); conn.end(); return; }
    const out = path.resolve(__dirname, 'prod_snapshot');
    let pending = FILES.length, ok = 0, miss = 0;
    FILES.forEach(rel => {
      const remote = '/var/www/vntrust/' + rel;
      const local = path.join(out, rel.replace(/\[/g, '_').replace(/\]/g, '_'));
      fs.mkdirSync(path.dirname(local), { recursive: true });
      sftp.fastGet(remote, local, e => {
        if (e) { console.log('  MISS', rel); miss++; } else { console.log('   OK ', rel); ok++; }
        if (--pending === 0) { console.log(`Done: ${ok} ok, ${miss} miss`); conn.end(); }
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
