const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client ready');
  conn.exec('mkdir -p /var/www/vntrust/src/app/api/inventory/\\[id\\]/qr', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('Dir created');
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
