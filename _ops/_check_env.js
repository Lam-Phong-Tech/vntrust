const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/vntrust && grep -E "^(DEMO_|JWT_SECRET|VAULT_AES_KEY|NODE_ENV)" .env 2>/dev/null | sed 's/=.*=/=<set>=/g' | awk -F= '{ if (length($2) > 12) print $1"=<set,len="length($2)">"; else print $1"=<short:"$2">" }'`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 10000 });
