const pdfParse = require('./node_modules/pdf-parse/dist/pdf-parse/node/pdf-parse.js');
const fs = require('fs');
const buf = fs.readFileSync('VNTrust.pdf');
pdfParse(buf).then(data => {
  console.log('Pages:', data.numpages);
  process.stdout.write(data.text);
}).catch(e => {
  console.error('Error:', e.message);
});
