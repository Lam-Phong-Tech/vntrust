const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const d = await prisma.doanhNghiep.findMany({ select: { ten: true, loai: true, trangThai: true } });
  console.log(JSON.stringify(d, null, 2));
}
main().finally(() => prisma.$disconnect());
