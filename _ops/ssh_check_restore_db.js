const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec(`
    echo "=== List all DB backups ==="
    ls -la /var/www/vntrust/_backups/*/dev.db.bak 2>/dev/null | head -20
    echo ""
    echo "=== Older backup files ==="
    ls -la /var/www/vntrust/dev.db.bak /var/www/vntrust/_backups/*.bak 2>/dev/null | head -10
    echo ""
    echo "=== Current dev.db size ==="
    ls -la /var/www/vntrust/dev.db
    echo ""
    echo "=== sqlite3 check ==="
    which sqlite3
    if which sqlite3 >/dev/null; then
      sqlite3 /var/www/vntrust/dev.db "SELECT 'LuotQuet:' as t, COUNT(*) FROM LuotQuet; SELECT 'MaDinhDanh:', COUNT(*) FROM MaDinhDanh; SELECT 'CanhBao:', COUNT(*) FROM CanhBao; SELECT 'TieuChuanKiemNghiem:', COUNT(*) FROM TieuChuanKiemNghiem;"
    else
      apt install -y sqlite3 2>/dev/null
      sqlite3 /var/www/vntrust/dev.db "SELECT 'LuotQuet:', COUNT(*) FROM LuotQuet; SELECT 'MaDinhDanh:', COUNT(*) FROM MaDinhDanh;"
    fi
    echo ""
    echo "=== Compare with first backup ==="
    FIRST=$(ls /var/www/vntrust/_backups/full_batch.*/dev.db.bak 2>/dev/null | head -1)
    if [ -n "$FIRST" ]; then
      echo "Oldest backup: $FIRST ($(stat -c '%s' $FIRST) bytes)"
      sqlite3 $FIRST "SELECT 'BACKUP LuotQuet:', COUNT(*) FROM LuotQuet; SELECT 'BACKUP MaDinhDanh:', COUNT(*) FROM MaDinhDanh; SELECT 'BACKUP CanhBao:', COUNT(*) FROM CanhBao;"
    fi
    echo ""
    echo "=== dev.db.bak from /var/www/vntrust root ==="
    ls -la /var/www/vntrust/dev.db.bak 2>/dev/null
    if [ -f /var/www/vntrust/dev.db.bak ]; then
      sqlite3 /var/www/vntrust/dev.db.bak "SELECT 'ROOT.bak LuotQuet:', COUNT(*) FROM LuotQuet; SELECT 'ROOT.bak MaDinhDanh:', COUNT(*) FROM MaDinhDanh;"
    fi
  `, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => c.end()).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
