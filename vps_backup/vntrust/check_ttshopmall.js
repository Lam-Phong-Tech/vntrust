const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  // Xem nội dung file ttshopmall - thủ phạm đang chiếm domain
  conn.exec('cat /etc/nginx/sites-enabled/ttshopmall && echo "---" && cat /etc/nginx/sites-available/ttshopmall', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
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
  password: 'nSmaPGEY39'
});
