const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const UPLOADS = [
  { local: 'src/app/api/inventory/[id]/route.ts', remote: '/var/www/vntrust/src/app/api/inventory/[id]/route.ts' },
  { local: 'src/app/api/inventory/route.ts', remote: '/var/www/vntrust/src/app/api/inventory/route.ts' },
  { local: 'src/app/api/auth/register/route.ts', remote: '/var/www/vntrust/src/app/api/auth/register/route.ts' },
  { local: 'src/app/dashboard/haukiem/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/haukiem/page.tsx' },
  { local: 'src/app/dashboard/history/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/history/page.tsx' },
  { local: 'src/app/dashboard/inventory/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/inventory/page.tsx' },
  { local: 'src/app/dashboard/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/page.tsx' },
  { local: 'src/app/globals.css', remote: '/var/www/vntrust/src/app/globals.css' },
  { local: 'src/app/login/page.tsx', remote: '/var/www/vntrust/src/app/login/page.tsx' },
  { local: 'src/app/supply-chain/page.tsx', remote: '/var/www/vntrust/src/app/supply-chain/page.tsx' },
  { local: 'src/app/verify/[uid]/page.tsx', remote: '/var/www/vntrust/src/app/verify/[uid]/page.tsx' },
  { local: 'src/components/Footer.tsx', remote: '/var/www/vntrust/src/components/Footer.tsx' },
  { local: 'src/components/Navbar.tsx', remote: '/var/www/vntrust/src/components/Navbar.tsx' },
  { local: 'src/components/VietnamMap.tsx', remote: '/var/www/vntrust/src/components/VietnamMap.tsx' },
  { local: 'src/contexts/ChatContext.tsx', remote: '/var/www/vntrust/src/contexts/ChatContext.tsx' },
  { local: 'src/contexts/LanguageContext.tsx', remote: '/var/www/vntrust/src/contexts/LanguageContext.tsx' },
  { local: 'src/hooks/useLogs.ts', remote: '/var/www/vntrust/src/hooks/useLogs.ts' },
  { local: 'src/app/api/ip/route.ts', remote: '/var/www/vntrust/src/app/api/ip/route.ts' },
];

console.log("Starting redeploy script...");

const conn = new Client();
conn.on('ready', () => {
  console.log("Client ready");
  conn.sftp((err, sftp) => {
    if (err) throw err;

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
            console.log('\\nRedeploy done, exit: ' + code);
            conn.end();
            process.exit(0);
          }).on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write(d));
        });
        return;
      }
      
      const { local, remote } = UPLOADS[i];
      console.log(`Uploading [${i+1}/${UPLOADS.length}] ${local}...`);
      
      // Ensure directory exists via ssh exec before put
      const remoteDir = path.dirname(remote).replace(/\\/g, '/');
      conn.exec(`mkdir -p "${remoteDir}"`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          sftp.fastPut(path.join(__dirname, local), remote, (err) => {
            if (err) { console.error('Upload failed for', local, err); return; }
            uploadNext(i + 1);
          });
        }).on('data', () => {}).stderr.on('data', () => {}); // consume data
      });
    };

    uploadNext(0);
  });
}).on('error', (err) => {
  console.error("SSH connection error:", err);
  process.exit(1);
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026',
  readyTimeout: 10000
});
