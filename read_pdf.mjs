import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const buf = readFileSync('d:/Web hang gia/VNTrust.pdf');
pdfParse(buf).then(data => {
  console.log('Pages:', data.numpages);
  console.log('Text:\n', data.text);
}).catch(err => console.error('Error:', err.message));
