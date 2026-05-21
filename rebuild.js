const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmds = [
    'cd /var/www/vntrust',
    'echo "=== START BUILD ==="',
    'npm run build 2>&1',
    'echo "=== START PM2 ==="',
    'pm2 restart vntrust'
  ];
  conn.exec(cmds.join(' && '), (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'nSmaPGEY39'
});
