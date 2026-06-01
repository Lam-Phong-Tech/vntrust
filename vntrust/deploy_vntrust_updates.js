const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

const filesToUpload = [
  { local: 'src/app/api/map-stats/route.ts',                  remote: '/var/www/vntrust/src/app/api/map-stats/route.ts' },
  { local: 'src/components/Navbar.tsx',                        remote: '/var/www/vntrust/src/components/Navbar.tsx' },
  { local: 'src/app/dashboard/page.tsx',                       remote: '/var/www/vntrust/src/app/dashboard/page.tsx' },
  { local: 'src/hooks/useGeolocation.tsx',                     remote: '/var/www/vntrust/src/hooks/useGeolocation.tsx' },
];

conn.on('ready', () => {
  console.log('Client ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP connected');
    
    // First make sure the nested directories exist
    conn.exec('mkdir -p /var/www/vntrust/src/app/login/\\[role\\] /var/www/vntrust/src/app/api/kyc', (err) => {
      // Ignore err
      
      let uploadedCount = 0;
      filesToUpload.forEach(file => {
        const localPath = file.local;
        const remotePath = file.remote;
        
        const readStream = fs.createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);
        
        writeStream.on('close', () => {
          console.log('Uploaded ' + localPath);
          uploadedCount++;
          if (uploadedCount === filesToUpload.length) {
             console.log('All files uploaded. Rebuilding Next.js and restarting pm2...');
             conn.exec('cd /var/www/vntrust && npm install --legacy-peer-deps && npx prisma db push --accept-data-loss && npm run build && pm2 restart vntrust', (err, stream) => {
               if (err) throw err;
               stream.on('close', (code, signal) => {
                 console.log('Stream closed with code ' + code);
                 conn.end();
               }).on('data', (data) => {
                 console.log('STDOUT: ' + data.toString().trim());
               }).stderr.on('data', (data) => {
                 console.log('STDERR: ' + data.toString().trim());
               });
             });
          }
        });
        
        writeStream.on('error', (err) => {
           console.log('Error uploading ' + localPath + ':', err);
        });
        
        readStream.pipe(writeStream);
      });
    });
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
