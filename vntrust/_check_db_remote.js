
const Database = require('better-sqlite3');
const db = new Database('/var/www/vntrust/dev.db', { readonly: true });
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('TABLES:', JSON.stringify(tables.map(t => t.name)));
  
  const tableNames = tables.map(t => t.name);
  
  if (tableNames.includes('LuotQuet')) {
    const luotQuetCount = db.prepare('SELECT COUNT(*) as cnt FROM LuotQuet').get();
    console.log('LuotQuet count:', luotQuetCount.cnt);
    const sample = db.prepare('SELECT * FROM LuotQuet ORDER BY thoiGian DESC LIMIT 3').all();
    console.log('LuotQuet sample:', JSON.stringify(sample));
  } else {
    console.log('No LuotQuet table found');
  }
  
  if (tableNames.includes('NguoiDung')) {
    const users = db.prepare('SELECT email, vaiTro, doanhNghiepId FROM NguoiDung LIMIT 10').all();
    console.log('Users:', JSON.stringify(users));
  }
  
  if (tableNames.includes('SanPham')) {
    const spCount = db.prepare('SELECT COUNT(*) as cnt FROM SanPham').get();
    console.log('SanPham count:', spCount.cnt);
  }
  
  if (tableNames.includes('MaDinhDanh')) {
    const mdCount = db.prepare('SELECT COUNT(*) as cnt FROM MaDinhDanh').get();
    console.log('MaDinhDanh count:', mdCount.cnt);
  }
} catch(e) {
  console.error(e.message);
}
db.close();
