import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check ALL custom fields with batchId null (global fields)
  const globalFields = await prisma.customField.findMany({
    where: {
      batchId: null
    },
    orderBy: { name: 'asc' }
  });
  
  console.log('All GLOBAL custom fields (batchId is null):');
  globalFields.forEach(f => {
    console.log(`  - ${f.name} (${f.fieldType}) - ID: ${f.id}`);
  });
  
  // Check if any of them is UNIT QTY
  const globalUnitQty = globalFields.find(f => f.name === 'UNIT QTY');
  if (globalUnitQty) {
    console.log('\nFound GLOBAL UNIT QTY field! This might be affecting all batches.');
    console.log('Field details:', JSON.stringify(globalUnitQty, null, 2));
  } else {
    console.log('\nNo GLOBAL UNIT QTY field found.');
  }
  
  // Check the UNIT QTY field for TELA batch
  const telaUnitQty = await prisma.customField.findFirst({
    where: {
      name: 'UNIT QTY',
      batchId: { not: null }
    },
    include: { batch: true }
  });
  
  console.log('\nTELA batch UNIT QTY field:');
  if (telaUnitQty) {
    console.log(`  - ID: ${telaUnitQty.id}`);
    console.log(`  - Batch: ${telaUnitQty.batch?.batchCode}`);
    console.log(`  - batchId: ${telaUnitQty.batchId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
