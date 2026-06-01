const { Client } = require('ssh2');
const path = require('path');

const BASE = 'D:/Web hang gia/vntrust';
const REMOTE = '/var/www/vntrust';
const FILES = [
  'src/contexts/LanguageContext.tsx',
  'src/app/verify/ai-doc/page.tsx',
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const upload = (i) => {
      if (i >= FILES.length) {
        console.log('All uploaded! Building...');
        conn.exec(`cd ${REMOTE} && npm run build 2>&1 && pm2 restart vntrust && echo "=== DONE ==="`, (err, stream) => {
          if (err) throw err;
          stream.on('close', () => { conn.end(); process.exit(0); })
                .on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
        });
        return;
      }
      const local = path.join(BASE, FILES[i]);
      const remote = path.join(REMOTE, FILES[i]).replace(/\\/g, '/');
      console.log(`[${i+1}/${FILES.length}] ${FILES[i]}`);
      sftp.fastPut(local, remote, (err) => {
        if (err) console.error('Failed:', err.message);
        upload(i + 1);
      });
    };
    upload(0);
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
