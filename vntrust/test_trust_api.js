const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Testing trust-score API...');
  conn.exec(`curl -s -X GET http://127.0.0.1:3001/api/trust-score/TEST-UID`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log('TRUST:', d.toString()));
    stream.on('close', () => {
      console.log('Testing export-report API (Admin Cookie)...');
      conn.exec(`curl -s -X GET http://127.0.0.1:3001/api/export-report -b "userRole=admin"`, (err2, stream2) => {
        stream2.on('data', d => console.log('EXPORT:', d.toString()));
        stream2.on('close', () => conn.end());
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
