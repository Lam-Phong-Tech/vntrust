const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /etc/nginx/sites-available/anticounterfeit.test9.io.vn
server {
    listen 80;
    listen 443 ssl;
    server_name anticounterfeit.test9.io.vn;

    ssl_certificate /etc/letsencrypt/live/anticounterfeit.test9.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anticounterfeit.test9.io.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
nginx -t && nginx -s reload
`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
