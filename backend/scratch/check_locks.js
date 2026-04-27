const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking for active locks...');
    const locks = await prisma.$queryRaw`
      SELECT 
        pid, 
        age(clock_timestamp(), query_start)::text as age, 
        usename, 
        query, 
        state 
      FROM pg_stat_activity 
      WHERE state != 'idle' 
        AND query NOT LIKE '%pg_stat_activity%';
    `;
    console.log('ACTIVE QUERIES:', JSON.stringify(locks, null, 2));
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
