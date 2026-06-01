const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready. Executing remote commands...');
  
  const commands = [
    'cd /var/www/vntrust',
    'git pull origin master',
    'npm run build',
    'pm2 restart vntrust',
    'echo "=== DEPLOYMENT SUCCESSFUL ==="'
  ];

  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code);
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
  password: 'Tailoc@2026',
  readyTimeout: 60000
});
