// Chứng minh: source trên VPS = source patched, HTTPS public serve = same.
const { Client } = require('ssh2');
const c = new Client();

const cmd = `
echo "==============================================="
echo "1) THÔNG TIN VPS"
echo "==============================================="
hostname
uname -srm
echo ""
echo "Public IP gateway:"
ip route get 8.8.8.8 2>/dev/null | awk '{print $7; exit}'
echo ""
echo "Nginx config có domain anticounterfeit.test9.io.vn:"
grep -A1 "server_name anticounterfeit" /etc/nginx/sites-enabled/anticounterfeit.test9.io.vn | head -4

echo ""
echo "==============================================="
echo "2) NGUỒN FILE TRÊN VPS (profile/page.tsx)"
echo "==============================================="
echo ""
echo "--- mtime file ---"
stat -c "Modified: %y" /var/www/vntrust/src/app/dashboard/profile/page.tsx
echo ""
echo "--- 8 dòng đầu có #0B1623 ---"
grep -n "#0B1623" /var/www/vntrust/src/app/dashboard/profile/page.tsx | head -8
echo ""
echo "--- Tìm blue cũ #0d1b2e/#0a1628/#0d2040/#1a2235 (mong đợi 0 hit) ---"
grep -nE "#0d1b2e|#0a1628|#0d2040|#1a2235" /var/www/vntrust/src/app/dashboard/profile/page.tsx || echo "(không match - đã sạch)"
echo ""
echo "--- Đếm #C8A557 (gold thay amber) ---"
grep -c "#C8A557" /var/www/vntrust/src/app/dashboard/profile/page.tsx
echo ""
echo "--- Tìm amber-400/500 (mong đợi 0 hit) ---"
grep -cE "amber-(400|500)" /var/www/vntrust/src/app/dashboard/profile/page.tsx

echo ""
echo "==============================================="
echo "3) BUILD ID & PM2"
echo "==============================================="
echo "BUILD_ID:"
cat /var/www/vntrust/.next/BUILD_ID
echo ""
echo "BUILD_ID mtime:"
stat -c "%y" /var/www/vntrust/.next/BUILD_ID
echo ""
pm2 list | grep -E "vntrust|mock-vneid"

echo ""
echo "==============================================="
echo "4) BACKUP DIRS TRONG SESSION NÀY"
echo "==============================================="
ls -la /var/www/vntrust/_backups/ 2>/dev/null

echo ""
echo "==============================================="
echo "5) VPS TỰ CURL HTTPS PUBLIC URL"
echo "==============================================="
echo ""
echo "--- /dashboard/profile: đếm ink/gold mới ---"
curl -sk -b "userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/dashboard/profile" | grep -oE "#0B1623|#142235|#C8A557" | sort | uniq -c
echo ""
echo "--- /dashboard/profile: đếm blue/amber cũ (mong đợi 0) ---"
curl -sk -b "userRole=admin;userName=Admin" "https://anticounterfeit.test9.io.vn/dashboard/profile" | grep -oE "#0d1b2e|#0a1628|#0d2040|#1a2235|#0f1e33|amber-400|amber-500" | sort | uniq -c
echo ""
echo "--- /_vneid/healthz ---"
curl -sk "https://anticounterfeit.test9.io.vn/_vneid/healthz"
echo ""
echo "--- /api/auth/vneid/start (Phase 2) ---"
curl -sk -o /dev/null -w "STATUS=%{http_code}\\nLOC=%{redirect_url}\\n" --max-redirs 0 "https://anticounterfeit.test9.io.vn/api/auth/vneid/start?role=consumer"

echo ""
echo "==============================================="
echo "6) AUDIT LOG (NhatKy table)"
echo "==============================================="
which sqlite3 >/dev/null && sqlite3 /var/www/vntrust/dev.db "SELECT time, substr(action,1,60), ip, status FROM NhatKy WHERE action LIKE '%VNeID%' OR action LIKE '%Đăng nhập%' ORDER BY time DESC LIMIT 5;" 2>&1 || echo "(no sqlite3)"
`;

c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end())
      .on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', e => console.error('SSH:', e.message))
  .connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
