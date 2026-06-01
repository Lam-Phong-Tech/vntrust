const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Streaming PM2 logs... Press Ctrl+C to stop\n');
  conn.exec('pm2 logs vntrust --lines 0 2>&1', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => { conn.end(); process.exit(0); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => { console.error(e); process.exit(1); })
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
