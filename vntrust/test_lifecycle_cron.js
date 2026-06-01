const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -s -X GET "http://127.0.0.1:3001/api/lifecycle-check?secret=vntrust-cron-key"', (err, stream) => {
    stream.on('data', d => console.log('API Response:', d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
