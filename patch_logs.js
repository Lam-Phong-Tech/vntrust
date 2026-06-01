const fs = require('fs');
const { Client } = require('ssh2');

const filesToUpload = [
  { local: 'd:\\Web hang gia\\vntrust\\src\\hooks\\useLogs.ts', remote: '/var/www/vntrust/src/hooks/useLogs.ts' },
  { local: 'd:\\Web hang gia\\vntrust\\src\\app\\api\\auth\\login\\route.ts', remote: '/var/www/vntrust/src/app/api/auth/login/route.ts' },
  { local: 'd:\\Web hang gia\\vntrust\\src\\app\\api\\logs\\route.ts', remote: '/var/www/vntrust/src/app/api/logs/route.ts' },
  { local: 'd:\\Web hang gia\\vntrust\\src\\app\\login\\page.tsx', remote: '/var/www/vntrust/src/app/login/page.tsx' },
  { local: 'd:\\Web hang gia\\vntrust\\src\\app\\dashboard\\history\\page.tsx', remote: '/var/www/vntrust/src/app/dashboard/history/page.tsx' },
  { local: 'd:\\Web hang gia\\vntrust\\src\\app\\dashboard\\inventory\\page.tsx', remote: '/var/www/vntrust/src/app/dashboard/inventory/page.tsx' },
  { local: 'd:\\Web hang gia\\vntrust\\src\\app\\dashboard\\haukiem\\page.tsx', remote: '/var/www/vntrust/src/app/dashboard/haukiem/page.tsx' },
  { local: 'd:\\Web hang gia\\vntrust\\prisma\\schema.prisma', remote: '/var/www/vntrust/prisma/schema.prisma' },
];

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected');
  conn.exec('mkdir -p /var/www/vntrust/src/app/api/logs', (mkdirErr, mkdirStream) => {
    mkdirStream.on('close', () => {
      conn.sftp((err, sftp) => {
        if (err) throw err;

        const uploadNext = (index) => {
          if (index >= filesToUpload.length) {
            console.log('All files uploaded. Running generate + db push + build...');
            const cmd = 'cd /var/www/vntrust && npx prisma generate && npx prisma db push && npm run build && pm2 restart vntrust && pm2 list';
            conn.exec(cmd, (err, stream) => {
              if (err) throw err;
              stream.on('close', (code) => {
                console.log('Done. Exit code:', code);
                conn.end();
              }).on('data', (data) => {
                process.stdout.write(data);
              }).stderr.on('data', (data) => {
                process.stderr.write(data);
              });
            });
            return;
          }

          const { local, remote } = filesToUpload[index];
          const content = fs.readFileSync(local);
          const ws = sftp.createWriteStream(remote);
          ws.on('close', () => {
            console.log(`✓ ${remote}`);
            uploadNext(index + 1);
          });
          ws.on('error', (err) => {
            console.error(`✗ ${remote}: ${err.message}`);
            uploadNext(index + 1);
          });
          ws.write(content);
          ws.end();
        };

        uploadNext(0);
      });
    });
    mkdirStream.resume();
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
