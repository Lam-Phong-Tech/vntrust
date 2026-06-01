const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

conn.on('ready', () => {
  const content = fs.readFileSync('C:\\xampp\\htdocs\\Web-chong-hang-gia-main\\vntrust\\src\\app\\api\\certificates\\route.ts', 'utf-8');
  const b64 = Buffer.from(content).toString('base64');
  
  // Tạo thư mục trước, sau đó viết file
  const mkdir_cmd = 'mkdir -p /var/www/vntrust/src/app/api/certificates';
  conn.exec(mkdir_cmd, (err, s) => {
    s.on('close', () => {
      // Viết qua python để tránh vấn đề escaping
      const py_cmd = `python3 -c "import base64; content=base64.b64decode('${b64}').decode(); open('/var/www/vntrust/src/app/api/certificates/route.ts','w').write(content); print('Written', len(content), 'chars')"`;
      conn.exec(py_cmd, (err2, s2) => {
        s2.on('data', d => console.log(d.toString()));
        s2.stderr.on('data', d => console.error(d.toString()));
        s2.on('close', () => {
          // Verify
          conn.exec('wc -c /var/www/vntrust/src/app/api/certificates/route.ts && head -5 /var/www/vntrust/src/app/api/certificates/route.ts', (e3, s3) => {
            s3.on('data', d => console.log('VERIFY:', d.toString()));
            s3.on('close', () => conn.end());
          });
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
