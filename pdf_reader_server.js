const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
<h1>PDF Text Extractor</h1>
<div id="output" style="white-space:pre-wrap;font-family:monospace;"></div>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
async function extractText() {
  const loadingTask = pdfjsLib.getDocument('/pdf');
  const pdf = await loadingTask.promise;
  let fullText = 'Total pages: ' + pdf.numPages + '\\n\\n';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += '=== PAGE ' + i + ' ===\\n' + pageText + '\\n\\n';
  }
  document.getElementById('output').textContent = fullText;
  // Also send to server
  fetch('/save', {method:'POST', body: fullText});
}
extractText().catch(e => document.getElementById('output').textContent = 'Error: ' + e.message);
</script>
</body>
</html>`;
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(html);
  } else if (req.url === '/pdf') {
    const pdfPath = path.join(__dirname, 'VNTrust.pdf');
    const stat = fs.statSync(pdfPath);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stat.size,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(pdfPath).pipe(res);
  } else if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      fs.writeFileSync(path.join(__dirname, 'extracted_text.txt'), body, 'utf8');
      console.log('Text saved to extracted_text.txt');
      res.writeHead(200);
      res.end('OK');
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(7788, () => {
  console.log('Server running at http://localhost:7788');
});
