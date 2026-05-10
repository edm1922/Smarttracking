const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Listing all tables and their constraints in public schema...');
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';
    `);
    console.log('Tables:', JSON.stringify(tables, null, 2));

    for (const t of tables) {
      const constraints = await prisma.$queryRawUnsafe(`
        SELECT conname, pg_get_constraintdef(oid) 
        FROM pg_constraint 
        WHERE conrelid = ('"public"."' || $1 || '"')::regclass;
      `, t.tablename);
      console.log(`Constraints on ${t.tablename}:`, JSON.stringify(constraints, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
