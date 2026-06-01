const fs = require('fs');
const res = JSON.parse(fs.readFileSync('missing_translations.json', 'utf8'));

const files = {};
res.forEach(item => {
  if (!files[item.file]) files[item.file] = [];
  files[item.file].push(item.text);
});

for (const [file, texts] of Object.entries(files)) {
  console.log(`\n--- ${file} ---`);
  // Print unique texts
  const unique = [...new Set(texts)];
  unique.slice(0, 10).forEach(t => console.log(t));
  if (unique.length > 10) console.log(`... and ${unique.length - 10} more`);
}
