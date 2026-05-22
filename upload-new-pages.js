const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const NEW_FILES = [
  { local: 'src/app/dashboard/create/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/create/page.tsx', dir: '/var/www/vntrust/src/app/dashboard/create' },
  { local: 'src/app/dashboard/profile/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/profile/page.tsx', dir: '/var/www/vntrust/src/app/dashboard/profile' },
];

const conn = new Client();
conn.on('ready', () => {
  // Step 1: create directories
  const mkdirs = NEW_FILES.map(f => `mkdir -p "${f.dir}"`).join(' && ');
  conn.exec(mkdirs, (err, stream) => {
    if (err) { console.error('mkdir error:', err); conn.end(); return; }
    stream.on('close', () => {
      console.log('Directories created. Uploading files...');
      // Step 2: upload via SFTP
      conn.sftp((err, sftp) => {
        if (err) { console.error('SFTP error:', err); conn.end(); return; }
        const uploadNext = (i) => {
          if (i >= NEW_FILES.length) {
            console.log('All done!');
            conn.end();
            return;
          }
          const { local, remote } = NEW_FILES[i];
          console.log(`Uploading ${local}...`);
          sftp.fastPut(path.join(__dirname, local), remote, (err) => {
            if (err) console.error('Upload failed:', local, err.message);
            else console.log('OK:', local);
            uploadNext(i + 1);
          });
        };
        uploadNext(0);
      });
    }).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'nSmaPGEY39'
});
