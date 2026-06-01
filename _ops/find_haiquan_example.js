const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec("sqlite3 /var/www/vntrust/dev.db \"SELECT soToKhaiHQ,maLo,nuocXuatXu,hsCode,cuaKhau FROM LoHang WHERE soToKhaiHQ IS NOT NULL LIMIT 5;\" 2>&1 ; echo '---certs---' ; sqlite3 /var/www/vntrust/dev.db \"SELECT loai,soChungNhan,toChucCap FROM ChungNhan LIMIT 5;\" 2>&1", (e, s) => {
    let out = '';
    s.on('close', () => { console.log(out); c.end(); }).on('data', d => out += d);
  });
}).connect({host:'45.119.83.233', username:'root', password:'Tailoc@2026'});
