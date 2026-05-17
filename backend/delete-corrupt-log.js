const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== DELETING CORRUPT TRANSACTION AND FABRIC ===");

  // Delete corrupt transaction
  const delTrn = await prisma.fabricTransaction.deleteMany({
    where: {
      transactionNo: {
        startsWith: 'T-2026-03_1.2.1.25'
      }
    }
  });
  console.log(`Deleted ${delTrn.count} corrupt transactions.`);

  // Delete corrupt fabric if name is empty
  const delFabric = await prisma.fabric.deleteMany({
    where: {
      name: ''
    }
  });
  console.log(`Deleted ${delFabric.count} corrupt fabrics with empty name.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
