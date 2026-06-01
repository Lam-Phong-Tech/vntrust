const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmds = [
    'pm2 stop vntrust',
    'rm -f /var/www/vntrust/dev.db-wal',
    'rm -f /var/www/vntrust/dev.db-shm',
    'cp /var/www/vntrust/dev.db.bak /var/www/vntrust/dev.db',
    'pm2 start vntrust'
  ].join(' && ');

  conn.exec(cmds, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
