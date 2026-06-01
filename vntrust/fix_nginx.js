const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('Connected. Writing nginx config...');
  
  // Write the nginx config via a python heredoc to avoid shell escaping issues
  const cmd = `python3 -c "
import os

conf = '''server {
    listen 80;
    listen 443 ssl;
    server_name anticounterfeit.test9.io.vn;

    ssl_certificate /etc/letsencrypt/live/anticounterfeit.test9.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anticounterfeit.test9.io.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location /uploads/ {
        alias /var/www/vntrust/public/uploads/;
        expires 30d;
        add_header Cache-Control \\"public, immutable\\";
        add_header Access-Control-Allow-Origin *;
        try_files \\$uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}'''

with open('/etc/nginx/sites-enabled/anticounterfeit.test9.io.vn', 'w') as f:
    f.write(conf)
print('Written OK')
"`;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => {
      console.log('\nTesting nginx config...');
      conn.exec('nginx -t && nginx -s reload && echo NGINX_RELOADED', (err2, stream2) => {
        if (err2) { console.error(err2); conn.end(); return; }
        stream2.on('data', d => process.stdout.write(d.toString()));
        stream2.stderr.on('data', d => process.stderr.write(d.toString()));
        stream2.on('close', () => { conn.end(); });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
