const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();

const filesToUpload = [
  { local: 'src/app/api/map-stats/route.ts',                  remote: '/var/www/vntrust/src/app/api/map-stats/route.ts' },
  { local: 'src/app/dashboard/distribution/page.tsx',         remote: '/var/www/vntrust/src/app/dashboard/distribution/page.tsx' },
  { local: 'src/app/dashboard/certificates/page.tsx',         remote: '/var/www/vntrust/src/app/dashboard/certificates/page.tsx' },
];

const remoteDirs = [...new Set(filesToUpload.map(f => path.posix.dirname(f.remote)))];
const mkdirCmd = remoteDirs.map(d => `mkdir -p "${d}"`).join(' && ');

conn.on('ready', () => {
  console.log('Connected');
  conn.exec(mkdirCmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', () => {});        // must consume or stream won't close
    stream.stderr.on('data', () => {}); // must consume stderr too
    stream.on('close', () => {
      console.log('Dirs ready. Uploading...');
      conn.sftp((sftpErr, sftp) => {
        if (sftpErr) throw sftpErr;
        const uploadNext = (i) => {
          if (i >= filesToUpload.length) {
            console.log('All uploaded. Building...');
            conn.exec(
              'cd /var/www/vntrust && npx prisma generate && npm run build && pm2 restart vntrust',
              (err2, stream2) => {
                if (err2) throw err2;
                stream2.on('data', d => process.stdout.write(d.toString()));
                stream2.stderr.on('data', d => process.stderr.write(d.toString()));
                stream2.on('close', (code) => {
                  console.log('Done, exit code:', code);
                  conn.end();
                });
              }
            );
            return;
          }
          const f = filesToUpload[i];
          sftp.fastPut(f.local, f.remote, { concurrency: 1 }, (e) => {
            if (e) { console.error('FAIL', f.local, e.message); }
            else { console.log('OK', f.local); }
            uploadNext(i + 1);
          });
        };
        uploadNext(0);
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
