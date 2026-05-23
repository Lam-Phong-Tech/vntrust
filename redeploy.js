const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const UPLOADS = [
  { local: 'src/app/dashboard/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/page.tsx' },
  { local: 'src/app/verify/[uid]/page.tsx', remote: '/var/www/vntrust/src/app/verify/[uid]/page.tsx' },
  { local: 'src/app/verify/[uid]/result.css', remote: '/var/www/vntrust/src/app/verify/[uid]/result.css' },
  { local: 'src/app/verify/scan/page.tsx', remote: '/var/www/vntrust/src/app/verify/scan/page.tsx' },
  { local: 'src/app/verify/scan/scan.css', remote: '/var/www/vntrust/src/app/verify/scan/scan.css' },
  { local: 'src/components/ClientShell.tsx', remote: '/var/www/vntrust/src/components/ClientShell.tsx' },
  { local: 'src/components/MobileBottomNav.tsx', remote: '/var/www/vntrust/src/components/MobileBottomNav.tsx' },
  { local: 'src/app/dashboard/inventory/[id]/qr/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/inventory/[id]/qr/page.tsx' },
  { local: 'src/app/dashboard/analytics/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/analytics/page.tsx' },
  { local: 'src/app/dashboard/report/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/report/page.tsx' },
  { local: 'src/app/api/report/route.ts', remote: '/var/www/vntrust/src/app/api/report/route.ts' },
  { local: 'prisma/schema.prisma', remote: '/var/www/vntrust/prisma/schema.prisma' },
  { local: 'src/app/login/page.tsx', remote: '/var/www/vntrust/src/app/login/page.tsx' },
  { local: 'src/app/login/[role]/page.tsx', remote: '/var/www/vntrust/src/app/login/[role]/page.tsx' },
  { local: 'src/app/dashboard/create/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/create/page.tsx' },
  { local: 'src/app/dashboard/profile/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/profile/page.tsx' },
  { local: 'src/contexts/LanguageContext.tsx', remote: '/var/www/vntrust/src/contexts/LanguageContext.tsx' },
  { local: 'src/app/api/auth/me/route.ts', remote: '/var/www/vntrust/src/app/api/auth/me/route.ts' },
  { local: 'src/components/Navbar.tsx', remote: '/var/www/vntrust/src/components/Navbar.tsx' },
  { local: 'src/app/dashboard/kyc/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/kyc/page.tsx' },
  { local: 'src/app/api/upload/route.ts', remote: '/var/www/vntrust/src/app/api/upload/route.ts' },
  { local: 'src/app/api/auth/register/route.ts', remote: '/var/www/vntrust/src/app/api/auth/register/route.ts' },
  { local: 'src/app/api/auth/login/route.ts', remote: '/var/www/vntrust/src/app/api/auth/login/route.ts' },
  { local: 'src/lib/authGuard.ts', remote: '/var/www/vntrust/src/lib/authGuard.ts' },
  { local: 'src/components/Toast.tsx', remote: '/var/www/vntrust/src/components/Toast.tsx' },
  { local: 'src/components/BottomSheetModal.tsx', remote: '/var/www/vntrust/src/components/BottomSheetModal.tsx' },
  { local: 'src/app/dashboard/alerts/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/alerts/page.tsx' },
  { local: 'src/app/dashboard/certificates/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/certificates/page.tsx' },
  { local: 'src/app/dashboard/compliance/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/compliance/page.tsx' },
  { local: 'src/app/dashboard/haukiem/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/haukiem/page.tsx' },
  { local: 'src/app/dashboard/integration/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/integration/page.tsx' },
  { local: 'src/app/dashboard/inventory/[id]/qr/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/inventory/[id]/qr/page.tsx' },
  { local: 'src/app/dashboard/inventory/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/inventory/page.tsx' },
  { local: 'src/app/dashboard/security/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/security/page.tsx' },
  { local: 'src/app/dashboard/warehouse/page.tsx', remote: '/var/www/vntrust/src/app/dashboard/warehouse/page.tsx' },
  { local: 'src/app/api/inventory/route.ts', remote: '/var/www/vntrust/src/app/api/inventory/route.ts' },
  { local: 'src/app/api/inventory/[id]/route.ts', remote: '/var/www/vntrust/src/app/api/inventory/[id]/route.ts' },
  { local: 'src/app/api/distribution/route.ts', remote: '/var/www/vntrust/src/app/api/distribution/route.ts' },
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
          'npx prisma db push --accept-data-loss',
          'npx prisma generate',
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
        if (err) { console.error('Upload failed (skip):', local, err.message); }
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
