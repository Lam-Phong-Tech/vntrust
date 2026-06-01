const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(`cat << 'EOF' > /tmp/setup_vntrust.sh
#!/bin/bash
set -e
APP_DIR="/var/www/vntrust"
APP_PORT=3001
DOMAIN="anticounterfeit.test9.io.vn"
SERVICE="vntrust"

echo "[4/6] Cài node_modules và Prisma..."
cd $APP_DIR
npm install --legacy-peer-deps --production || npm install --legacy-peer-deps
npx prisma generate

if [ ! -f "$APP_DIR/prisma/vntrust.db" ]; then
  echo "Tạo database..."
  npx prisma db push
fi

echo "[5/6] Khởi động với PM2..."
pm2 delete $SERVICE 2>/dev/null || true
PORT=$APP_PORT pm2 start npm --name "$SERVICE" -- start
pm2 save

echo "[6/6] Cấu hình Nginx..."
cat > /etc/nginx/sites-available/$SERVICE << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
NGINX

if [ -L "/etc/nginx/sites-enabled/$SERVICE" ]; then
  rm /etc/nginx/sites-enabled/$SERVICE
fi
ln -s /etc/nginx/sites-available/$SERVICE /etc/nginx/sites-enabled/$SERVICE

nginx -t && nginx -s reload

echo "DONE!"
EOF
chmod +x /tmp/setup_vntrust.sh && /tmp/setup_vntrust.sh
`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code);
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
