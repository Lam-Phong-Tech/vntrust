const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');
const conn = new Client();
const script = `
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
async function main() {
  const res = await prisma.doanhNghiep.updateMany({
    where: { ten: { in: ['Tổng Công ty Dược phẩm VNTrust Phú Mỹ', 'Công ty TNHH Nhập khẩu Thực phẩm Sạch Việt', 'Công ty Mỹ phẩm Thiên Nhiên Xanh'] } },
    data: { loai: 'DEMO' }
  });
  console.log('Updated ' + res.count + ' demo companies to DEMO loai.');
}
main().finally(() => prisma.$disconnect());
`;
fs.writeFileSync(path.join(__dirname, 'temp_script.js'), script);
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(path.join(__dirname, 'temp_script.js'), '/var/www/vntrust/hide_demo.js', (err) => {
      if (err) console.error(err);
      conn.exec('cd /var/www/vntrust && node hide_demo.js', (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
          conn.exec('rm -f /var/www/vntrust/hide_demo.js', () => conn.end());
        });
      });
    });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
