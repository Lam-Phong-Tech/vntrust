import { prisma } from "./src/lib/prisma";

async function main() {
  const count = await prisma.doanhNghiep.count();
  console.log("Count DoanhNghiep:", count);
}

main().catch(console.error).finally(() => process.exit(0));
