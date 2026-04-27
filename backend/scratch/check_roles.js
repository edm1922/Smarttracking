const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const roles = await prisma.$queryRaw`SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'postgres'`;
    console.log('ROLES:', JSON.stringify(roles, null, 2));
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
