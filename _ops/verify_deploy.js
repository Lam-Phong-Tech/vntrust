const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const cmds = [
    "echo '=== Integration intro card on prod ==='",
    "grep -c 'Integration Hub làm gì\\|What does Integration Hub' /var/www/vntrust/src/app/dashboard/integration/page.tsx",
    "echo '=== Report stacked flex-col layout on prod ==='",
    "grep -c 'flex flex-col gap-5 sm:gap-6 max-w-3xl' /var/www/vntrust/src/app/dashboard/report/page.tsx",
    "echo '=== Should be 0 (no more lg:grid-cols-3) ==='",
    "grep -c 'grid grid-cols-1 lg:grid-cols-3' /var/www/vntrust/src/app/dashboard/report/page.tsx",
    "echo '=== gov-integration metadata (10 entries) ==='",
    "grep -cE '^  (haiquan|byt|bct|email|maps|camera_ai|bca|khcn|qltt|tmdt):' /var/www/vntrust/src/app/api/gov-integration/route.ts",
    "echo '=== Cron files exist ==='",
    "ls /var/www/vntrust/src/app/api/cron/purge-sessions/route.ts /var/www/vntrust/src/app/api/cron/key-rotation-check/route.ts",
    "echo '=== Key versioning constants in vaultCrypto ==='",
    "grep -c 'VAULT_KEY_VERSION\\|VAULT_KEY_ROTATION_DAYS' /var/www/vntrust/src/lib/vaultCrypto.ts",
    "echo '=== Last cron run log ==='",
    "tail -1 /tmp/cron-test 2>/dev/null || echo 'no manual log'",
  ];
  c.exec(cmds.join(' ; '), (e, s) => {
    let out = '';
    s.on('close', () => { console.log(out); c.end(); }).on('data', d => out += d);
  });
}).connect({host:'45.119.83.233', username:'root', password:'Tailoc@2026'});
