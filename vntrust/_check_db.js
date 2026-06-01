const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./dev.db');
db.all("PRAGMA table_info(SanPham);", (err, rows) => {
  if (err) console.error(err);
  console.log(rows);
});
