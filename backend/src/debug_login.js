const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const username = 'shinpayroll_admin';
  const logs = await prisma.trafficLog.findMany({
    where: { path: '/auth/login', method: 'POST' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`--- LOGIN ATTEMPTS FOR ${username} ---`);
  logs.forEach(l => {
    console.log(`[${l.createdAt}] Status: ${l.statusCode} - Duration: ${l.duration}ms`);
  });

  const user = await prisma.user.findUnique({ where: { username } });
  if (user) {
    console.log('\nUser found in DB:');
    console.log('ID:', user.id);
    console.log('Role:', user.role);
    console.log('Password length:', user.password.length);
    console.log('Password starts with:', user.password.substring(0, 7));
  } else {
    console.log('\nUser NOT found in DB!');
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
