const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory() && !['node_modules','.next','api'].includes(file)) {
        results = results.concat(getFiles(filePath, ext));
      } else if (file.endsWith(ext)) {
        results.push(filePath);
      }
    });
  } catch(e) {}
  return results;
}

const base = 'D:/Web hang gia/vntrust/src';
const files = [
  ...getFiles(base + '/app', '.tsx'),
  ...getFiles(base + '/components', '.tsx'),
];

// Match Vietnamese characters
const viPattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/;

files.forEach(f => {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) return;         // comment
    if (trimmed.startsWith('*')) return;           // jsdoc
    if (line.includes('vi:')) return;              // dict entry
    if (line.includes('en:')) return;              // dict entry
    if (line.match(/t\(["']/)) return;             // already translated
    if (line.includes('console.log')) return;      // debug
    if (!viPattern.test(line)) return;
    hits.push('  L' + (i+1) + ': ' + trimmed.substring(0, 90));
  });
  if (hits.length > 0) {
    console.log('\n=== ' + f.replace(base + '/', '') + ' (' + hits.length + ' dòng) ===');
    hits.forEach(h => console.log(h));
  }
});
