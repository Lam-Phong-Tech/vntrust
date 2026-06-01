const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  const commands = [
    'apt-get update',
    'apt-get install -y certbot python3-certbot-nginx',
    'certbot --nginx -d anticounterfeit.test9.io.vn --non-interactive --agree-tos --redirect -m admin@test9.io.vn',
    'systemctl reload nginx'
  ];

  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
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
