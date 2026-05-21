#!/bin/bash
# VNTrust Deploy Script - chỉ cho domain anticounterfeit.test9.io.vn
set -e

APP_DIR="/var/www/vntrust"
APP_PORT=3001
DOMAIN="anticounterfeit.test9.io.vn"
SERVICE_NAME="vntrust"

echo "=== [1/5] Cài Node.js nếu chưa có ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

echo "=== [2/5] Tạo thư mục ứng dụng ==="
mkdir -p $APP_DIR

echo "=== [3/5] Cài PM2 nếu chưa có ==="
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi

echo "=== [4/5] Cài Nginx nếu chưa có ==="
apt-get install -y nginx

echo "=== [5/5] Tạo Nginx virtual host cho $DOMAIN ==="
cat > /etc/nginx/sites-available/$SERVICE_NAME << 'NGINX_EOF'
server {
    listen 80;
    server_name anticounterfeit.test9.io.vn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINX_EOF

# Chỉ enable nếu chưa có
if [ ! -L /etc/nginx/sites-enabled/$SERVICE_NAME ]; then
  ln -s /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/$SERVICE_NAME
fi

# Kiểm tra cấu hình Nginx trước khi reload
nginx -t && nginx -s reload

echo "=== Nginx virtual host đã cài xong cho $DOMAIN ==="

echo "=== Xong! App sẽ chạy tại port $APP_PORT ==="
