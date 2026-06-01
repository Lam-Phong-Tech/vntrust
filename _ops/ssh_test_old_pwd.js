const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  console.log('[ssh] OLD password STILL works');
  c.exec('hostname && date', (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d));
  });
}).on('error', e => console.error('SSH ERR:', e.message))
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 8000 });
