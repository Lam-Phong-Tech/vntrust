const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec(`
echo "════════════════════════════════════════════════════════════════"
echo "1. SOURCE FILES TRÊN VPS — Phase 7-11"
echo "════════════════════════════════════════════════════════════════"
for f in \\
  src/app/api/cron/escalate/route.ts \\
  src/app/api/cron/daily-digest/route.ts \\
  src/app/api/trust-score/[uid]/route.ts \\
  src/app/api/qr/encrypt/route.ts \\
  src/app/api/qr/decrypt/route.ts \\
  src/app/api/webhook/route.ts \\
  src/app/api/webhook/test/route.ts \\
  src/app/api/ocr/extract/route.ts \\
  src/app/api/report/check-duplicate/route.ts \\
  src/app/api/analytics-multi/route.ts \\
  src/app/api/vault/identity/route.ts \\
  src/app/api/vault/report/route.ts \\
  src/lib/aesQR.ts \\
  src/lib/webhook.ts \\
  src/lib/imageHash.ts \\
  src/lib/vaultCrypto.ts; do
  if [ -f "/var/www/vntrust/\$f" ]; then
    SIZE=\$(stat -c '%s' "/var/www/vntrust/\$f")
    MTIME=\$(stat -c '%y' "/var/www/vntrust/\$f" | cut -c1-19)
    echo "  ✓ \$f (\$SIZE bytes, \$MTIME)"
  else
    echo "  ✗ MISS: \$f"
  fi
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "2. SCHEMA MODELS"
echo "════════════════════════════════════════════════════════════════"
grep -E "^model [A-Z]" /var/www/vntrust/prisma/schema.prisma | sort

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "3. NEW FIELDS TRÊN SCHEMA"
echo "════════════════════════════════════════════════════════════════"
echo "--- MaDinhDanh.encryptedToken ---"
grep -A1 "encryptedToken" /var/www/vntrust/prisma/schema.prisma | head -3
echo "--- CanhBao.loaiPhanAnh + nguoiBaoCao + escalateLevel ---"
grep -E "loaiPhanAnh|nguoiBaoCao|escalateLevel|hinhAnhHash" /var/www/vntrust/prisma/schema.prisma
echo "--- KetQuaHauKiem.chiTieuPhanTich ---"
grep "chiTieuPhanTich\\|ruleEngineVersion" /var/www/vntrust/prisma/schema.prisma

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "4. CRONTAB ĐÃ SETUP"
echo "════════════════════════════════════════════════════════════════"
crontab -l | grep -E "VNTrust|anticounterfeit"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "5. PM2 vntrust"
echo "════════════════════════════════════════════════════════════════"
pm2 list | grep "vntrust\\|mock-vneid"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "6. BUILD ID CURRENT"
echo "════════════════════════════════════════════════════════════════"
cat /var/www/vntrust/.next/BUILD_ID
stat -c "  built at: %y" /var/www/vntrust/.next/BUILD_ID

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "7. DB ROW COUNTS"
echo "════════════════════════════════════════════════════════════════"
sqlite3 /var/www/vntrust/dev.db <<'SQL'
.headers off
SELECT 'IdentityVault: ' || COUNT(*) FROM IdentityVault;
SELECT 'ReportVault: ' || COUNT(*) FROM ReportVault;
SELECT 'AnonymousSession: ' || COUNT(*) FROM AnonymousSession;
SELECT 'WebhookErp: ' || COUNT(*) FROM WebhookErp;
SELECT 'CauHinhHeThong: ' || COUNT(*) FROM CauHinhHeThong;
SELECT 'YeuCauTuanThuVSIC: ' || COUNT(*) FROM YeuCauTuanThuVSIC;
SELECT 'TieuChuanKiemNghiem: ' || COUNT(*) FROM TieuChuanKiemNghiem;
SQL
  `, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
