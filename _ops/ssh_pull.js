// Pull key prod files into _ops/prod_snapshot/
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const FILES = [
  'src/app/login/page.tsx',
  'src/app/login/[role]/page.tsx',
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/me/route.ts',
  'src/app/api/auth/forgot/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/layout.tsx',
  'src/app/globals.css',
  'src/app/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/profile/page.tsx',
  'src/app/dashboard/create/page.tsx',
  'src/middleware.ts',
  'src/components/Navbar.tsx',
  'src/components/ClientShell.tsx',
  'package.json',
  '.env',
  'next.config.ts',
  'prisma/schema.prisma',
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); return; }
    const outDir = path.resolve(__dirname, 'prod_snapshot');
    fs.mkdirSync(outDir, { recursive: true });

    let pending = FILES.length;
    let done = 0, missing = 0;
    FILES.forEach(rel => {
      const remote = '/var/www/vntrust/' + rel;
      const local = path.join(outDir, rel.replace(/[\[\]]/g, '_'));
      fs.mkdirSync(path.dirname(local), { recursive: true });
      sftp.fastGet(remote, local, (err) => {
        if (err) { console.log('  MISS', rel); missing++; }
        else { console.log('   OK  ', rel); done++; }
        if (--pending === 0) {
          console.log(`\nDone: ${done} ok, ${missing} missing`);
          conn.end();
        }
      });
    });
  });
}).on('error', e => console.error('SSH ERR:', e.message))
  .connect({
    host: '45.119.83.233', port: 22,
    username: 'root', password: 'Tailoc@2026',
    readyTimeout: 8000
  });
