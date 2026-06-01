// Đồng bộ accent colors toàn hệ thống với palette login:
//   cyan/teal/blue/indigo/sky/violet/purple → GOLD #C8A557
//   emerald/green (text) → #6FB585 (verified-bright, readable on dark)
//   emerald/green (bg/border/from/to/via/ring) → #4A7C5C (verified)
//   red/rose/pink (critical status) → KEEP (status semantics)
//
// Operates on local vntrust/src/**/*.tsx files.
// Backup → _ops/prepatch_backup_accent/<ts>/

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../vntrust/src');
const BACKUP_ROOT = path.join(__dirname, 'prepatch_backup_accent', String(Date.now()));

// Files to skip — design intentionally needs the original colors
const SKIP_PATTERNS = [
  /[/\\]inventory[/\\]\[id\][/\\]qr[/\\]page\.tsx$/, // QR print — must stay light
];

const PRIMARY_COLORS = ['cyan', 'teal', 'sky', 'blue', 'indigo', 'violet', 'purple'];
const SUCCESS_COLORS = ['emerald', 'green'];
const SHADES = '(400|500|600)';

// Build transformation pairs
const TRANSFORMS = [];

// Primary palette → gold
for (const c of PRIMARY_COLORS) {
  // With opacity
  TRANSFORMS.push({ name: `text-${c}-op`,     from: new RegExp(`\\btext-${c}-${SHADES}\\/(\\d+)\\b`, 'g'),        to: 'text-[#C8A557]/$2' });
  TRANSFORMS.push({ name: `bg-${c}-op`,       from: new RegExp(`\\bbg-${c}-${SHADES}\\/(\\d+)\\b`, 'g'),          to: 'bg-[#C8A557]/$2' });
  TRANSFORMS.push({ name: `border-${c}-op`,   from: new RegExp(`\\bborder-${c}-${SHADES}\\/(\\d+)\\b`, 'g'),      to: 'border-[#C8A557]/$2' });
  TRANSFORMS.push({ name: `ring-${c}-op`,     from: new RegExp(`\\bring-${c}-${SHADES}\\/(\\d+)\\b`, 'g'),        to: 'ring-[#C8A557]/$2' });
  // Hover/focus variants
  TRANSFORMS.push({ name: `hover-text-${c}-op`, from: new RegExp(`\\bhover:text-${c}-${SHADES}\\/(\\d+)\\b`, 'g'), to: 'hover:text-[#C8A557]/$2' });
  TRANSFORMS.push({ name: `hover-bg-${c}-op`,   from: new RegExp(`\\bhover:bg-${c}-${SHADES}\\/(\\d+)\\b`, 'g'),   to: 'hover:bg-[#C8A557]/$2' });
  TRANSFORMS.push({ name: `focus-border-${c}-op`, from: new RegExp(`\\bfocus:border-${c}-${SHADES}\\/(\\d+)\\b`, 'g'), to: 'focus:border-[#C8A557]/$2' });
  // Solid (no opacity)
  TRANSFORMS.push({ name: `text-${c}`,        from: new RegExp(`\\btext-${c}-${SHADES}(?![\\/\\w-])`, 'g'),  to: 'text-[#C8A557]' });
  TRANSFORMS.push({ name: `bg-${c}`,          from: new RegExp(`\\bbg-${c}-${SHADES}(?![\\/\\w-])`, 'g'),    to: 'bg-[#C8A557]' });
  TRANSFORMS.push({ name: `border-${c}`,      from: new RegExp(`\\bborder-${c}-${SHADES}(?![\\/\\w-])`, 'g'), to: 'border-[#C8A557]' });
  TRANSFORMS.push({ name: `ring-${c}`,        from: new RegExp(`\\bring-${c}-${SHADES}(?![\\/\\w-])`, 'g'),  to: 'ring-[#C8A557]' });
  TRANSFORMS.push({ name: `hover-text-${c}`,  from: new RegExp(`\\bhover:text-${c}-${SHADES}(?![\\/\\w-])`, 'g'), to: 'hover:text-[#C8A557]' });
  TRANSFORMS.push({ name: `hover-bg-${c}`,    from: new RegExp(`\\bhover:bg-${c}-${SHADES}(?![\\/\\w-])`, 'g'),   to: 'hover:bg-[#C8A557]' });
  TRANSFORMS.push({ name: `focus-${c}`,       from: new RegExp(`\\bfocus:border-${c}-${SHADES}(?![\\/\\w-])`, 'g'), to: 'focus:border-[#C8A557]' });
  // Gradients
  TRANSFORMS.push({ name: `from-${c}`,        from: new RegExp(`\\bfrom-${c}-${SHADES}\\b`, 'g'),           to: 'from-[#C8A557]' });
  TRANSFORMS.push({ name: `to-${c}`,          from: new RegExp(`\\bto-${c}-${SHADES}\\b`, 'g'),             to: 'to-[#E4D2A1]' });
  TRANSFORMS.push({ name: `via-${c}`,         from: new RegExp(`\\bvia-${c}-${SHADES}\\b`, 'g'),            to: 'via-[#C8A557]' });
  // SVG fill/stroke
  TRANSFORMS.push({ name: `fill-${c}`,        from: new RegExp(`\\bfill-${c}-${SHADES}\\b`, 'g'),           to: 'fill-[#C8A557]' });
  TRANSFORMS.push({ name: `stroke-${c}`,      from: new RegExp(`\\bstroke-${c}-${SHADES}\\b`, 'g'),         to: 'stroke-[#C8A557]' });
}

