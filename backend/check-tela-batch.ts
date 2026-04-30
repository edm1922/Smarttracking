import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find TELA batch
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'TELA' },
    include: { 
      customFields: true, 
      items: { 
        select: { id: true, slug: true, unit: true, trackingType: true },
        take: 5
      }
    }
  });
  
  if (!batch) {
    console.log('TELA batch not found');
    return;
  }
  
  console.log('TELA Batch found:', batch.batchCode);
  console.log('Custom fields:', JSON.stringify(batch.customFields, null, 2));
  console.log('Sample items (5 of them):', JSON.stringify(batch.items, null, 2));
  console.log('Total items count:', await prisma.item.count({ where: { batchId: batch.id } }));
}

main().catch(console.error).finally(() => prisma.$disconnect());
