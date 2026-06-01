const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;

    // Nội dung ttshopmall đã được làm sạch - bỏ block anticounterfeit đi
    const ttshopmallClean = `server {
    listen 443 ssl default_server;
    server_name trangha2004.online;
    root /var/www/trangha2004@gmail.online/public_html;
    index index.html index.htm index.php;

    ssl_certificate /etc/letsencrypt/live/trangha2004.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trangha2004.online/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /filemanager/userfiles/ {
        try_files $uri $uri/ =404;
        expires 30d;
        access_log off;
    }

    location ~* \\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot)$ {
        try_files $uri $uri/ =404;
        expires 30d;
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}

server {
    listen 80 default_server;
    server_name trangha2004.online;
    return 301 https://$host$request_uri;
}
`;

    // Config VNTrust đúng - dùng SSL cert của riêng nó
    const vntrustConfig = `server {
    listen 443 ssl;
    server_name anticounterfeit.test9.io.vn;

    ssl_certificate /etc/letsencrypt/live/anticounterfeit.test9.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anticounterfeit.test9.io.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name anticounterfeit.test9.io.vn;
    return 301 https://$host$request_uri;
}
`;

    // Ghi ttshopmall đã dọn sạch
    const w1 = sftp.createWriteStream('/etc/nginx/sites-available/ttshopmall');
    w1.on('close', () => {
      console.log('ttshopmall cleaned!');

      // Ghi config VNTrust đúng
      const w2 = sftp.createWriteStream('/etc/nginx/sites-available/anticounterfeit.test9.io.vn');
      w2.on('close', () => {
        console.log('VNTrust config written!');

        const cmds = [
          'ln -sf /etc/nginx/sites-available/anticounterfeit.test9.io.vn /etc/nginx/sites-enabled/anticounterfeit.test9.io.vn',
          'nginx -t',
          'systemctl reload nginx',
          'curl -sk -o /dev/null -w "Status: %{http_code}\\n" https://anticounterfeit.test9.io.vn'
        ];

        conn.exec(cmds.join(' && '), (err, stream) => {
          if (err) throw err;
          stream.on('close', (code) => {
            console.log('Done, exit: ' + code);
            conn.end();
          }).on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write(d));
        });
      });
      w2.write(vntrustConfig);
      w2.end();
    });
    w1.write(ttshopmallClean);
    w1.end();
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'nSmaPGEY39'
});
