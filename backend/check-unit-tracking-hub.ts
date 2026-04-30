import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check all UNIT QTY fields (global and batch-specific)
  const unitQtyFields = await prisma.customField.findMany({
    where: {
      name: 'UNIT QTY'
    },
    include: {
      batch: { select: { batchCode: true } }
    }
  });
  
  console.log('All UNIT QTY fields:');
  unitQtyFields.forEach(f => {
    console.log(`  - ID: ${f.id}, Batch: ${f.batch?.batchCode || 'GLOBAL (null)'}, batchId: ${f.batchId || 'null'}`);
  });
  
  // Check if any items from COMPUTER/PERIPHERALS have UNIT QTY field values
  const computerBatch = await prisma.batch.findFirst({
    where: { batchCode: 'COMPUTER/PERIPHERALS' }
  });
  
  if (computerBatch) {
    console.log('\nChecking COMPUTER/PERIPHERALS batch items...');
    
    // Find all field values with useUnitQty from items in this batch
    const unitTrackingValues = await prisma.itemFieldValue.findMany({
      where: {
        item: { batchId: computerBatch.id },
        value: {
          path: ['useUnitQty'],
          equals: true
        }
      },
      include: {
        item: { select: { slug: true, unit: true } },
        field: { select: { name: true, batchId: true } }
      }
    });
    
    console.log(`Found ${unitTrackingValues.length} items with unit tracking in COMPUTER/PERIPHERALS`);
    unitTrackingValues.forEach(fv => {
      console.log(`  - ${fv.item.slug} (${fv.item.unit}), Field: ${fv.field.name}, Value:`, fv.value);
    });
  }
  
  // Also check the getUnitInventory query logic
  console.log('\n--- Items showing in Unit Tracking Hub ---');
  const hubItems = await prisma.item.findMany({
    where: {
      fieldValues: {
        some: {
          value: {
            path: ['useUnitQty'],
            equals: true
          }
        }
      }
    },
    include: {
      batch: { select: { batchCode: true } },
      fieldValues: {
        where: {
          value: {
            path: ['useUnitQty'],
            equals: true
          }
        },
        include: { field: true }
      }
    }
  });
  
  console.log(`Total items in Unit Tracking Hub: ${hubItems.length}`);
  const batchCounts: Record<string, number> = {};
  hubItems.forEach(item => {
    const batchName = item.batch?.batchCode || 'No Batch';
    batchCounts[batchName] = (batchCounts[batchName] || 0) + 1;
  });
  
  console.log('Items by batch:');
  Object.entries(batchCounts).forEach(([batch, count]) => {
    console.log(`  - ${batch}: ${count} items`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
