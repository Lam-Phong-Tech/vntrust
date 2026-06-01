const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  // Test 5: Admin PATCH approve valid cert (should succeed)
  conn.exec('curl -s -w "\\nHTTP:%{http_code}" -X PATCH "http://127.0.0.1:3001/api/certificates" -H "Content-Type: application/json" -d \'{"id":"7f36e544-d0a7-4585-b6ac-e19648e5a03e","action":"approve"}\' -b "userRole=admin"', (e, s) => {
    s.on('data', d => console.log('5) Admin approve cert:', d.toString().substring(0, 400)));
    s.on('close', () => {
      // Test 6: Verify approved status now shows
      conn.exec('curl -s "http://127.0.0.1:3001/api/certificates?status=approved" -b "userRole=admin"', (e2, s2) => {
        s2.on('data', d => console.log('6) Approved certs:', d.toString().substring(0, 400)));
        s2.on('close', () => {
          // Test 7: POST cert with external URL (should reject)
          conn.exec('curl -s -w "\\nHTTP:%{http_code}" -X POST "http://127.0.0.1:3001/api/certificates" -H "Content-Type: application/json" -d \'{"loai":"ISO","soChungNhan":"FAKE-123","ngayCap":"2024-01-01","ngayHetHan":"2025-01-01","hinhAnhUrl":"http://evil.com/hack.js"}\' -b "userRole=manufacturer; doanhNghiepId=9afde383-9001-4f05-bf39-02846dab7294"', (e3, s3) => {
            s3.on('data', d => console.log('7) Ext URL inject (should 400):', d.toString()));
            s3.on('close', () => {
              // Test 8: GET verify returns hinhAnhUrl for real product
              conn.exec('curl -s "http://127.0.0.1:3001/api/verify/$(curl -s http://127.0.0.1:3001/api/inventory -b userRole=admin | python3 -c \"import sys,json; data=json.load(sys.stdin); print(data[\'sanPhams\'][0][\'loHangs\'][0][\'uids\'][0][\'uid\'] if data[\'sanPhams\'] else \'no-uid\')\" 2>/dev/null || echo test)"', (e4, s4) => {
                s4.on('data', d => console.log('8) Verify real uid:', d.toString().substring(0, 300)));
                s4.on('close', () => conn.end());
              });
            });
          });
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
