// Phase 3.5: normalize all dark-blue hexes → login canonical ink palette
// Login dùng: #0B1623 (ink-1), #142235 (ink-2), #1E3148 (ink-3)
// Subpages dùng nhiều shade khác → đồng bộ về 3 ink token.

const fs = require('fs');
const path = require('path');

const PROD = path.resolve(__dirname, 'prod_snapshot/src/app/dashboard');
const LOCAL = path.resolve(__dirname, '../vntrust/src/app/dashboard');
const BACKUP_ROOT = path.join(__dirname, 'prepatch_backup_hex', String(Date.now()));

const SKIP_PATTERNS = [/inventory[/\\]_id_[/\\]qr[/\\]page\.tsx$/, /inventory[/\\]\[id\][/\\]qr[/\\]page\.tsx$/];

// Map hex (case insensitive) → canonical login palette
// Order: more specific → less specific
const HEX_MAP = [
  // Dark page backgrounds (very close to black) → ink-1
  { name: 'ink-0d1b2e', from: /#0d1b2e/gi,   to: '#0B1623' },
  { name: 'ink-0f1e33', from: /#0f1e33/gi,   to: '#0B1623' },
  { name: 'ink-0a1628', from: /#0a1628/gi,   to: '#0B1623' },
  { name: 'ink-0b1623-norm', from: /#0b1623/g, to: '#0B1623' }, // normalize case

  // Slightly lighter (raised cards / mid-gradient) → ink-2
  { name: 'ink2-1a2235', from: /#1a2235/gi,  to: '#142235' },
  { name: 'ink2-0d2040', from: /#0d2040/gi,  to: '#142235' },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name === 'page.tsx') files.push(full);
  }
  return files;
}

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(re => re.test(filePath));
}

function syncPath(prodPath) {
  const rel = path.relative(PROD, prodPath);
  const localRel = rel.replace(/_id_/g, '[id]').replace(/_uid_/g, '[uid]').replace(/_role_/g, '[role]');
  return path.join(LOCAL, localRel);
}

function transformContent(txt) {
  let out = txt;
  const counts = {};
  for (const t of HEX_MAP) {
    const matches = out.match(t.from) || [];
    if (matches.length > 0) counts[t.name] = matches.length;
    out = out.replace(t.from, t.to);
  }
  return { out, counts };
}

function main() {
  const files = walk(LOCAL); // operate on local (đã có amber→gold)
  console.log(`[scan] ${files.length} local page.tsx files`);
  console.log(`[backup] ${BACKUP_ROOT}`);
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  let totalFiles = 0, totalChanges = 0;
  const perFile = [];

  for (const localFile of files) {
    const rel = path.relative(LOCAL, localFile).replace(/\\/g, '/');
    if (shouldSkip(localFile)) {
      console.log(`  ⏭  SKIP  ${rel}`);
      continue;
    }
    const txt = fs.readFileSync(localFile, 'utf8');
    const { out, counts } = transformContent(txt);
    const changes = Object.values(counts).reduce((a, b) => a + b, 0);

    if (changes === 0) {
      console.log(`  · NOOP  ${rel}`);
      continue;
    }

    // Backup
    const backupPath = path.join(BACKUP_ROOT, rel.replace(/\[/g, '_').replace(/\]/g, '_'));
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(localFile, backupPath);

    // Write
    fs.writeFileSync(localFile, out, 'utf8');

    totalFiles++;
    totalChanges += changes;
    perFile.push({ rel, changes, counts });

    const summary = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ');
    console.log(`  ✓ PATCH ${rel.padEnd(28)} ${String(changes).padStart(3)} changes  ${summary}`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Files patched: ${totalFiles}`);
  console.log(`Total changes: ${totalChanges}`);
  console.log(`Backup root:   ${BACKUP_ROOT}`);

  fs.writeFileSync(path.join(__dirname, 'transform_hex_result.json'), JSON.stringify({ totalFiles, totalChanges, perFile, backupRoot: BACKUP_ROOT }, null, 2));
}

main();
