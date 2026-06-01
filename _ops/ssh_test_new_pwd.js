const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  console.log('[ssh] connected with new password OK');
  c.exec('hostname && date && pm2 list | grep vntrust', (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d));
  });
}).on('error', e => console.error('SSH ERR:', e.message))
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'nSmaPGEY39', readyTimeout: 8000 });
