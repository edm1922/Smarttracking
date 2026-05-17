const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.fabricTransaction.count();
  console.log("Current FabricTransaction count:", count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
