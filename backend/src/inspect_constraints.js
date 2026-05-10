const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Checking constraints for User table...');
  try {
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = '"public"."User"'::regclass;
    `);
    console.log('Constraints on User:', JSON.stringify(constraints, null, 2));
    
    console.log('\nChecking constraints for profiles table...');
    const pConstraints = await prisma.$queryRawUnsafe(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = '"public"."profiles"'::regclass;
    `);
    console.log('Constraints on profiles:', JSON.stringify(pConstraints, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
