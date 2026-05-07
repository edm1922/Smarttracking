const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const triggers = await prisma.$queryRaw`
    SELECT 
        event_object_table, 
        trigger_name, 
        event_manipulation, 
        action_statement 
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth'
  `;
  console.log(triggers);
}

check().catch(console.error).finally(() => prisma.$disconnect());