// Success palette → verified
for (const c of SUCCESS_COLORS) {
  // Text → bright (#6FB585)
  TRANSFORMS.push({ name: `text-${c}-op`,     from: new RegExp(`\\btext-${c}-${SHADES}\\/(\\d+)\\b`, 'g'),    to: 'text-[#6FB585]/$2' });
  TRANSFORMS.push({ name: `text-${c}`,        from: new RegExp(`\\btext-${c}-${SHADES}(?![\\/\\w-])`, 'g'),  to: 'text-[#6FB585]' });
  TRANSFORMS.push({ name: `hover-text-${c}-op`, from: new RegExp(`\\bhover:text-${c}-${SHADES}\\/(\\d+)\\b`, 'g'), to: 'hover:text-[#6FB585]/$2' });
  TRANSFORMS.push({ name: `hover-text-${c}`,  from: new RegExp(`\\bhover:text-${c}-${SHADES}(?![\\/\\w-])`, 'g'), to: 'hover:text-[#6FB585]' });
  // bg/border/ring → verified darker (#4A7C5C)
  TRANSFORMS.push({ name: `bg-${c}-op`,       from: new RegExp(`\\bbg-${c}-${SHADES}\\/(\\d+)\\b`, 'g'),     to: 'bg-[#4A7C5C]/$2' });
  TRANSFORMS.push({ name: `bg-${c}`,          from: new RegExp(`\\bbg-${c}-${SHADES}(?![\\/\\w-])`, 'g'),    to: 'bg-[#4A7C5C]' });
  TRANSFORMS.push({ name: `border-${c}-op`,   from: new RegExp(`\\bborder-${c}-${SHADES}\\/(\\d+)\\b`, 'g'), to: 'border-[#4A7C5C]/$2' });
  TRANSFORMS.push({ name: `border-${c}`,      from: new RegExp(`\\bborder-${c}-${SHADES}(?![\\/\\w-])`, 'g'), to: 'border-[#4A7C5C]' });
  TRANSFORMS.push({ name: `ring-${c}-op`,     from: new RegExp(`\\bring-${c}-${SHADES}\\/(\\d+)\\b`, 'g'),   to: 'ring-[#4A7C5C]/$2' });
  TRANSFORMS.push({ name: `ring-${c}`,        from: new RegExp(`\\bring-${c}-${SHADES}(?![\\/\\w-])`, 'g'),  to: 'ring-[#4A7C5C]' });
  TRANSFORMS.push({ name: `hover-bg-${c}-op`, from: new RegExp(`\\bhover:bg-${c}-${SHADES}\\/(\\d+)\\b`, 'g'), to: 'hover:bg-[#4A7C5C]/$2' });
  TRANSFORMS.push({ name: `hover-bg-${c}`,    from: new RegExp(`\\bhover:bg-${c}-${SHADES}(?![\\/\\w-])`, 'g'), to: 'hover:bg-[#4A7C5C]' });
  TRANSFORMS.push({ name: `focus-border-${c}-op`, from: new RegExp(`\\bfocus:border-${c}-${SHADES}\\/(\\d+)\\b`, 'g'), to: 'focus:border-[#4A7C5C]/$2' });
  TRANSFORMS.push({ name: `focus-border-${c}`, from: new RegExp(`\\bfocus:border-${c}-${SHADES}(?![\\/\\w-])`, 'g'), to: 'focus:border-[#4A7C5C]' });
  // Gradients → verified bright→dark
  TRANSFORMS.push({ name: `from-${c}`,        from: new RegExp(`\\bfrom-${c}-${SHADES}\\b`, 'g'),           to: 'from-[#6FB585]' });
  TRANSFORMS.push({ name: `to-${c}`,          from: new RegExp(`\\bto-${c}-${SHADES}\\b`, 'g'),             to: 'to-[#4A7C5C]' });
  TRANSFORMS.push({ name: `via-${c}`,         from: new RegExp(`\\bvia-${c}-${SHADES}\\b`, 'g'),            to: 'via-[#4A7C5C]' });
  TRANSFORMS.push({ name: `fill-${c}`,        from: new RegExp(`\\bfill-${c}-${SHADES}\\b`, 'g'),           to: 'fill-[#4A7C5C]' });
  TRANSFORMS.push({ name: `stroke-${c}`,      from: new RegExp(`\\bstroke-${c}-${SHADES}\\b`, 'g'),         to: 'stroke-[#4A7C5C]' });
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'generated') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && full.endsWith('.tsx')) files.push(full);
  }
  return files;
}

