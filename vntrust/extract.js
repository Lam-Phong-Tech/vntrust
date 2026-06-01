const fs = require('fs');
const xml = fs.readFileSync('temp_docx/word/document.xml', 'utf8');
const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
fs.writeFileSync('vntrust_doc_extracted.txt', text, 'utf8');
console.log('done');
