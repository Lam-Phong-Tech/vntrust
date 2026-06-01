// Đồng bộ theme dashboard: amber → gold, ink-blue → ink-true
// - Input: _ops/prod_snapshot/src/app/dashboard/** (đảm bảo khớp prod)
// - Output: vntrust/src/app/dashboard/** (overwrite)
// - Backup: _ops/prepatch_backup/<timestamp>/ — chứa file gốc trước khi đè
// - Skip: inventory/[id]/qr/page.tsx (print page — by design light)

const fs = require('fs');
const path = require('path');

const PROD = path.resolve(__dirname, 'prod_snapshot/src/app/dashboard');
const LOCAL = path.resolve(__dirname, '../vntrust/src/app/dashboard');
const BACKUP_ROOT = path.join(__dirname, 'prepatch_backup', String(Date.now()));

// File path patterns to SKIP
const SKIP_PATTERNS = [/inventory[/\\]_id_[/\\]qr[/\\]page\.tsx$/, /inventory[/\\]\[id\][/\\]qr[/\\]page\.tsx$/];

// Transform rules — applied in order
const TRANSFORMS = [
  // 1. Text color: amber → gold (with hover/focus variants)
  { name: 'text-amber',     from: /\btext-amber-(400|500)\b/g,                  to: 'text-[#C8A557]' },
  { name: 'hover-text-amber', from: /\bhover:text-amber-(400|500)\b/g,          to: 'hover:text-[#C8A557]' },
  { name: 'focus-text-amber', from: /\bfocus:text-amber-(400|500)\b/g,          to: 'focus:text-[#C8A557]' },

  // 2. Background with opacity: bg-amber-400/N or bg-amber-500/N → bg-[#C8A557]/N
  { name: 'bg-amber-op',    from: /\bbg-amber-(400|500)\/(\d+)\b/g,             to: 'bg-[#C8A557]/$2' },
  { name: 'hover-bg-amber-op', from: /\bhover:bg-amber-(400|500)\/(\d+)\b/g,    to: 'hover:bg-[#C8A557]/$2' },
  { name: 'focus-bg-amber-op', from: /\bfocus:bg-amber-(400|500)\/(\d+)\b/g,    to: 'focus:bg-[#C8A557]/$2' },

  // 3. Background solid: bg-amber-400 or bg-amber-500 → bg-[#C8A557]
  { name: 'bg-amber-solid', from: /\bbg-amber-(400|500)(?![\/\-\w])/g,          to: 'bg-[#C8A557]' },
  { name: 'hover-bg-amber-solid', from: /\bhover:bg-amber-(400|500)(?![\/\-\w])/g, to: 'hover:bg-[#C8A557]' },

  // 4. Border with opacity: border-amber-400/N → border-[#C8A557]/N
  { name: 'border-amber-op', from: /\bborder-amber-(400|500)\/(\d+)\b/g,        to: 'border-[#C8A557]/$2' },
  { name: 'focus-border-amber-op', from: /\bfocus:border-amber-(400|500)\/(\d+)\b/g, to: 'focus:border-[#C8A557]/$2' },

  // 5. Border solid
  { name: 'border-amber-solid', from: /\bborder-amber-(400|500)(?![\/\-\w])/g,  to: 'border-[#C8A557]' },
  { name: 'focus-border-amber-solid', from: /\bfocus:border-amber-(400|500)(?![\/\-\w])/g, to: 'focus:border-[#C8A557]' },

  // 6. Tailwind gradients
  { name: 'from-amber',     from: /\bfrom-amber-(400|500)\b/g,                  to: 'from-[#C8A557]' },
  { name: 'to-amber',       from: /\bto-amber-(400|500)\b/g,                    to: 'to-[#C8A557]' },
  { name: 'via-amber',      from: /\bvia-amber-(400|500)\b/g,                   to: 'via-[#C8A557]' },

  // 7. Ring (focus)
  { name: 'ring-amber',     from: /\bring-amber-(400|500)\b/g,                  to: 'ring-[#C8A557]' },
  { name: 'ring-amber-op',  from: /\bring-amber-(400|500)\/(\d+)\b/g,           to: 'ring-[#C8A557]/$2' },

  // 8. Ink shade: #0d1b2e → #0B1623 (canonical login ink)
  { name: 'ink-shade',      from: /#0d1b2e/gi,                                  to: '#0B1623' },
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

function transformContent(txt) {
  let out = txt;
  const counts = {};
  for (const t of TRANSFORMS) {
    const matches = out.match(t.from) || [];
    if (matches.length > 0) counts[t.name] = matches.length;
    out = out.replace(t.from, t.to);
  }
  return { out, counts };
}

function syncPath(prodPath) {
  // Convert prod_snapshot path (with _id_) to local path (with [id])
  const rel = path.relative(PROD, prodPath);
  // Reverse the escaping: _id_ → [id]
  const localRel = rel.replace(/_id_/g, '[id]').replace(/_uid_/g, '[uid]').replace(/_role_/g, '[role]');
  return path.join(LOCAL, localRel);
}

function main() {
  const files = walk(PROD);
  console.log(`[scan] ${files.length} prod page.tsx files`);
  console.log(`[backup] saving originals to ${BACKUP_ROOT}\n`);
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  let total = { filesPatched: 0, filesSkipped: 0, totalChanges: 0 };
  const perFile = [];

  for (const prodFile of files) {
    const localFile = syncPath(prodFile);
    const rel = path.relative(PROD, prodFile).replace(/\\/g, '/');

    if (shouldSkip(localFile) || shouldSkip(prodFile)) {
      console.log(`  ⏭  SKIP  ${rel}  (print page — by design)`);
      total.filesSkipped++;
      continue;
    }

    const prodTxt = fs.readFileSync(prodFile, 'utf8');
    const { out, counts } = transformContent(prodTxt);
    const changes = Object.values(counts).reduce((a, b) => a + b, 0);

    // Backup original LOCAL file if exists (so user can revert)
    if (fs.existsSync(localFile)) {
      const backupPath = path.join(BACKUP_ROOT, rel.replace(/\[/g, '_').replace(/\]/g, '_'));
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(localFile, backupPath);
    }

    // Write transformed
    fs.mkdirSync(path.dirname(localFile), { recursive: true });
    fs.writeFileSync(localFile, out, 'utf8');

    total.filesPatched++;
    total.totalChanges += changes;
    perFile.push({ rel, changes, counts });

    const summary = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ') || '(no match)';
    if (changes > 0) {
      console.log(`  ✓ PATCH ${rel.padEnd(28)} ${String(changes).padStart(3)} changes  ${summary}`);
    } else {
      console.log(`  · NOOP  ${rel}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Files patched: ${total.filesPatched}`);
  console.log(`Files skipped: ${total.filesSkipped}`);
  console.log(`Total changes: ${total.totalChanges}`);
  console.log(`Backup root:   ${BACKUP_ROOT}`);

  fs.writeFileSync(path.join(__dirname, 'transform_theme_result.json'), JSON.stringify({ total, perFile, backupRoot: BACKUP_ROOT }, null, 2));
}

main();
