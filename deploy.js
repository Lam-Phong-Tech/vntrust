const Client = require('ssh2').Client;
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP connected. Uploading deploy.tar.gz...');
    sftp.fastPut('deploy.tar.gz', '/var/www/deploy.tar.gz', (err) => {
      if (err) throw err;
      console.log('Upload complete. Extracting and setting up...');
      
      const commands = [
        'cd /var/www',
        'mkdir -p vntrust',
        'tar -xzf deploy.tar.gz -C vntrust',
        'cd vntrust',
        'export DATABASE_URL="file:./dev.db"',
        'npm install --legacy-peer-deps',
        'npx prisma db push',
        'npx prisma generate',
        'npm run build',
        'pm2 stop vntrust || true',
        'pm2 delete vntrust || true',
        'pm2 start npm --name "vntrust" -- start -- -p 3009',
        'pm2 save',
        // Configure Nginx
        `cat << 'EOF' > /etc/nginx/sites-available/anticounterfeit.test9.io.vn
server {
    listen 80;
    server_name anticounterfeit.test9.io.vn;

    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
    }
}
EOF`,
        'ln -sf /etc/nginx/sites-available/anticounterfeit.test9.io.vn /etc/nginx/sites-enabled/',
        'nginx -t && systemctl reload nginx'
      ];

      conn.exec(commands.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
          conn.end();
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'nSmaPGEY39',
  readyTimeout: 60000
});
