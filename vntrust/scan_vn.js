const fs = require('fs');
const path = require('path');

const vnRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

function scanDir(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Exclude console.log, comments, and t("...")
        if (!line.includes('console.log') && !line.trim().startsWith('//') && vnRegex.test(line)) {
          // Exclude already translated LanguageContext
          if (!fullPath.includes('LanguageContext.tsx')) {
            results.push({ file: fullPath, line: i + 1, text: line.trim() });
          }
        }
      });
    }
  }
  return results;
}

const res = scanDir('src');
fs.writeFileSync('missing_translations.json', JSON.stringify(res, null, 2));
console.log('Found', res.length, 'lines with Vietnamese characters.');
