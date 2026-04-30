import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const batches = await prisma.batch.findMany({
    select: { 
      id: true, 
      batchCode: true,
      _count: { select: { items: true, customFields: true } }
    },
    orderBy: { batchCode: 'asc' }
  });
  
  console.log('All batches:');
  batches.forEach(b => {
    console.log(`  - ${b.batchCode} (${b._count.items} items, ${b._count.customFields} fields)`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
