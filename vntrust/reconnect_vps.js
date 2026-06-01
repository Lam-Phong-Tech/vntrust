const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Connected! Fixing anticounterfeit nginx config...');
  
  const pythonScript = `
import os

D = chr(36)  # $ sign

conf = f"""server {{
    listen 80;
    server_name anticounterfeit.test9.io.vn;
    return 301 https://{D}host{D}request_uri;
}}

server {{
    listen 443 ssl;
    server_name anticounterfeit.test9.io.vn;

    ssl_certificate /etc/letsencrypt/live/anticounterfeit.test9.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anticounterfeit.test9.io.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location /uploads/ {{
        alias /var/www/vntrust/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
        try_files {D}uri =404;
    }}

    location / {{
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade {D}http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host {D}host;
        proxy_set_header X-Real-IP {D}remote_addr;
        proxy_set_header X-Forwarded-For {D}proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto {D}scheme;
    }}
}}
"""

path = "/etc/nginx/sites-enabled/anticounterfeit.test9.io.vn"
with open(path, "w") as f:
    f.write(conf)
print(f"Written {len(conf)} bytes to {path}")
`;

  conn.exec(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      if (code !== 0) {
        console.log('Failed to write config');
        conn.end();
        return;
      }
      console.log('\n✅ Config written. Testing and reloading...');
      
      const verifyCmd = [
        'nginx -t 2>&1',
        'nginx -s reload 2>&1',
        'sleep 2',
        'echo "=== TEST ===" && curl -sk --max-time 5 -o /dev/null -w "HTTPS: %{http_code}\\n" https://anticounterfeit.test9.io.vn --resolve anticounterfeit.test9.io.vn:443:127.0.0.1',
        'echo "=== DONE ==="',
      ].join(' && ');
      
      conn.exec(verifyCmd, (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('close', (c) => {
          console.log('\n--- Exit: ' + c + ' ---');
          conn.end();
        }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
      });
    }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', err => console.error('❌', err.message))
.connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026', readyTimeout: 30000 });
