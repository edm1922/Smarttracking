const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Aggressive Database Repair Script ---');
    
    // Use a single transaction to kill and repair
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- Kill blocking processes
        PERFORM pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE state != 'idle' 
          AND query LIKE '%InternalRequest%'
          AND pid != pg_backend_pid();
          
        -- Immediately repair
        ALTER TABLE "InternalRequest" ADD COLUMN IF NOT EXISTS "targetLocationId" TEXT;
        ALTER TABLE "InternalRequest" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
        ALTER TABLE "InternalRequest" ADD COLUMN IF NOT EXISTS "additionalImages" JSONB;
        
        ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "userId" TEXT;
      END $$;
    `);
    
    console.log('Successfully repaired tables!');
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
