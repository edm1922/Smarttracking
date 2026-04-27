const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Killing long-running processes...');
    // Kill processes running for more than 30 seconds
    const killed = await prisma.$queryRaw`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE state != 'idle' 
        AND age(clock_timestamp(), query_start) > interval '30 seconds'
        AND pid != pg_backend_pid();
    `;
    console.log('Killed:', killed);
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
