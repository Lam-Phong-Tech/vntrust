const fs = require('fs');

// ── FIX 1: warehouse/page.tsx ──────────────────────────────────────────────
// Vấn đề: Chỉ lấy batch trangThai === "active", nhưng lô mới tạo là "approved"
// Sửa: Cho phép cả "approved" và "active" để nhà sản xuất có thể nhập kho lần đầu
let wh = fs.readFileSync('src/app/dashboard/warehouse/page.tsx', 'utf8');

const oldFilter = `// Only show ACTIVE batches (approved, ready for warehouse transaction)
      const active = (data.batches || []).filter((b: any) => b.trangThai === "active");
      setBatches(active.map((b: any) => ({`;
const newFilter = `// Show batches that can be transacted: approved (chờ nhập kho) + active (đang hoạt động)
      const active = (data.batches || []).filter((b: any) =>
        ["approved", "active"].includes(b.trangThai)
      );
      setBatches(active.map((b: any) => ({`;

if (wh.includes(oldFilter)) {
  wh = wh.replace(oldFilter, newFilter);
  console.log('✅ Warehouse: batch filter fixed (approved + active)');
} else {
  // Try simpler pattern
  const alt1 = 'const active = (data.batches || []).filter((b: any) => b.trangThai === "active");';
  const alt1New = 'const active = (data.batches || []).filter((b: any) => ["approved", "active"].includes(b.trangThai));';
  if (wh.includes(alt1)) {
    wh = wh.replace(alt1, alt1New);
    console.log('✅ Warehouse: batch filter fixed (alt pattern)');
  } else {
    console.log('❌ Warehouse: pattern not found, dumping context...');
    const idx = wh.indexOf('trangThai === "active"');
    console.log('Context:', JSON.stringify(wh.substring(Math.max(0, idx - 80), idx + 120)));
  }
}

// Also update the batch label in dropdown to show trangThai
const oldOption = '{batches.map(b => (\n                    <option key={b.id} value={b.id}>{b.sanPham.ten} — {b.sanPham.maSKU}</option>\n                  ))}';
const newOption = '{batches.map(b => (\n                    <option key={b.id} value={b.id}>\n                      {b.maLo} — {b.sanPham.ten} {b.trangThai === "approved" ? "(Chưa nhập kho)" : "(Đang hoạt động)"}\n                    </option>\n                  ))}';
if (wh.includes(oldOption)) {
  wh = wh.replace(oldOption, newOption);
  console.log('✅ Warehouse: dropdown label updated');
} else {
  console.log('⚠️ Warehouse: dropdown label pattern not found');
}

fs.writeFileSync('src/app/dashboard/warehouse/page.tsx', wh);

// ── FIX 2: distribution/page.tsx ──────────────────────────────────────────
// Vấn đề: "Sẵn sàng" chỉ đếm trangThai === "active", bỏ sót "approved"
// Sửa: "Sẵn sàng" = approved + active (cả hai đều là lô hàng sẵn sàng)
let dist = fs.readFileSync('src/app/dashboard/distribution/page.tsx', 'utf8');

const oldReady = 'value: batches.filter(b => b.trangThai === "active").length, icon: "inventory", color: "text-blue-400"';
const newReady = 'value: batches.filter(b => b.trangThai === "active" || b.trangThai === "approved").length, icon: "inventory", color: "text-blue-400"';

if (dist.includes(oldReady)) {
  dist = dist.replace(oldReady, newReady);
  console.log('✅ Distribution: "Sẵn sàng" stat fixed (approved + active)');
} else {
  console.log('❌ Distribution: stat pattern not found');
}

// Also update filter button to include "approved" in "Sẵn sàng" filter
const oldActiveFilter = 'filterStatus === "all" || b.trangThai === filterStatus';
const newActiveFilter = `filterStatus === "all"
    || b.trangThai === filterStatus
    || (filterStatus === "active" && b.trangThai === "approved")`;
if (dist.includes(oldActiveFilter)) {
  dist = dist.replace(oldActiveFilter, newActiveFilter);
  console.log('✅ Distribution: filter logic updated');
} else {
  console.log('⚠️ Distribution: filter pattern not found');
}

// Fix: distribution stats total = batches.length (all) — already correct, just make sure
fs.writeFileSync('src/app/dashboard/distribution/page.tsx', dist);

console.log('\n📁 Files saved. Total lines:');
console.log('  warehouse/page.tsx:', wh.split('\n').length);
console.log('  distribution/page.tsx:', dist.split('\n').length);
