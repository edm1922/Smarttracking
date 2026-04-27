const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Database Repair Script (v3) ---');
    
    // Set a very high timeout for this session
    await prisma.$executeRawUnsafe(`SET statement_timeout = '300s';`);
    
    console.log('Fixing InternalRequest...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "InternalRequest" ADD COLUMN IF NOT EXISTS "targetLocationId" TEXT;`);
      console.log('  Added targetLocationId');
    } catch (e) { console.log('  Failed targetLocationId:', e.message); }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "InternalRequest" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;`);
      console.log('  Added attachmentUrl');
    } catch (e) { console.log('  Failed attachmentUrl:', e.message); }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "InternalRequest" ADD COLUMN IF NOT EXISTS "additionalImages" JSONB;`);
      console.log('  Added additionalImages');
    } catch (e) { console.log('  Failed additionalImages:', e.message); }

    console.log('Done!');
  } catch (error) {
    console.error('CRITICAL ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
