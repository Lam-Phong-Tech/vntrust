// V2: tách "bg-white" thuần (light) khỏi "bg-white/N" (dark overlay)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, 'prod_snapshot/src/app/dashboard');

const DARK_THEME_INDICATORS = [
  // Login palette
  { re: /#0B1623|#0F1620|#142235|#1E3148|#0d1b2e/gi, tag: 'dark-bg-hex' },
  { re: /#F6F1E8|#EDE6D6/g, tag: 'cream-hex' },
  { re: /#C8A557|#A6873E|#E4D2A1|#C8893A/g, tag: 'gold-hex' },
  { re: /\bbg-white\/\d+/g, tag: 'bg-white-overlay' }, // overlay (dark UI pattern)
  { re: /\bborder-white\/\d+/g, tag: 'border-white-overlay' },
  { re: /\btext-white\b/g, tag: 'text-white' },
  { re: /\btext-slate-(100|200|300)\b/g, tag: 'text-slate-light' },
  { re: /\bbg-slate-(700|800|900|950)\b/g, tag: 'bg-slate-dark' },
  { re: /\bbg-black\b/g, tag: 'bg-black' },
  { re: /Fraunces/g, tag: 'fraunces' },
  { re: /\btext-amber-\d+\b/g, tag: 'amber-accent' },
  { re: /\bbg-amber-500\/\d+\b/g, tag: 'amber-bg' },
];

// THỰC SỰ light/off-theme indicators (loại trừ overlay):
const LIGHT_THEME_INDICATORS = [
  { re: /\bbg-white(?![\/\-\w])/g, tag: 'bg-white-solid' }, // word boundary excluding /N and -hover
  { re: /\bbg-gray-(50|100|200)(?![\/\-\w])/g, tag: 'bg-gray-light' },
  { re: /\bbg-slate-(50|100|200|300)(?![\/\-\w])/g, tag: 'bg-slate-light' },
  { re: /\bbg-zinc-(50|100|200)(?![\/\-\w])/g, tag: 'bg-zinc-light' },
  { re: /\bbg-neutral-(50|100|200)(?![\/\-\w])/g, tag: 'bg-neutral-light' },
  { re: /\btext-gray-(700|800|900)\b/g, tag: 'text-gray-dark' },
  { re: /\btext-slate-(700|800|900)\b/g, tag: 'text-slate-dark' },
  { re: /background:\s*['"]?#fff(fff)?\b/gi, tag: 'inline-white' },
  { re: /background:\s*['"]?white\b/gi, tag: 'inline-white-name' },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name === 'page.tsx') files.push(full);
  }
  return files;
}

const files = walk(ROOT);
const reports = [];

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const darkHits = new Map();
  const lightHits = new Map();

  for (const t of DARK_THEME_INDICATORS) {
    const m = txt.match(t.re);
    if (m) darkHits.set(t.tag, m.length);
  }
  for (const t of LIGHT_THEME_INDICATORS) {
    const m = txt.match(t.re);
    if (m) lightHits.set(t.tag, m.length);
  }

  const darkScore = [...darkHits.values()].reduce((a, b) => a + b, 0);
  const lightScore = [...lightHits.values()].reduce((a, b) => a + b, 0);
  const ratio = darkScore / Math.max(1, lightScore);

  let verdict;
  if (lightScore === 0 && darkScore > 0) verdict = 'DARK-OK';
  else if (lightScore > 0 && darkScore === 0) verdict = 'LIGHT-OFF';
  else if (ratio >= 3) verdict = 'DARK-OK';
  else if (ratio >= 1) verdict = 'MIXED';
  else verdict = 'LIGHT-OFF';

  reports.push({
    page: rel,
    lines: txt.split('\n').length,
    darkScore,
    darkTags: [...darkHits.entries()].sort((a, b) => b[1] - a[1]),
    lightScore,
    lightTags: [...lightHits.entries()].sort((a, b) => b[1] - a[1]),
    verdict,
  });
}

reports.sort((a, b) => {
  const order = { 'LIGHT-OFF': 0, 'MIXED': 1, 'DARK-OK': 2 };
  return order[a.verdict] - order[b.verdict] || b.lightScore - a.lightScore;
});

console.log('\n=== DASHBOARD THEME ANALYSIS V2 (overlay-aware) ===\n');
console.log('| Page | Lines | Dark | Light | Verdict | Light tags (problematic) |');
console.log('|------|-------|-----:|------:|---------|---------------------------|');
for (const r of reports) {
  const lightTxt = r.lightTags.length > 0 ? r.lightTags.map(([t, n]) => `${t}×${n}`).join(', ') : '—';
  console.log(`| ${r.page.padEnd(28)} | ${String(r.lines).padStart(5)} | ${String(r.darkScore).padStart(4)} | ${String(r.lightScore).padStart(5)} | ${r.verdict.padEnd(9)} | ${lightTxt} |`);
}

console.log('\n=== SUMMARY ===');
const counts = { 'DARK-OK': 0, 'MIXED': 0, 'LIGHT-OFF': 0 };
reports.forEach(r => counts[r.verdict]++);
console.log(JSON.stringify(counts, null, 2));

fs.writeFileSync(path.join(__dirname, 'theme_analysis_v2.json'), JSON.stringify(reports, null, 2));
