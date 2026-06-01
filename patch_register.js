const fs = require('fs');
const { Client } = require('ssh2');

const loginContent = fs.readFileSync('d:\\Web hang gia\\vntrust\\src\\app\\login\\page.tsx', 'utf8');
const registerContent = fs.readFileSync('d:\\Web hang gia\\vntrust\\src\\app\\api\\auth\\register\\route.ts', 'utf8');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const writeLogin = sftp.createWriteStream('/var/www/vntrust/src/app/login/page.tsx');
    writeLogin.on('close', () => {
      console.log('login page transferred');
      
      const writeRegister = sftp.createWriteStream('/var/www/vntrust/src/app/api/auth/register/route.ts');
      writeRegister.on('close', () => {
        console.log('register API transferred');
        
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
      writeRegister.write(registerContent);
      writeRegister.end();
    });
    writeLogin.write(loginContent);
    writeLogin.end();
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
