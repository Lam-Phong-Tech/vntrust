// Seed ~500 realistic LuotQuet records across 10 VN cities
// Distribution: 90% genuine / 8% suspect / 2% fake
// Time spread: last 30 days, weighted toward recent
const { Client } = require('ssh2');

const HOST = '45.119.83.233';
const USER = 'root';
const PASS = 'Tailoc@2026';

// 10 major cities with population-weighted scan distribution
const CITIES = [
  { name: 'TP.HCM',      lat: 10.82, lon: 106.63, weight: 25, ip: ['14.226', '113.161', '171.244'] },
  { name: 'Hà Nội',      lat: 21.03, lon: 105.85, weight: 20, ip: ['1.54',    '14.232',  '171.252'] },
  { name: 'Đà Nẵng',     lat: 16.07, lon: 108.21, weight:  8, ip: ['113.190', '171.246'] },
  { name: 'Hải Phòng',   lat: 20.84, lon: 106.68, weight:  8, ip: ['1.55',    '14.187'] },
  { name: 'Cần Thơ',     lat: 10.04, lon: 105.74, weight:  7, ip: ['113.171', '116.110'] },
  { name: 'Đồng Nai',    lat: 10.95, lon: 106.82, weight:  7, ip: ['14.241',  '171.234'] },
  { name: 'Khánh Hòa',   lat: 12.24, lon: 109.19, weight:  7, ip: ['115.78',  '171.252'] },
  { name: 'Bắc Ninh',    lat: 21.18, lon: 106.07, weight:  6, ip: ['113.184'] },
  { name: 'Quảng Ninh',  lat: 21.04, lon: 107.19, weight:  6, ip: ['171.250'] },
  { name: 'Lâm Đồng',    lat: 11.54, lon: 108.08, weight:  6, ip: ['115.79'] },
];

// Hot spots — fake/suspect bias
const HOTSPOTS = new Set(['Hà Nội', 'TP.HCM', 'Bắc Ninh', 'Đồng Nai', 'Quảng Ninh']);

const TOTAL_SCANS = 500;
const DAYS_BACK = 30;

function pickCity() {
  const total = CITIES.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CITIES) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return CITIES[0];
}

