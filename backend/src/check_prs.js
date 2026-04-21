const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPRs() {
  const prs = await prisma.purchaseRequest.findMany({
    orderBy: { prNo: 'asc' },
    select: { prNo: true }
  });
  console.log('PR Numbers:', prs.map(p => p.prNo));
}

checkPRs().finally(() => prisma.$disconnect());
