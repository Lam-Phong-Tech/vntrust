const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec("grep -nE 'grid-cols-3|hidden lg:block|order-1|order-2|col-span' /var/www/vntrust/src/app/dashboard/report/page.tsx | head -20", (e, s) => {
    let out = '';
    s.on('close', () => { console.log(out); c.end(); }).on('data', d => out += d);
  });
}).connect({host:'45.119.83.233', username:'root', password:'Tailoc@2026'});
