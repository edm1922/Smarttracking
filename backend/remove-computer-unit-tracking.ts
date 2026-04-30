import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find COMPUTER/PERIPHERALS batch
  const computerBatch = await prisma.batch.findFirst({
    where: { batchCode: 'COMPUTER/PERIPHERALS' }
  });
  
  if (!computerBatch) {
    console.log('COMPUTER/PERIPHERALS batch not found');
    return;
  }
  
  console.log('Found COMPUTER/PERIPHERALS batch:', computerBatch.id);
  
  // Find ALL field values with useUnitQty from items in this batch
  const unitTrackingValues = await prisma.itemFieldValue.findMany({
    where: {
      item: { batchId: computerBatch.id },
      value: {
        path: ['useUnitQty'],
        equals: true
      }
    },
    include: {
      item: { select: { slug: true, name: true } },
      field: { select: { name: true, batchId: true } }
    }
  });
  
  console.log(`Found ${unitTrackingValues.length} items with unit tracking in COMPUTER/PERIPHERALS`);
  
  if (unitTrackingValues.length > 0) {
    console.log('\nItems to fix:');
    unitTrackingValues.forEach(fv => {
      console.log(`  - ${fv.item.slug} (${fv.item.name}) - Field: ${fv.field.name}, field.batchId: ${fv.field.batchId || 'GLOBAL'}`);
      console.log(`    Value:`, fv.value);
    });
    
    // Delete these field values to remove them from Unit Tracking Hub
    console.log('\nRemoving these field values...');
    const deleteResult = await prisma.itemFieldValue.deleteMany({
      where: {
        id: { in: unitTrackingValues.map(fv => fv.id) }
      }
    });
    console.log(`Deleted ${deleteResult.count} field values`);
  } else {
    console.log('No items with unit tracking found in COMPUTER/PERIPHERALS');
    console.log('The issue might be in the fallback logic or caching');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
