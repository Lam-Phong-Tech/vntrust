const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  // Print only key NAMES + length, NOT values (so log không leak secret)
  conn.exec(`cd /var/www/vntrust && [ -f .env ] && echo "ENV FILE FOUND" || echo "NO ENV FILE"; cd /var/www/vntrust && cat .env 2>/dev/null | grep -v "^#" | grep -v "^$" | awk -F= '{ n=length($2); secret=($1 ~ /SECRET|PASS|KEY|TOKEN/); if (secret) print $1"=<set,len="n">"; else print $0 }'`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 10000 });
