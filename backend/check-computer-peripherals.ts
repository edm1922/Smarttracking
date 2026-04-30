import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find COMPUTER/PERIPHERALS batch
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'COMPUTER/PERIPHERALS' },
    include: { 
      customFields: true,
      items: { 
        select: { id: true, slug: true, unit: true, trackingType: true },
        take: 5
      }
    }
  });
  
  if (!batch) {
    console.log('COMPUTER/PERIPHERALS batch not found');
    return;
  }
  
  console.log('Batch found:', batch.batchCode);
  console.log('Custom fields:', JSON.stringify(batch.customFields, null, 2));
  console.log('Sample items (5 of them):', JSON.stringify(batch.items, null, 2));
  console.log('Total items count:', await prisma.item.count({ where: { batchId: batch.id } }));
  
  // Check if any items have field values with useUnitQty
  const itemsWithUnitTracking = await prisma.itemFieldValue.findMany({
    where: {
      item: { batchId: batch.id },
      value: {
        path: ['useUnitQty'],
        equals: true
      }
    },
    include: {
      item: { select: { slug: true, unit: true } },
      field: { select: { name: true } }
    },
    take: 10
  });
  
  console.log('\nItems with unit tracking enabled:', itemsWithUnitTracking.length);
  if (itemsWithUnitTracking.length > 0) {
    console.log('Sample items with unit tracking:');
    itemsWithUnitTracking.forEach(fv => {
      console.log(`  - ${fv.item.slug} (${fv.item.unit}) - Field: ${fv.field.name}, Value:`, fv.value);
    });
  } else {
    console.log('No items have unit tracking enabled via field values');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
