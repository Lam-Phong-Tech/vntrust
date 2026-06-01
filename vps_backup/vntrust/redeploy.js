const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const UPLOADS = [
  { local: 'src/components/Navbar.tsx',          remote: '/var/www/vntrust/src/components/Navbar.tsx' },
  { local: 'src/components/ClientShell.tsx',     remote: '/var/www/vntrust/src/components/ClientShell.tsx' },
  { local: 'src/contexts/ChatContext.tsx',        remote: '/var/www/vntrust/src/contexts/ChatContext.tsx' },
  { local: 'src/contexts/LanguageContext.tsx',    remote: '/var/www/vntrust/src/contexts/LanguageContext.tsx' },
  { local: 'src/app/dashboard/page.tsx',         remote: '/var/www/vntrust/src/app/dashboard/page.tsx' },
  { local: 'src/app/verify/page.tsx',            remote: '/var/www/vntrust/src/app/verify/page.tsx' },
  { local: 'src/app/enterprise/page.tsx',        remote: '/var/www/vntrust/src/app/enterprise/page.tsx' },
];

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;

    // Upload all files in sequence
    const uploadNext = (i) => {
      if (i >= UPLOADS.length) {
        console.log('All uploads done! Rebuilding...');
        const cmds = [
          'cd /var/www/vntrust',
          'npm run build 2>&1',
          'pm2 restart vntrust',
          'echo "=== DONE ==="'
        ];
        conn.exec(cmds.join(' && '), (err, stream) => {
          if (err) throw err;
          stream.on('close', (code) => {
            console.log('\nRedeploy done, exit: ' + code);
            conn.end();
          }).on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write(d));
        });
        return;
      }
      const { local, remote } = UPLOADS[i];
      console.log(`Uploading [${i+1}/${UPLOADS.length}] ${local}...`);
      sftp.fastPut(path.join(__dirname, local), remote, (err) => {
        if (err) { console.error('Upload failed:', err); return; }
        uploadNext(i + 1);
      });
    };

    uploadNext(0);
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'nSmaPGEY39'
});
