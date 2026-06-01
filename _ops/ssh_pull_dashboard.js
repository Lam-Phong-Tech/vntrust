// Pull TẤT CẢ dashboard pages + layout từ prod để phân tích theme
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  // Discover pages first
  conn.exec('find /var/www/vntrust/src/app/dashboard -name "page.tsx" -o -name "layout.tsx" 2>/dev/null', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let buf = '';
    stream.on('close', () => {
      const files = buf.trim().split('\n').filter(Boolean).map(p => p.replace('/var/www/vntrust/', ''));
      console.log(`[discover] ${files.length} files`);
      conn.sftp((e, sftp) => {
        if (e) { console.error(e); conn.end(); return; }
        const outDir = path.resolve(__dirname, 'prod_snapshot');
        let pending = files.length, ok = 0, miss = 0;
        files.forEach(rel => {
          const remote = '/var/www/vntrust/' + rel;
          const local = path.join(outDir, rel.replace(/\[/g, '_').replace(/\]/g, '_'));
          fs.mkdirSync(path.dirname(local), { recursive: true });
          sftp.fastGet(remote, local, e => {
            if (e) { console.log('  MISS', rel); miss++; }
            else { ok++; }
            if (--pending === 0) {
              console.log(`Done: ${ok} ok, ${miss} miss`);
              conn.end();
            }
          });
        });
      });
    }).on('data', d => buf += d.toString());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
