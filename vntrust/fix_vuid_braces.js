const fs = require('fs');
const path = 'src/app/verify/[uid]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue was we replaced "text" with {t("key")} inside JSX {}
// Let's replace { {t("key")} } with {t("key")}
content = content.replace(/\{\s*\{t\("([^"]+)"\)\}\s*\}/g, '{t("$1")}');
content = content.replace(/\{\s*\{t\('([^']+)'\)\}\s*\}/g, "{t('$1')}");

// There might also be nested in ternary like: isFake ? {t("vuid_2")} : ...
// Actually, in JSX, we have {isFake ? {t("vuid_2")} : isExpired ? {t("vuid_3")} : ...}
// This is parsed as { isFake ? {t("vuid_2")} : ... }
// We can use a regex that matches `? {t(...)` and replaces with `? t(...)`
content = content.replace(/\?\s*\{t\((["'][^"']+["'])\)\}/g, '? t($1)');
content = content.replace(/:\s*\{t\((["'][^"']+["'])\)\}/g, ': t($1)');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed curly braces');
