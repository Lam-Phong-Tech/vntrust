const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec("sqlite3 /var/www/vntrust/dev.db 'SELECT COUNT(*) as total FROM LuotQuet;' ; echo '---' ; sqlite3 /var/www/vntrust/dev.db 'SELECT diaChi_IP, ketQua, thoiGian FROM LuotQuet ORDER BY thoiGian DESC LIMIT 5;' ; echo '---UID count---' ; sqlite3 /var/www/vntrust/dev.db 'SELECT COUNT(*) FROM MaDinhDanh;' ; echo '---active UIDs sample---' ; sqlite3 /var/www/vntrust/dev.db 'SELECT uid FROM MaDinhDanh LIMIT 3;'", (e, s) => {
    let out = '';
    s.on('close', () => { console.log(out); c.end(); }).on('data', d => out += d);
  });
}).connect({host:'45.119.83.233', username:'root', password:'Tailoc@2026'});
