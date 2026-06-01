const fs = require('fs');
const { Client } = require('ssh2');

const pageContent = fs.readFileSync('d:\\Web hang gia\\vntrust\\src\\app\\supply-chain\\page.tsx', 'utf8');
const routeContent = fs.readFileSync('d:\\Web hang gia\\vntrust\\src\\app\\api\\stats\\route.ts', 'utf8');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const writePage = sftp.createWriteStream('/var/www/vntrust/src/app/supply-chain/page.tsx');
    writePage.on('close', () => {
      console.log('page.tsx transferred');
      
      const writeRoute = sftp.createWriteStream('/var/www/vntrust/src/app/api/stats/route.ts');
      writeRoute.on('close', () => {
        console.log('route.ts transferred');
        
        conn.exec('cd /var/www/vntrust && npm run build && pm2 restart vntrust', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code, signal) => {
            console.log('Build and restart done. Code:', code);
            conn.end();
          }).on('data', (data) => {
            process.stdout.write(data);
          }).stderr.on('data', (data) => {
            process.stderr.write(data);
          });
        });
      });
      writeRoute.write(routeContent);
      writeRoute.end();
    });
    writePage.write(pageContent);
    writePage.end();
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
