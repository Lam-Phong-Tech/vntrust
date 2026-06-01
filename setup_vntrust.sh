#!/bin/bash
# VNTrust Full Setup Script
# Cấu hình chỉ cho domain: anticounterfeit.test9.io.vn
# Port riêng: 3001 (không đụng port 3000 của hệ thống khác)

set -e
APP_DIR="/var/www/vntrust"
APP_PORT=3001
DOMAIN="anticounterfeit.test9.io.vn"
SERVICE="vntrust"

echo ""
echo "========================================"
echo " VNTrust Deploy - $DOMAIN"
echo " Port: $APP_PORT"
echo "========================================"
echo ""

# === 1. Node.js ===
echo "[1/6] Kiểm tra Node.js..."
if ! command -v node &>/dev/null; then
  echo "Cài Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

# === 2. PM2 ===
echo "[2/6] Kiểm tra PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

# === 3. Giải nén ===
echo "[3/6] Giải nén ứng dụng..."
rm -rf $APP_DIR
mkdir -p $APP_DIR
tar -xzf /tmp/vntrust_deploy.tar.gz -C /var/www/
# Nếu giải nén ra thư mục con tên "vntrust", đổi lại
if [ -d "/var/www/vntrust" ]; then
  echo "Thư mục $APP_DIR đã có."
fi

# === 4. Cài dependencies & generate Prisma ===
echo "[4/6] Cài node_modules và Prisma..."
cd $APP_DIR
npm install --production 2>&1 | tail -5
npx prisma generate 2>&1 | tail -5

# Khởi tạo DB nếu chưa có
if [ ! -f "$APP_DIR/prisma/vntrust.db" ]; then
  echo "Tạo database..."
  npx prisma db push 2>&1 | tail -10
fi

# === 5. PM2 ===
echo "[5/6] Khởi động với PM2 trên port $APP_PORT..."
pm2 delete $SERVICE 2>/dev/null || true
PORT=$APP_PORT pm2 start npm --name "$SERVICE" -- start
pm2 save
pm2 startup systemd -u root --hp /root 2>&1 | tail -3

# === 6. Nginx ===
echo "[6/6] Cấu hình Nginx virtual host..."
cat > /etc/nginx/sites-available/$SERVICE << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    # Bảo mật cơ bản
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINX

# Enable site (symlink)
if [ -L "/etc/nginx/sites-enabled/$SERVICE" ]; then
  rm /etc/nginx/sites-enabled/$SERVICE
fi
ln -s /etc/nginx/sites-available/$SERVICE /etc/nginx/sites-enabled/$SERVICE

# Test + reload
echo "Kiểm tra cấu hình Nginx..."
nginx -t && nginx -s reload

echo ""
echo "========================================"
echo " DONE! VNTrust đang chạy tại:"
echo " http://$DOMAIN"
echo " (Port nội bộ: $APP_PORT)"
echo ""
pm2 status $SERVICE
echo "========================================"
