const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const script = `
const { createClient } = require('@libsql/client');
const path = require('path');
const dbPath = path.join(process.cwd(), 'dev.db').replace(/\\\\/g, '/');
const client = createClient({ url: 'file:' + dbPath });

async function run() {
  const res = await client.execute('SELECT * FROM NguoiDung WHERE doanhNghiepId IS NOT NULL');
  let count = 0;
  for (const user of res.rows) {
    const dnRes = await client.execute({ sql: 'SELECT * FROM DoanhNghiep WHERE id = ?', args: [user.doanhNghiepId] });
    if (dnRes.rows.length > 0) {
      const dn = dnRes.rows[0];
      await client.execute({
        sql: 'UPDATE DoanhNghiep SET email = COALESCE(?, email), nguoiDaiDien = COALESCE(?, nguoiDaiDien), hotline = COALESCE(?, hotline) WHERE id = ?',
        args: [dn.email || user.email, dn.nguoiDaiDien || user.ten, dn.hotline || user.soDienThoai, user.doanhNghiepId]
      });
      count++;
    }
  }
  console.log('Successfully synced ' + count + ' companies in the remote database.');
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
  `;
  const cmd = `cd /var/www/vntrust && cat << 'EOF' > fix_db.js\n${script}\nEOF\nnode fix_db.js`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('Remote execution finished.');
      conn.end();
    })
    .on('data', d => process.stdout.write(d))
    .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '45.119.83.233', port: 22, username: 'root', password: 'nSmaPGEY39' });
