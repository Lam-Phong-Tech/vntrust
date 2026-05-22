const fs = require('fs');

const html = fs.readFileSync('vntrust_mobile.html', 'utf8');

const rootMatch = html.match(/:root\s*\{[\s\S]*?\}/);
const displayMatch = html.match(/\.display\s*\{[\s\S]*?\}/);
const monoMatch = html.match(/\.mono\s*\{[\s\S]*?\}/);

const sAuthMatch = html.match(/\.s-auth\s*\{[\s\S]*?\.s-report-cta-btn\s+svg\s*\{[\s\S]*?\}/);

let cssContent = `
/* EXTRACTED FROM vntrust_mobile.html */
${rootMatch ? rootMatch[0] : ''}

${displayMatch ? displayMatch[0] : ''}

${monoMatch ? monoMatch[0] : ''}

.s-result-wrapper {
  background: var(--ink);
  color: var(--cream);
  min-height: 100vh;
  position: relative;
  font-family: 'Outfit', sans-serif;
  overflow-x: hidden;
}

${sAuthMatch ? sAuthMatch[0] : ''}
`;

fs.writeFileSync('src/app/verify/[uid]/result.css', cssContent);
console.log('Successfully extracted CSS to result.css');
