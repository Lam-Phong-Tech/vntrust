const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 delete vntrust && cd /var/www/vntrust && PORT=3001 pm2 start npm --name "vntrust" -- start && pm2 save', (err, stream) => {
    stream.on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d))
          .on('close', () => conn.end());
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
