const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const logs = await prisma.trafficLog.findMany({
    where: { path: '/users', method: 'POST' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('--- LATEST USER CREATION ATTEMPTS ---');
  logs.forEach(l => {
    console.log(`[${l.createdAt}] ${l.method} ${l.path} - Status: ${l.statusCode} - Duration: ${l.duration}ms`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
