import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find SAFETY SHOES batch
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'SAFETY SHOES' },
    include: { 
      customFields: true,
      items: { 
        include: { 
          fieldValues: { include: { field: true } }
        },
        take: 5
      }
    }
  });
  
  if (!batch) {
    console.log('SAFETY SHOES batch not found');
    return;
  }
  
  console.log('Batch:', batch.batchCode);
  console.log('\nCustom fields:', batch.customFields.map(f => f.name).join(', '));
  
  const sizeField = batch.customFields.find(f => f.name === 'SIZE');
  if (!sizeField) {
    console.log('SIZE field not found');
    return;
  }
  console.log('SIZE field ID:', sizeField.id);
  
  console.log('\nSample items (5):');
  batch.items.forEach(item => {
    console.log(`\n${item.slug}:`);
    item.fieldValues.forEach(fv => {
      const display = typeof fv.value === 'object' ? JSON.stringify(fv.value) : fv.value;
      console.log(`  ${fv.field.name}: ${display}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
