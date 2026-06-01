const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/api/don-chuyen-hang/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the mangled reject_distributor block
// The bad block starts at "} else if (action === 'reject_distributor')"
// and ends just before "} else if (action === 'confirm_shipment')"

const startMarker = "    } else if (action === 'reject_distributor') {";
const endMarker = "\n    } else if (action === 'confirm_shipment') {";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1) {
  console.log('Start marker not found');
  process.exit(1);
}
if (endIdx === -1) {
  console.log('End marker not found');
  process.exit(1);
}

const goodBlock = `    } else if (action === 'reject_distributor') {
      // ── NSD từ chối tiếp nhận ──
      const reason = adminNote || 'Lý do không xác định';
      await prisma.donChuyenHang.update({
        where: { id },
        data: { trangThai: 'rejected', adminNote: \`Nhà phân phối từ chối: \${reason}\` },
      });
      await prisma.loHang.update({
        where: { id: order.loHangId },
        data: { trangThai: 'active' },
      });
      // Thông báo NSX
      await prisma.thongBao.create({
        data: {
          tieuDe: '❌ Đơn chuyển hàng bị từ chối bởi Nhà phân phối',
          noiDung: \`Nhà phân phối đã từ chối lô hàng \${order.loHang.maLo}. Lý do: \${reason}. Lô hàng đã được trả về trạng thái sẵn sàng.\`,
          loai: 'shipment',
          doanhNghiepId: order.nsxDoanhNghiepId,
          daDoc: false,
        },
      });
      // Thông báo Admin
      await prisma.thongBao.create({
        data: {
          tieuDe: '⚠️ NPP từ chối đơn — cần chỉ định NPP mới',
          noiDung: \`Nhà phân phối đã từ chối lô hàng \${order.loHang.maLo}. Lý do: \${reason}. Vui lòng chỉ định Nhà phân phối khác.\`,
          loai: 'shipment',
          roleTarget: 'admin',
          daDoc: false,
        },
      });
`;

const newContent = content.slice(0, startIdx) + goodBlock + content.slice(endIdx);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('API fixed successfully!');
console.log('Lines replaced from index', startIdx, 'to', endIdx);
