const { Client } = require('ssh2');
const path = require('path');
const conn = new Client();

const filesToUpload = [
  'prisma/schema.prisma',
  'src/app/api/certificates/route.ts',
  'src/app/api/inventory/route.ts',
  'src/app/api/verify/[uid]/route.ts',
  'src/app/api/upload/route.ts',
];

conn.on('ready', () => {
  console.log('Connected.');
  conn.exec('mkdir -p /var/www/vntrust/src/app/api/upload /var/www/vntrust/public/uploads/products /var/www/vntrust/public/uploads/certificates', (err, s0) => {
    s0.on('close', () => {
      conn.sftp((err, sftp) => {
        if (err) throw err;
        let uploaded = 0;
        const total = filesToUpload.length;

        const uploadNext = (i) => {
          if (i >= total) {
            console.log('All files uploaded. Running build...');
            conn.exec('cd /var/www/vntrust && npx prisma db push && npx prisma generate && npm run build && pm2 restart vntrust', (err, bs) => {
              bs.on('data', d => process.stdout.write(d));
              bs.stderr.on('data', d => process.stderr.write(d));
              bs.on('close', code => {
                console.log('\nBuild code:', code);
                conn.end();
              });
            });
            return;
          }
          const file = filesToUpload[i];
          sftp.fastPut(path.join(__dirname, file), `/var/www/vntrust/${file}`, (err) => {
            if (err) console.error(`FAIL ${file}:`, err.message);
            else console.log(`OK: ${file}`);
            uploadNext(i + 1);
          });
        };
        uploadNext(0);
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
