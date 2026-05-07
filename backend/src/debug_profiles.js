const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const profiles = await prisma.$queryRaw`SELECT * FROM public.profiles`;
    console.log('--- ALL PROFILES ---');
    console.log(profiles);
  } catch (err) {
    console.error('Failed to query profiles:', err.message);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
