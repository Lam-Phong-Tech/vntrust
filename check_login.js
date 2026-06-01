const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Check xem login page trên server có chứa sendOtp function không
  const cmd = `grep -n "sendOtp\|send-otp\|otpEmail\|otpStep" /var/www/vntrust/src/app/login/page.tsx | head -15 2>&1 || echo "FILE NOT FOUND or grep failed"`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => { conn.end(); process.exit(0); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
