const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec(`
    echo "=== Tất cả API routes trên prod ==="
    find /var/www/vntrust/src/app/api -name "route.ts" | sed 's|/var/www/vntrust/src/app||; s|/route.ts||' | sort
    echo ""
    echo "=== Tất cả dashboard pages ==="
    find /var/www/vntrust/src/app/dashboard -name "page.tsx" | sed 's|/var/www/vntrust/src/app||; s|/page.tsx||' | sort
    echo ""
    echo "=== Components dùng chung ==="
    ls /var/www/vntrust/src/components/ 2>/dev/null | sort
    echo ""
    echo "=== Prisma models ==="
    grep -E "^model [A-Z]" /var/www/vntrust/prisma/schema.prisma | sort
    echo ""
    echo "=== DB row counts ==="
    sqlite3 /var/www/vntrust/dev.db <<'SQL'
.headers off
SELECT 'DoanhNghiep:' || COUNT(*) FROM DoanhNghiep;
SELECT 'NguoiDung:' || COUNT(*) FROM NguoiDung;
SELECT 'SanPham:' || COUNT(*) FROM SanPham;
SELECT 'LoHang:' || COUNT(*) FROM LoHang;
SELECT 'MaDinhDanh:' || COUNT(*) FROM MaDinhDanh;
SELECT 'LuotQuet:' || COUNT(*) FROM LuotQuet;
SELECT 'CanhBao:' || COUNT(*) FROM CanhBao;
SELECT 'ChungNhan:' || COUNT(*) FROM ChungNhan;
SELECT 'KetQuaHauKiem:' || COUNT(*) FROM KetQuaHauKiem;
SELECT 'TieuChuanKiemNghiem:' || COUNT(*) FROM TieuChuanKiemNghiem;
SELECT 'KhoHang:' || COUNT(*) FROM KhoHang;
SELECT 'NhatKy:' || COUNT(*) FROM NhatKy;
SELECT 'ThongBao:' || COUNT(*) FROM ThongBao;
SELECT 'DonChuyenHang:' || COUNT(*) FROM DonChuyenHang;
SQL
  `, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
