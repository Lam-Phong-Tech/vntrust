const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const list = await prisma.doanhNghiep.findMany({
    where: { loai: 'NNK', trangThai: 'verified' },
    select: { id: true, ten: true, loai: true, trangThai: true, maSoThue: true }
  });
  console.log(JSON.stringify(list, null, 2));
}
main().finally(() => prisma.$disconnect());
