const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec("ls /var/www/vntrust/src/lib/integrationChecker.ts 2>&1 ; echo '---' ; ls /var/www/vntrust/src/app/dashboard/integration/ 2>&1", (e, s) => {
    let out = '';
    s.on('close', () => { console.log(out); c.end(); }).on('data', d => out += d);
  });
}).connect({host:'45.119.83.233', username:'root', password:'Tailoc@2026'});