function shouldSkip(f) {
  return SKIP_PATTERNS.some(re => re.test(f));
}

function transformContent(txt) {
  let out = txt;
  const counts = {};
  for (const t of TRANSFORMS) {
    const matches = out.match(t.from) || [];
    if (matches.length > 0) counts[t.name] = (counts[t.name] || 0) + matches.length;
    out = out.replace(t.from, t.to);
  }
  return { out, counts };
}

function main() {
  const files = walk(SRC);
  console.log(`[scan] ${files.length} .tsx files in src/`);
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  console.log(`[backup] ${BACKUP_ROOT}\n`);

  let totalFiles = 0, totalChanges = 0;
  const perFile = [];

  for (const f of files) {
    if (shouldSkip(f)) { console.log(`  ⏭  SKIP  ${path.relative(SRC, f)}`); continue; }
    const txt = fs.readFileSync(f, 'utf8');
    const { out, counts } = transformContent(txt);
    const changes = Object.values(counts).reduce((a, b) => a + b, 0);
    if (changes === 0) continue;

    const rel = path.relative(SRC, f).replace(/\\/g, '/');
    const backupPath = path.join(BACKUP_ROOT, rel.replace(/\[/g, '_').replace(/\]/g, '_'));
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(f, backupPath);
    fs.writeFileSync(f, out, 'utf8');

    totalFiles++;
    totalChanges += changes;
    perFile.push({ rel, changes });
    console.log(`  ✓ ${rel.padEnd(38)} ${String(changes).padStart(4)} changes`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Files patched: ${totalFiles}`);
  console.log(`Total changes: ${totalChanges}`);

  fs.writeFileSync(path.join(__dirname, 'transform_accent_result.json'),
    JSON.stringify({ totalFiles, totalChanges, perFile, backupRoot: BACKUP_ROOT }, null, 2));
}

main();