function randomIP(city) {
  const prefix = city.ip[Math.floor(Math.random() * city.ip.length)];
  return `${prefix}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function jitter(coord, range = 0.15) {
  return coord + (Math.random() - 0.5) * range;
}

function pickResult(city) {
  // Hotspot cities have higher fake rate
  const isHotspot = HOTSPOTS.has(city.name);
  const r = Math.random();
  if (isHotspot) {
    if (r < 0.015) return 'fake';      // 1.5%
    if (r < 0.06)  return 'suspect';   // 4.5%
    if (r < 0.07)  return 'expired';   // 1%
    return 'genuine';                   // 93%
  } else {
    if (r < 0.005) return 'fake';      // 0.5%
    if (r < 0.025) return 'suspect';   // 2%
    return 'genuine';                   // 97.5%
  }
}

function randomTime() {
  // Weighted: 50% in last 7 days, 30% in days 8-14, 20% in days 15-30
  const r = Math.random();
  let daysAgo;
  if (r < 0.5) daysAgo = Math.random() * 7;
  else if (r < 0.8) daysAgo = 7 + Math.random() * 7;
  else daysAgo = 14 + Math.random() * 16;
  // Business hours bias (8am-10pm)
  const hour = 8 + Math.floor(Math.random() * 14);
  const min = Math.floor(Math.random() * 60);
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(daysAgo));
  d.setHours(hour, min, Math.floor(Math.random() * 60), 0);
  return d.toISOString();
}

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('close', code => resolve({ code, stdout, stderr }))
        .on('data', d => stdout += d.toString())
        .stderr.on('data', d => stderr += d.toString());
    });
  });
}

async function main() {
  console.log(`[seed] Generating ${TOTAL_SCANS} demo scan records...`);
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 10000 });
  });
  console.log('[ssh] connected');

  // Get list of UIDs to scan
  console.log('[1] Fetching available UIDs...');
  const uidsResult = await run(conn, "sqlite3 /var/www/vntrust/dev.db 'SELECT uid FROM MaDinhDanh LIMIT 200;'");
  const uids = uidsResult.stdout.trim().split('\n').filter(u => u.length > 10);
  if (uids.length === 0) {
    console.error('No UIDs found!');
    conn.end();
    process.exit(1);
  }
  console.log(`[1] ${uids.length} UIDs available`);

  // Build INSERT SQL in batches of 100
  console.log('[2] Generating SQL...');
  const records = [];
  const cityCount = {};
  const resultCount = { genuine: 0, suspect: 0, fake: 0, expired: 0 };
  for (let i = 0; i < TOTAL_SCANS; i++) {
    const uid = uids[Math.floor(Math.random() * uids.length)];
    const city = pickCity();
    const ip = randomIP(city);
    const lat = jitter(city.lat);
    const lng = jitter(city.lon);
    const result = pickResult(city);
    const time = randomTime();
    const device = Math.random() < 0.55 ? 'Android' : 'iOS';
    const id = 'scan-demo-' + Math.random().toString(36).substring(2, 15);
    const diaChi = `${city.name} - ${ip}`.replace(/'/g, "''");
    records.push(`('${id}','${uid}','${time}','${diaChi}',${lat.toFixed(4)},${lng.toFixed(4)},'${result}','${device}')`);
    cityCount[city.name] = (cityCount[city.name] || 0) + 1;
    resultCount[result] = (resultCount[result] || 0) + 1;
  }
  console.log('[2] Distribution by city:');
  Object.entries(cityCount).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`     ${c.padEnd(15)} ${n}`));
  console.log('[2] Distribution by result:', resultCount);

  // Backup first
  const stamp = Date.now();
  console.log('[3] Creating DB backup...');
  await run(conn, `cp /var/www/vntrust/dev.db /var/www/vntrust/_backups/dev.db.before_scan_seed.${stamp}`);
  console.log(`[3] Backup: dev.db.before_scan_seed.${stamp}`);

  // Insert in batches of 100
  console.log('[4] Inserting records...');
  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const sql = `INSERT INTO LuotQuet (id, uid, thoiGian, diaChi_IP, lat, lng, ketQua, thietBi) VALUES ${batch.join(',')};`;
    const r = await run(conn, `sqlite3 /var/www/vntrust/dev.db "${sql.replace(/"/g, '\\"')}"`);
    if (r.code !== 0) {
      console.error('Insert error:', r.stderr);
      conn.end();
      process.exit(1);
    }
    process.stdout.write(`  inserted ${i + batch.length}/${records.length}\r`);
  }
  console.log(`\n[4] ${records.length} records inserted ✓`);

  // Also increment soLanQuet on MaDinhDanh for accuracy
  console.log('[5] Updating MaDinhDanh.soLanQuet counters...');
  const updateSQL = `UPDATE MaDinhDanh SET soLanQuet = soLanQuet + (SELECT COUNT(*) FROM LuotQuet WHERE LuotQuet.uid = MaDinhDanh.uid AND LuotQuet.id LIKE 'scan-demo-%');`;
  await run(conn, `sqlite3 /var/www/vntrust/dev.db "${updateSQL}"`);

  // Verify
  console.log('[6] Verification...');
  const verify = await run(conn, "sqlite3 /var/www/vntrust/dev.db 'SELECT COUNT(*) as total FROM LuotQuet; SELECT ketQua, COUNT(*) FROM LuotQuet GROUP BY ketQua;'");
  console.log(verify.stdout);

  conn.end();
  console.log(`✅ Seeded ${TOTAL_SCANS} demo scans. Backup: dev.db.before_scan_seed.${stamp}`);
  console.log(`   To rollback: cp /var/www/vntrust/_backups/dev.db.before_scan_seed.${stamp} /var/www/vntrust/dev.db && pm2 restart vntrust`);
}

main().catch(e => { console.error(e); process.exit(1); });
