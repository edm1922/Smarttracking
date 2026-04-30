import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check for ALL UNIT QTY fields including global (batchId is null)
  const allUnitQtyFields = await prisma.customField.findMany({
    where: {
      name: 'UNIT QTY'
    },
    include: {
      batch: { select: { batchCode: true } }
    }
  });
  
  console.log('All UNIT QTY fields (including global):');
  allUnitQtyFields.forEach(f => {
    console.log(`  - ID: ${f.id}`);
    console.log(`    Batch: ${f.batch?.batchCode || 'GLOBAL (null)'}`);
    console.log(`    batchId: ${f.batchId || 'null'}`);
  });
  
  // Check for any field values with useUnitQty that are NOT associated with TELA batch
  const allUnitTrackingValues = await prisma.itemFieldValue.findMany({
    where: {
      value: {
        path: ['useUnitQty'],
        equals: true
      }
    },
    include: {
      item: { 
        select: { 
          slug: true, 
          unit: true,
          batch: { select: { batchCode: true } }
        } 
      },
      field: { select: { name: true, batchId: true } }
    }
  });
  
  console.log('\nAll items with unit tracking (useUnitQty=true):');
  console.log(`Total: ${allUnitTrackingValues.length}`);
  
  const byBatch: Record<string, number> = {};
  allUnitTrackingValues.forEach(fv => {
    const batchName = fv.item.batch?.batchCode || 'No Batch';
    byBatch[batchName] = (byBatch[batchName] || 0) + 1;
  });
  
  Object.entries(byBatch).forEach(([batch, count]) => {
    console.log(`  - ${batch}: ${count} items`);
  });
  
  // Check if COMPUTER/PERIPHERALS items have any unit tracking
  const computerItems = allUnitTrackingValues.filter(fv => 
    fv.item.batch?.batchCode === 'COMPUTER/PERIPHERALS'
  );
  console.log('\nCOMPUTER/PERIPHERALS items with unit tracking:', computerItems.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
