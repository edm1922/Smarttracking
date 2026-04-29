import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get TELA batch
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'TELA' },
    include: { customFields: true }
  });
  
  if (!batch) return;
  
  const yardField = batch.customFields.find(f => f.name === 'YARD');
  if (!yardField) return;
  
  // Check YARD values distribution
  const yardValues = await prisma.itemFieldValue.groupBy({
    by: ['value'],
    where: { fieldId: yardField.id },
    _count: { value: true }
  });
  
  console.log('YARD field values distribution:');
  yardValues.forEach(v => {
    console.log(`  "${v.value}": ${v._count.value} items`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
