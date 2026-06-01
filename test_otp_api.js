const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Gọi API send-otp trực tiếp từ server để xem lỗi thật sự
  const cmd = `curl -s -X POST http://localhost:3001/api/auth/send-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"spyderrhq@gmail.com"}' 2>&1`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', () => {
      console.log('API Response:', out);
      conn.end(); process.exit(0);
    }).on('data', d => { out += d; process.stdout.write(d); })
      .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
