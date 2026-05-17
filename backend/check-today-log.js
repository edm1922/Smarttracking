const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trns = await prisma.fabricTransaction.findMany({
    where: {
      OR: [
        { transactionNo: { contains: 'T-2026-03' } },
        { remarks: { contains: 'RSQ-00390' } }
      ]
    },
    include: {
      fabric: true
    }
  });

  console.log("Found transactions:", JSON.stringify(trns, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
