const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  // Check if any doanhNghiep exists AND check login cookies
  const cmd = `
curl -s http://127.0.0.1:3001/api/seed 2>&1 | head -c 500
`;
  conn.exec(cmd, (err, stream) => {
    stream.on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d))
          .on('close', () => {
            // Also check via direct prisma query
            const cmd2 = `cd /var/www/vntrust && node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.doanhNghiep.count().then(c=>{console.log('doanhNghiep count:',c);return p.nguoiDung.findMany({select:{id:true,email:true,vaiTro:true,doanhNghiepId:true}})}).then(u=>{console.log('users:',JSON.stringify(u));p[Symbol.for('nodejs.rejection')]&&p[Symbol.for('nodejs.rejection')]();}).catch(e=>console.error(e)).finally(()=>process.exit(0))"`;
            conn.exec(cmd2, (err2, s2) => {
              s2.on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d))
                .on('close', () => conn.end());
            });
          });
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'Tailoc@2026' });
