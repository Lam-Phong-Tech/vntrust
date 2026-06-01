const pdfParse = require('pdf-parse');
const fs = require('fs');

const buf = fs.readFileSync('d:/Web hang gia/VNTrust.pdf');
pdfParse(buf).then(data => {
  console.log('Pages:', data.numpages);
  console.log('Text:\n', data.text);
}).catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
});
