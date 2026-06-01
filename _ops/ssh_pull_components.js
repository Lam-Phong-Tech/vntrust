// Pull missing components + contexts từ prod
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('find /var/www/vntrust/src/components /var/www/vntrust/src/contexts /var/www/vntrust/src/hooks -type f \\( -name "*.ts" -o -name "*.tsx" \\) 2>/dev/null', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let buf = '';
    stream.on('close', () => {
      const files = buf.trim().split('\n').filter(Boolean).map(p => p.replace('/var/www/vntrust/', ''));
      console.log(`[discover] ${files.length} files`);
      conn.sftp((e, sftp) => {
        if (e) { console.error(e); conn.end(); return; }
        const root = path.resolve(__dirname, '../vntrust');
        let pending = files.length, ok = 0, miss = 0;
        files.forEach(rel => {
          const remote = '/var/www/vntrust/' + rel;
          const local = path.join(root, rel);
          fs.mkdirSync(path.dirname(local), { recursive: true });
          sftp.fastGet(remote, local, e => {
            if (e) { console.log('  MISS', rel); miss++; } else { ok++; }
            if (--pending === 0) { console.log(`Done: ${ok} ok, ${miss} miss`); conn.end(); }
          });
        });
      });
    }).on('data', d => buf += d.toString());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
