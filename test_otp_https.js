const https = require('https');

const email = process.argv[2] || 'spyderrhq@gmail.com';
const postData = JSON.stringify({ email });

const options = {
  hostname: 'anticounterfeit.test9.io.vn',
  port: 443,
  path: '/api/auth/send-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log(`Testing HTTPS OTP send to: ${email}`);
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(postData);
req.end();
