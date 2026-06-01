const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec("grep -nE 'flex flex-col$|max-h-\\[calc\\(100dvh|sticky footer|Sticky footer' /var/www/vntrust/src/app/dashboard/inventory/page.tsx | head -10 ; echo --- ; grep -nE 'flex gap-3 mt-8|sticky footer|paddingBottom.*safe-area' /var/www/vntrust/src/app/dashboard/inventory/page.tsx | head", (e, s) => {
    let out = '';
    s.on('close', () => { console.log(out); c.end(); }).on('data', d => out += d);
  });
}).connect({host:'45.119.83.233', username:'root', password:'Tailoc@2026'});
