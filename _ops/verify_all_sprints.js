const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const cmds = [
    "echo '═══ Sprint 7 — §V (certValidityRules + webhook wired) ═══'",
    "ls -la /var/www/vntrust/src/lib/certValidityRules.ts 2>&1 | awk '{print $9, $5, \"bytes\"}'",
    "ls -la /var/www/vntrust/src/app/api/certificates/validity-rules/route.ts 2>&1 | awk '{print $9}'",
    "grep -c 'triggerWebhook\\|pushNotify' /var/www/vntrust/src/app/api/lifecycle-check/route.ts",
    "echo ''",
    "echo '═══ Sprint 8 — §VI (extended checklists + GTIN + heatmap) ═══'",
    "ls -la /var/www/vntrust/src/lib/complianceChecklists.ts 2>&1 | awk '{print $9, $5, \"bytes\"}'",
    "grep -c 'validateGTIN\\|priorityBreakdown\\|heatmap' /var/www/vntrust/src/app/api/compliance/route.ts",
    "echo ''",
    "echo '═══ Sprint 9 — §V.4 + §V.5 (config + 4 reports) ═══'",
    "ls -la /var/www/vntrust/src/lib/lifecycleConfig.ts 2>&1 | awk '{print $9}'",
    "ls -la /var/www/vntrust/src/app/api/lifecycle-config/route.ts 2>&1 | awk '{print $9}'",
    "ls -la /var/www/vntrust/src/app/api/lifecycle-reports/route.ts 2>&1 | awk '{print $9}'",
    "grep -c 'getLifecycleConfig\\|configFor\\|getExpWarnDaysForProduct' /var/www/vntrust/src/app/api/lifecycle-check/route.ts",
    "echo ''",
    "echo '═══ PM2 status ═══'",
    "pm2 list | grep -E 'vntrust|mock-vneid' | awk '{print $4, $6, $10, $12, $14}'",
    "echo ''",
    "echo '═══ Backups for Sprint 7-9 ═══'",
    "ls -la /var/www/vntrust/_backups/ | grep -E 'sprint[7-9]' | awk '{print $9, $6, $7, $8}'",
  ];
  c.exec(cmds.join(' ; '), (e, s) => {
    let out = '';
    s.on('close', () => { console.log(out); c.end(); }).on('data', d => out += d);
  });
}).connect({host:'45.119.83.233', username:'root', password:'Tailoc@2026'});
