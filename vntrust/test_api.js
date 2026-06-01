const { Client } = require('ssh2');
const conn = new Client();

const remoteScript = `
fetch('http://localhost:3000/api/distribution?role=manufacturer&doanhNghiepId=2c342c28-1f2f-4da6-92e7-9a3fd6946c61')
  .then(r => r.json())
  .then(d => {
    console.log('--- fetch batches ---');
    console.log('count:', d.batches ? d.batches.length : 0);
    if(d.batches) {
      d.batches.forEach(b => console.log(b.maLo, b.trangThai));
    } else {
      console.log(d);
    }
  })
  .catch(console.error);
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const ws = sftp.createWriteStream('/var/www/vntrust/test_api.js');
    ws.end(remoteScript, 'utf8', () => {
      conn.exec('cd /var/www/vntrust && node test_api.js 2>&1', (err2, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
          conn.exec('rm -f /var/www/vntrust/test_api.js', () => conn.end());
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 30000 });
