/**
 * VNTrust Production Seed Script
 * Chạy trực tiếp trên VPS bằng: node seed_production.js
 * Seed dữ liệu 90 ngày lịch sử quét, liên kết với MaDinhDanh đã có sẵn
 */

const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const db = new Database('/var/www/vntrust/dev.db');

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // Tắt FK để seed nhanh

try {
  console.log('🔍 Kiểm tra dữ liệu hiện tại...');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  console.log('Tables:', tables);

  // Lấy tất cả MaDinhDanh đã có trong DB
  const maDinhDanhs = db.prepare('SELECT uid FROM MaDinhDanh LIMIT 51').all();
  console.log(`📦 Tìm thấy ${maDinhDanhs.length} mã định danh`);
  
  if (maDinhDanhs.length === 0) {
    console.error('❌ Không có MaDinhDanh nào trong DB. Hãy seed sản phẩm trước!');
    process.exit(1);
  }

  // Xóa dữ liệu quét cũ
  const deletedLQ = db.prepare('DELETE FROM LuotQuet').run();
  console.log(`🗑️  Đã xóa ${deletedLQ.changes} LuotQuet cũ`);
  
  const deletedCB = db.prepare('DELETE FROM CanhBao').run();
  console.log(`🗑️  Đã xóa ${deletedCB.changes} CanhBao cũ`);

  // Seed data cấu hình
  const vietNamLocations = [
    { city: 'Ha Noi', lat: 21.0285, lng: 105.8048 },
    { city: 'TP.HCM', lat: 10.8231, lng: 106.6297 },
    { city: 'Da Nang', lat: 16.0544, lng: 108.2022 },
    { city: 'Can Tho', lat: 10.0452, lng: 105.7469 },
    { city: 'Hai Phong', lat: 20.8449, lng: 106.6881 },
    { city: 'Hue', lat: 16.4637, lng: 107.5909 },
    { city: 'Bien Hoa', lat: 10.9574, lng: 106.8426 },
    { city: 'Nha Trang', lat: 12.2388, lng: 109.1967 },
  ];

  // Xác suất kết quả: 75% genuine, 15% suspect, 10% fake
  const results = [
    'genuine', 'genuine', 'genuine', 'genuine', 'genuine', 'genuine', 'genuine', 'genuine',
    'suspect', 'suspect',
    'fake',
  ];

  const devices = ['Android', 'iOS', 'Android', 'Android', 'iOS'];

  // Chuẩn bị insert statement
  const insertLuotQuet = db.prepare(`
    INSERT INTO LuotQuet (id, uid, thoiGian, diaChi_IP, lat, lng, ketQua, thietBi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Transaction để insert nhanh
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insertLuotQuet.run(row.id, row.uid, row.thoiGian, row.diaChi_IP, row.lat, row.lng, row.ketQua, row.thietBi);
    }
  });

  const allUids = maDinhDanhs.map(m => m.uid);
  const rows = [];
  let totalScans = 0;

  console.log('📊 Đang tạo lịch sử quét 90 ngày...');

  for (let dayBack = 89; dayBack >= 0; dayBack--) {
    const date = new Date();
    date.setDate(date.getDate() - dayBack);

    // Số lượt quét tăng dần (ngày gần đây nhiều hơn) - realistic growth
    const baseScans = 8;
    const growth = Math.floor((89 - dayBack) * 0.8);
    const variance = Math.floor(Math.random() * 15);
    const scansThisDay = baseScans + growth + variance;

    for (let s = 0; s < scansThisDay; s++) {
      const loc = vietNamLocations[Math.floor(Math.random() * vietNamLocations.length)];
      const uid = allUids[Math.floor(Math.random() * allUids.length)];
      const result = results[Math.floor(Math.random() * results.length)];
      
      // Random time trong ngày
      const scanTime = new Date(date.getTime() + Math.random() * 86400000);
      const timeStr = scanTime.toISOString().replace('T', ' ').split('.')[0];
      
      const ip = `${113 + Math.floor(Math.random() * 30)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

      rows.push({
        id: randomUUID(),
        uid,
        thoiGian: timeStr,
        diaChi_IP: `${loc.city} - ${ip}`,
        lat: loc.lat + (Math.random() - 0.5) * 0.3,
        lng: loc.lng + (Math.random() - 0.5) * 0.3,
        ketQua: result,
        thietBi: devices[Math.floor(Math.random() * devices.length)],
      });
      totalScans++;
    }
  }

  // Insert theo batch 500
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    insertMany(batch);
    process.stdout.write(`\r  Đã insert ${Math.min(i + batchSize, rows.length)}/${rows.length} lượt quét...`);
  }
  console.log(`\n✅ Đã seed ${totalScans} lượt quét!`);

  // Seed CanhBao
  const insertCanhBao = db.prepare(`
    INSERT INTO CanhBao (id, loai, mucDo, moTa, thoiGian, trangThai, uid)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];
  const canhBaos = [
    [randomUUID(), 'SCAN_ANOMALY', 'high', 'Phát hiện mã QR bị quét bất thường 15 lần/giờ tại Hà Nội — nghi ngờ làm giả', now, 'open', allUids[0]],
    [randomUUID(), 'FAKE_QR_SCANNED', 'high', 'Quét mã QR không hợp lệ: FAKE-ABC123 tại TP.HCM', now, 'reviewing', 'FAKE-ABC123'],
    [randomUUID(), 'NGUOI_DUNG_BAO_CAO', 'medium', 'Báo cáo hàng nghi giả từ người tiêu dùng tại Chợ Bến Thành', now, 'open', allUids[1] || allUids[0]],
    [randomUUID(), 'SCAN_ANOMALY', 'low', 'Mã QR quét ngoài khu vực phân phối dự kiến', now, 'open', allUids[2] || allUids[0]],
    [randomUUID(), 'FAKE_QR_SCANNED', 'medium', 'Phát hiện 3 mã QR giả tại chợ đầu mối Long An trong 24h', now, 'closed', null],
  ];

  const insertCBMany = db.transaction((items) => {
    for (const item of items) insertCanhBao.run(...item);
  });
  insertCBMany(canhBaos);
  console.log(`✅ Đã seed ${canhBaos.length} cảnh báo!`);

  // Cập nhật soLanQuet cho MaDinhDanh dựa trên LuotQuet thực tế
  console.log('🔄 Cập nhật soLanQuet...');
  db.prepare(`
    UPDATE MaDinhDanh SET soLanQuet = (
      SELECT COUNT(*) FROM LuotQuet WHERE LuotQuet.uid = MaDinhDanh.uid
    )
  `).run();
  console.log('✅ Đã cập nhật soLanQuet!');

  // Thống kê cuối
  const stats = {
    luotQuet: db.prepare('SELECT COUNT(*) as cnt FROM LuotQuet').get().cnt,
    genuine: db.prepare("SELECT COUNT(*) as cnt FROM LuotQuet WHERE ketQua = 'genuine'").get().cnt,
    suspect: db.prepare("SELECT COUNT(*) as cnt FROM LuotQuet WHERE ketQua = 'suspect'").get().cnt,
    fake: db.prepare("SELECT COUNT(*) as cnt FROM LuotQuet WHERE ketQua = 'fake'").get().cnt,
    canhBao: db.prepare('SELECT COUNT(*) as cnt FROM CanhBao').get().cnt,
    today: db.prepare("SELECT COUNT(*) as cnt FROM LuotQuet WHERE thoiGian >= date('now')").get().cnt,
  };
  
  console.log('\n📊 Thống kê sau seed:');
  console.log(JSON.stringify(stats, null, 2));
  console.log('\n🎉 Seed thành công! Vào https://anticounterfeit.test9.io.vn/supply-chain để kiểm tra.');
  
} catch (e) {
  console.error('❌ Lỗi seed:', e.message);
  console.error(e.stack);
} finally {
  db.close();
}
