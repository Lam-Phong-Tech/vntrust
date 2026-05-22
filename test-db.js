const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.canhBao.findMany({
    orderBy: { thoiGian: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(reports, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
