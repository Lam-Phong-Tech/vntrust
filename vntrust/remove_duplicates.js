const fs = require('fs');
const path = 'src/contexts/LanguageContext.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the lines we want to remove:
// The duplicated "// ── Verify Page ──" is at line 162 (index 161)
// The section ends right before "// ── Navbar Modals ──" at line 198 (index 197)

let start = -1;
let end = -1;

for (let i = 150; i < lines.length; i++) {
  if (lines[i].includes('// ── Verify Page ──')) {
    start = i;
    break;
  }
}

if (start !== -1) {
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].includes('// ── Navbar Modals ──')) {
      end = i;
      break;
    }
  }
}

if (start !== -1 && end !== -1) {
  lines.splice(start, end - start);
  fs.writeFileSync(path, lines.join('\n'));
  console.log('Removed duplicated block from line', start, 'to', end);
} else {
  console.log('Could not find duplicated block');
}
