// Phân tích từng dashboard page xem có khớp theme login (ink/cream/gold) không
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, 'prod_snapshot/src/app/dashboard');

// Theme tokens (login page palette)
const ON_THEME = [
  { re: /#0B1623/i, tag: 'ink-bg' },
  { re: /#F6F1E8/i, tag: 'cream-fg' },
  { re: /#C8A557|#A6873E|#E4D2A1/i, tag: 'gold' },
  { re: /Fraunces/i, tag: 'fraunces-font' },
  { re: /rgba\(246,241,232/i, tag: 'cream-rgba' },
  { re: /rgba\(200,165,87/i, tag: 'gold-rgba' },
  { re: /rgba\(11,22,35/i, tag: 'ink-rgba' },
];

const OFF_THEME = [
  { re: /\bbg-white\b/, tag: 'bg-white' },
  { re: /\bbg-gray-(50|100|200)\b/, tag: 'bg-gray-light' },
  { re: /\bbg-slate-(50|100|200|300)\b/, tag: 'bg-slate-light' },
  { re: /\bbg-zinc-(50|100|200)\b/, tag: 'bg-zinc-light' },
  { re: /\bbg-neutral-(50|100|200)\b/, tag: 'bg-neutral-light' },
  { re: /background:\s*['"]?#fff(fff)?\b/i, tag: 'hex-white' },
  { re: /background:\s*['"]?white/i, tag: 'css-white' },
  { re: /backgroundColor:\s*['"]?#fff/i, tag: 'js-white' },
  { re: /backgroundColor:\s*['"]?white/i, tag: 'js-white-name' },
  { re: /\btext-gray-(700|800|900)\b/, tag: 'text-gray-dark' },
  { re: /\btext-slate-(700|800|900)\b/, tag: 'text-slate-dark' },
  { re: /from-blue-|from-indigo-|from-purple-|from-pink-|from-green-|from-emerald-|from-red-/, tag: 'tailwind-gradient' },
  { re: /font-family:\s*['"]?Manrope/i, tag: 'manrope-font-pinned' },
  { re: /font-family:\s*['"]?Inter/i, tag: 'inter-font-pinned' },
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
  const onHits = new Set();
  const offHits = new Map(); // tag → count

  for (const t of ON_THEME) {
    if (t.re.test(txt)) onHits.add(t.tag);
  }
  for (const t of OFF_THEME) {
    const matches = txt.match(new RegExp(t.re.source, t.re.flags + 'g')) || [];
    if (matches.length > 0) offHits.set(t.tag, matches.length);
  }

  const onScore = onHits.size;
  const offScore = [...offHits.values()].reduce((a, b) => a + b, 0);

  reports.push({
    page: rel,
    lines: txt.split('\n').length,
    onScore,
    onTags: [...onHits].sort(),
    offScore,
    offTags: [...offHits.entries()].sort((a, b) => b[1] - a[1]),
    classification: onScore >= 4 && offScore <= 2 ? 'ON-THEME'
      : offScore >= 5 ? 'OFF-THEME'
      : 'PARTIAL',
  });
}

reports.sort((a, b) => {
  const order = { 'OFF-THEME': 0, 'PARTIAL': 1, 'ON-THEME': 2 };
  return order[a.classification] - order[b.classification] || b.offScore - a.offScore;
});

console.log('\n=== DASHBOARD THEME ANALYSIS ===\n');
console.log('| Page | Lines | On | Off | Verdict | Top off-theme tags |');
console.log('|------|-------|----|----:|---------|---------------------|');
for (const r of reports) {
  const topOff = r.offTags.slice(0, 4).map(([t, n]) => `${t}×${n}`).join(', ') || '—';
  console.log(`| ${r.page.padEnd(28)} | ${String(r.lines).padStart(5)} | ${r.onScore} | ${String(r.offScore).padStart(3)} | ${r.classification.padEnd(9)} | ${topOff} |`);
}

console.log('\n=== SUMMARY ===');
const counts = { 'ON-THEME': 0, 'PARTIAL': 0, 'OFF-THEME': 0 };
reports.forEach(r => counts[r.classification]++);
console.log(JSON.stringify(counts, null, 2));

// Output detailed JSON for next step
fs.writeFileSync(path.join(__dirname, 'theme_analysis.json'), JSON.stringify(reports, null, 2));
console.log('\nDetail saved: _ops/theme_analysis.json');
