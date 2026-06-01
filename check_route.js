const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Kiểm tra xem file trên server có đúng với local không
  const cmd = `grep -n "sendOtp\|send-otp\|SMTP\|nodemailer" /var/www/vntrust/src/app/api/auth/send-otp/route.ts | head -20`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => { conn.end(); process.exit(0); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
