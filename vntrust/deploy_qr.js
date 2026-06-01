const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP connected');
    
    const files = [
      'src/app/api/inventory/[id]/qr/route.ts',
      'src/app/dashboard/inventory/[id]/qr/page.tsx'
    ];
    
    let uploaded = 0;
    
    const uploadNext = () => {
      if (uploaded >= files.length) {
        console.log('Running build on server...');
        conn.exec('cd /var/www/vntrust && npm run build && pm2 restart vntrust', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code, signal) => {
            console.log('Stream closed with code ' + code);
            conn.end();
          }).on('data', (data) => {
            console.log('STDOUT: ' + data.toString().substring(0, 500) + '...');
          }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
          });
        });
        return;
      }
      
      const file = files[uploaded];
      const localPath = file;
      const remotePath = '/var/www/vntrust/' + file;
      
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);
      
      writeStream.on('close', () => {
        console.log('Uploaded ' + file);
        uploaded++;
        uploadNext();
      });
      
      writeStream.on('error', (err) => {
         console.log('Error uploading ' + file + ':', err);
         uploaded++;
         uploadNext();
      });
      
      readStream.pipe(writeStream);
    };
    
    uploadNext();
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
