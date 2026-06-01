const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected');
  const cmd = 'cd /var/www/vntrust && npx prisma generate && npx prisma db push && npm run build && pm2 restart vntrust && pm2 list';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Done. Exit code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
