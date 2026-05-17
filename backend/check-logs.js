const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.activityLog.findMany({
    where: {
      action: { in: ['SUBMIT_CONTENT', 'CREATE_ITEM', 'UPDATE_ITEM', 'STOCK_IN'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
