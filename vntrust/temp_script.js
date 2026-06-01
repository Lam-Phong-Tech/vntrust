
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
