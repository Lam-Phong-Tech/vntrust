// Pull thêm file để local build pass
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const FILES = [
  'src/app/verify/[uid]/page.tsx',
  'src/app/verify/[uid]/result.css',
  'src/app/verify/scan/page.tsx',
  'src/app/verify/scan/scan.css',
  'src/app/verify/manual/page.tsx',
  'src/app/verify/ai-doc/page.tsx',
  'src/app/verify/page.tsx',
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.error(err); conn.end(); return; }
    const root = path.resolve(__dirname, '../vntrust');
    let pending = FILES.length, ok = 0, miss = 0;
    FILES.forEach(rel => {
      const remote = '/var/www/vntrust/' + rel;
      const local = path.join(root, rel);
      fs.mkdirSync(path.dirname(local), { recursive: true });
      sftp.fastGet(remote, local, e => {
        if (e) { console.log('  MISS', rel); miss++; } else { console.log('   OK ', rel); ok++; }
        if (--pending === 0) { console.log(`Done: ${ok} ok, ${miss} miss`); conn.end(); }
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
